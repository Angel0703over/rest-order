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

async function assertOwner(db, openid) {
  if (!db || !openid) throw new Error('无法识别微信用户');
  const result = await db.collection('users').where({ openid }).limit(1).get();
  const user = result && result.data && result.data[0];
  if (!user || user.role !== 'owner') throw new Error('只有店长可以维护会员');
  return user;
}

function normalizeLevel(level) {
  return { ...level, id: level.id || level._id };
}

function normalizeMember(member, levels = []) {
  const levelId = member.levelId || 'basic';
  const level = levels.find((item) => item.id === levelId);
  return {
    id: member.id || member._id || '',
    openid: member.openid || '',
    nickname: member.nickname || member.name || '',
    phone: member.phone || '',
    levelId,
    levelName: level ? level.name : '',
    active: member.active !== false,
    createdAt: member.createdAt || '',
    updatedAt: member.updatedAt || '',
  };
}

async function listLevels(db) {
  const result = await db.collection('memberLevels').where({ enabled: true }).orderBy('rank', 'asc').get();
  return (result.data || []).map(normalizeLevel);
}

async function listMembers(db, levels) {
  const result = await db.collection('members').where({}).orderBy('createdAt', 'desc').get();
  return (result.data || []).map((member) => normalizeMember(member, levels));
}

function assertValidMember(member = {}, levels) {
  if (!member.nickname || !member.nickname.trim()) throw new Error('请输入会员姓名');
  if (!member.phone || !member.phone.trim()) throw new Error('请输入会员手机号');
  if (!levels.some((level) => level.id === member.levelId)) throw new Error('请选择有效会员等级');
}

async function main(event = {}, context = {}) {
  const db = getDatabase(context);
  const openid = await getOpenid(context);
  await assertOwner(db, openid);

  const action = event.action || 'list';
  const memberLevels = await listLevels(db);

  if (action === 'list') {
    return { members: await listMembers(db, memberLevels), memberLevels };
  }

  if (action === 'create') {
    assertValidMember(event.member, memberLevels);
    const createdAt = nowText(context);
    const data = {
      openid: String(event.member.openid || '').trim(),
      nickname: event.member.nickname.trim(),
      phone: event.member.phone.trim(),
      levelId: event.member.levelId,
      active: event.member.active !== false,
      createdAt,
      updatedAt: createdAt,
    };
    const result = await db.collection('members').add({ data });
    return { ok: true, member: normalizeMember({ ...data, _id: result._id }, memberLevels) };
  }

  if (action === 'update') {
    if (!event.memberId) throw new Error('会员不存在');
    assertValidMember(event.member, memberLevels);
    const data = {
      openid: String(event.member.openid || '').trim(),
      nickname: event.member.nickname.trim(),
      phone: event.member.phone.trim(),
      levelId: event.member.levelId,
      active: event.member.active !== false,
      updatedAt: nowText(context),
    };
    await db.collection('members').doc(event.memberId).update({ data });
    return { ok: true, member: normalizeMember({ ...data, _id: event.memberId }, memberLevels) };
  }

  if (action === 'disable') {
    if (!event.memberId) throw new Error('会员不存在');
    await db.collection('members').doc(event.memberId).update({
      data: {
        active: false,
        updatedAt: nowText(context),
      },
    });
    return { ok: true };
  }

  throw new Error('未知会员操作');
}

exports.main = main;
