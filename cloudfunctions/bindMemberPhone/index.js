let cloud = null;

try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (error) {
  cloud = null;
}

const CUSTOMER_ENTRY_PAGE = '/pages/index/index';

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

  const members = await findMemberByPhone(db, phone);
  if (!members.length) {
    throw new Error('未找到该手机号对应的会员，请联系店员确认');
  }
  if (members.length > 1) {
    throw new Error('该手机号存在多个会员，请联系店员处理');
  }

  const member = members[0];
  if (member.openid && member.openid !== openid) {
    throw new Error('该手机号已绑定其他微信，请联系店长处理');
  }

  const timestamp = nowText(context);
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
    user: sanitizeUser(user),
    member: {
      id: member._id || member.id || '',
      nickname: member.nickname || member.name || '',
      phone: member.phone || phone,
      levelId: member.levelId || 'normal',
    },
    entryPage: CUSTOMER_ENTRY_PAGE,
    bindingRequired: false,
  };
}

exports.main = main;
exports._private = {
  normalizePhone,
  sanitizeMemberAsUser,
};
