let cloud = null;

try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (error) {
  cloud = null;
}

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

function normalizeStaff(user) {
  const staffId = user.staffId || user.id || user._id || '';
  return {
    id: staffId,
    userId: user._id || user.userId || '',
    openid: user.openid || '',
    role: user.role,
    staffId,
    name: user.name || '',
    phone: user.phone || '',
    title: user.title || (user.role === 'owner' ? '店长' : '店员'),
    active: user.active !== false,
  };
}

function validateStaff(staff = {}) {
  if (!staff.name || !staff.name.trim()) throw new Error('请输入员工姓名');
  if (!staff.phone || !staff.phone.trim()) throw new Error('请输入员工手机号');
  if (!staff.title || !staff.title.trim()) throw new Error('请输入员工岗位');
}

async function assertOwner(db, openid) {
  if (!db || !openid) throw new Error('无法识别微信用户');
  const result = await db.collection('users').where({ openid }).limit(1).get();
  const user = result && result.data && result.data[0];
  if (!user || user.role !== 'owner') throw new Error('只有店长可以维护员工');
  return user;
}

async function readByRole(db, role) {
  const result = await db.collection('users').where({ role }).orderBy('staffId', 'asc').get();
  return result.data || [];
}

async function listStaffMembers(db) {
  const owners = await readByRole(db, 'owner');
  const staff = await readByRole(db, 'staff');
  return owners.concat(staff)
    .map(normalizeStaff)
    .sort((left, right) => String(left.staffId).localeCompare(String(right.staffId)));
}

function nextStaffId(staffMembers) {
  const max = staffMembers.reduce((value, staff) => {
    const number = Number(String(staff.staffId || staff.id || '').replace(/^s/, ''));
    return Number.isFinite(number) ? Math.max(value, number) : value;
  }, 1001);
  return `s${max + 1}`;
}

async function findStaffUser(db, staffId) {
  const result = await db.collection('users').where({ staffId }).limit(1).get();
  const user = result && result.data && result.data[0];
  if (!user) throw new Error('员工不存在');
  return user;
}

async function main(event = {}, context = {}) {
  const db = getDatabase(context);
  const openid = await getOpenid(context);
  await assertOwner(db, openid);

  const action = event.action || 'list';
  if (action === 'list') {
    return { staffMembers: await listStaffMembers(db) };
  }

  if (action === 'create') {
    validateStaff(event.staff);
    const staffMembers = await listStaffMembers(db);
    const createdAt = nowText(context);
    const data = {
      openid: '',
      role: 'staff',
      memberId: '',
      staffId: nextStaffId(staffMembers),
      name: event.staff.name.trim(),
      phone: event.staff.phone.trim(),
      title: event.staff.title.trim(),
      active: true,
      createdAt,
      updatedAt: createdAt,
    };
    const result = await db.collection('users').add({ data });
    return { ok: true, staff: normalizeStaff({ ...data, _id: result._id }) };
  }

  if (action === 'update') {
    if (!event.staffId) throw new Error('员工不存在');
    const user = await findStaffUser(db, event.staffId);
    if (user.role === 'owner') throw new Error('店长账号不能在这里修改');
    validateStaff(event.staff);
    const data = {
      name: event.staff.name.trim(),
      phone: event.staff.phone.trim(),
      title: event.staff.title.trim(),
      active: event.staff.active !== false,
      updatedAt: nowText(context),
    };
    await db.collection('users').doc(user._id).update({ data });
    return { ok: true, staff: normalizeStaff({ ...user, ...data }) };
  }

  if (action === 'disable') {
    if (!event.staffId) throw new Error('员工不存在');
    const user = await findStaffUser(db, event.staffId);
    if (user.role === 'owner') throw new Error('店长账号不能停用');
    await db.collection('users').doc(user._id).update({
      data: {
        active: false,
        updatedAt: nowText(context),
      },
    });
    return { ok: true };
  }

  throw new Error('未知员工操作');
}

exports.main = main;
