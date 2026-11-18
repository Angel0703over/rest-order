let cloud = null;

try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (error) {
  cloud = null;
}

/**
 * 按手机号绑定当前微信身份。
 * 优先匹配内部员工（users 中 role 非 customer），其次匹配会员（members）。
 * 员工的微信绑定此前没有任何入口，导致店长新建的员工无法登录员工端。
 */
const CUSTOMER_ENTRY_PAGE = '/pages/index/index';
const STAFF_ENTRY_PAGE = '/pages/staff/home/index';
const ADMIN_ENTRY_PAGE = '/pages/admin/home/index';

const rolePermissions = {
  owner: ['settings.manage', 'staff.manage', 'menu.manage', 'member.manage', 'meal.manage', 'orders.update'],
  staff: ['menu.manage', 'meal.manage', 'orders.update'],
  customer: [],
};

function getDatabase(context) {
  if (context && Object.prototype.hasOwnProperty.call(context, 'db')) return context.db;
  if (cloud && cloud.database) return cloud.database();
  return null;
}

async function getOpenid(context) {
  if (context && context.OPENID) return context.OPENID;
  if (cloud && cloud.getWXContext) return cloud.getWXContext().OPENID;
  return '';
}

function nowText(context) {
  const now = context && typeof context.now === 'function' ? context.now() : new Date();
  return now.toLocaleString('zh-CN', { hour12: false });
}

function normalizePhone(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

function getPermissions(role) {
  return rolePermissions[role] || [];
}

function sanitizeUser(user) {
  return {
    id: user.id || user._id || '',
    role: user.role || 'customer',
    memberId: user.memberId || '',
    staffId: user.staffId || '',
    name: user.name || '',
  };
}

function sanitizeMemberAsUser(member) {
  return {
    id: member._id || member.id || '',
    role: 'customer',
    memberId: member._id || member.id || '',
    staffId: '',
    name: member.nickname || member.name || '',
  };
}

async function getPhoneInfo(event, context) {
  if (context && context.phoneInfo) {
    return context.phoneInfo;
  }
  if (!event.code) {
    throw new Error('请先授权手机号');
  }
  if (!cloud || !cloud.openapi || !cloud.openapi.phonenumber) {
    throw new Error('当前环境无法获取手机号');
  }
  const result = await cloud.openapi.phonenumber.getPhoneNumber({ code: event.code });
  return result && result.phoneInfo ? result.phoneInfo : null;
}

async function findMemberByPhone(db, phone) {
  const result = await db.collection('members').where({ phone, active: true }).limit(2).get();
  return result && result.data ? result.data : [];
}

async function findStaffByIdentityPhone(db, phone) {
  const result = await db.collection('users').where({ phone }).limit(3).get();
  const list = (result && result.data) || [];
  return list.filter((item) => item && item.role && item.role !== 'customer');
}

async function upsertCustomerUser(db, openid, member, timestamp) {
  const userData = {
    openid,
    role: 'customer',
    name: member.nickname || member.name || '',
    memberId: member._id || member.id || '',
    staffId: '',
    updatedAt: timestamp,
  };
  const result = await db.collection('users').where({ openid }).limit(1).get();
  const existing = result && result.data && result.data[0];
  if (existing) {
    await db.collection('users').doc(existing._id || existing.id).update({ data: userData });
    return { ...existing, ...userData };
  }
  const created = await db.collection('users').add({
    data: {
      ...userData,
      createdAt: timestamp,
    },
  });
  return { ...userData, _id: created._id };
}

async function bindStaffUser(db, staff, openid, phone, timestamp) {
  if (staff.active === false) {
    throw new Error('该员工账号已停用，请联系店长');
  }
  if (staff.openid && staff.openid !== openid) {
    throw new Error('该手机号已绑定其他微信，请联系店长处理');
  }

  await db.collection('users').doc(staff._id || staff.id).update({
    data: { openid, updatedAt: timestamp },
  });

  const entryPage = staff.role === 'owner' ? ADMIN_ENTRY_PAGE : STAFF_ENTRY_PAGE;

  return {
    ok: true,
    phone,
    identity: 'staff',
    user: sanitizeUser({ ...staff, openid }),
    staff: {
      id: staff._id || staff.id || '',
      name: staff.name || '',
      staffId: staff.staffId || '',
      role: staff.role || 'staff',
      phone: staff.phone || phone,
      title: staff.title || '',
    },
    entryPage,
    permissions: getPermissions(staff.role),
    bindingRequired: false,
  };
}

async function bindCustomerUser(db, members, openid, phone, timestamp) {
  if (members.length > 1) {
    throw new Error('该手机号存在多个会员，请联系店员处理');
  }

  const member = members[0];
  if (member.openid && member.openid !== openid) {
    throw new Error('该手机号已绑定其他微信，请联系店长处理');
  }

  await db.collection('members').doc(member._id || member.id).update({
    data: {
      openid,
      updatedAt: timestamp,
    },
  });
  const user = await upsertCustomerUser(db, openid, member, timestamp);

  return {
    ok: true,
    phone,
    identity: 'customer',
    user: sanitizeUser(user),
    member: {
      id: member._id || member.id || '',
      nickname: member.nickname || member.name || '',
      phone: member.phone || phone,
      levelId: member.levelId || 'normal',
    },
    entryPage: CUSTOMER_ENTRY_PAGE,
    permissions: getPermissions('customer'),
    bindingRequired: false,
  };
}

async function main(event = {}, context = {}) {
  const db = getDatabase(context);
  const openid = await getOpenid(context);
  if (!db || !openid) {
    throw new Error('无法识别微信用户');
  }

  const phoneInfo = await getPhoneInfo(event, context);
  const phone = normalizePhone(phoneInfo && (phoneInfo.phoneNumber || phoneInfo.purePhoneNumber));
  if (!phone) {
    throw new Error('未获取到手机号');
  }

  const timestamp = nowText(context);

  const staffCandidates = await findStaffByIdentityPhone(db, phone);
  if (staffCandidates.length > 1) {
    throw new Error('该手机号对应多个员工账号，请联系店长处理');
  }
  if (staffCandidates.length === 1) {
    return bindStaffUser(db, staffCandidates[0], openid, phone, timestamp);
  }

  const members = await findMemberByPhone(db, phone);
  if (!members.length) {
    throw new Error('未找到该手机号对应的会员或员工，请联系店长确认');
  }

  return bindCustomerUser(db, members, openid, phone, timestamp);
}

exports.main = main;
exports._private = {
  normalizePhone,
  sanitizeMemberAsUser,
  findStaffByIdentityPhone,
};
