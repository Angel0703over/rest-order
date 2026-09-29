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

function toNumber(value, fallback = 0) {
  const number = Number(String(value === undefined || value === null ? '' : value).replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : fallback;
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

function matchMemberLevelByPoints(totalPoints, levels = []) {
  const points = toNumber(totalPoints);
  const sorted = [...levels].sort((a, b) => (a.rank || 0) - (b.rank || 0));
  const matched = sorted.find((level) => {
    const min = toNumber(level.minPoints, Number.NEGATIVE_INFINITY);
    const max = toNumber(level.maxPoints, Number.POSITIVE_INFINITY);
    return points >= min && points <= max;
  });
  return matched || sorted[sorted.length - 1] || null;
}

function resolveLevelId(member = {}, levels = []) {
  if (member.totalPoints !== undefined && member.totalPoints !== '') {
    const level = matchMemberLevelByPoints(member.totalPoints, levels);
    return level ? level.id : '';
  }
  return member.levelId || 'normal';
}

function normalizeMember(member, levels = []) {
  const levelId = resolveLevelId(member, levels);
  const level = levels.find((item) => item.id === levelId);
  return {
    id: member.id || member._id || '',
    openid: member.openid || '',
    memberCardNo: member.memberCardNo || '',
    nickname: member.nickname || member.name || '',
    tag: member.tag || '',
    phone: member.phone || '',
    birthday: member.birthday || '',
    title: member.title || '',
    levelId,
    levelName: level ? level.name : (member.levelName || ''),
    sourceLevelName: member.sourceLevelName || '',
    groupName: member.groupName || '',
    qq: member.qq || '',
    wechat: member.wechat || '',
    email: member.email || '',
    address: member.address || '',
    preference: member.preference || '',
    balance: toNumber(member.balance),
    remark: member.remark || '',
    totalSpent: toNumber(member.totalSpent),
    availablePoints: toNumber(member.availablePoints),
    totalPoints: toNumber(member.totalPoints),
    usedPoints: toNumber(member.usedPoints),
    expiresAt: member.expiresAt || '',
    packageItems: member.packageItems || '',
    storeName: member.storeName || '',
    lastConsumeAt: member.lastConsumeAt || '',
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

function assertValidMember(member = {}, levels = []) {
  if (!member.nickname || !member.nickname.trim()) throw new Error('请输入会员姓名');
  if (!member.phone || !member.phone.trim()) throw new Error('请输入会员手机号');
  const levelId = resolveLevelId(member, levels);
  if (!levels.some((level) => level.id === levelId)) throw new Error('请选择有效会员等级');
}

function editableMemberData(member = {}, levels = [], timestamp = '') {
  const normalized = normalizeMember(member, levels);
  return {
    openid: String(normalized.openid || '').trim(),
    memberCardNo: String(normalized.memberCardNo || '').trim(),
    nickname: String(normalized.nickname || '').trim(),
    tag: String(normalized.tag || '').trim(),
    phone: String(normalized.phone || '').trim(),
    birthday: String(normalized.birthday || '').trim(),
    title: String(normalized.title || '').trim(),
    levelId: normalized.levelId,
    sourceLevelName: String(normalized.sourceLevelName || '').trim(),
    groupName: String(normalized.groupName || '').trim(),
    qq: String(normalized.qq || '').trim(),
    wechat: String(normalized.wechat || '').trim(),
    email: String(normalized.email || '').trim(),
    address: String(normalized.address || '').trim(),
    preference: String(normalized.preference || '').trim(),
    balance: normalized.balance,
    remark: String(normalized.remark || '').trim(),
    totalSpent: normalized.totalSpent,
    availablePoints: normalized.availablePoints,
    totalPoints: normalized.totalPoints,
    usedPoints: normalized.usedPoints,
    expiresAt: String(normalized.expiresAt || '').trim(),
    packageItems: String(normalized.packageItems || '').trim(),
    storeName: String(normalized.storeName || '').trim(),
    lastConsumeAt: String(normalized.lastConsumeAt || '').trim(),
    active: normalized.active,
    updatedAt: timestamp,
  };
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
      ...editableMemberData(event.member, memberLevels, createdAt),
      createdAt,
    };
    const result = await db.collection('members').add({ data });
    return { ok: true, member: normalizeMember({ ...data, _id: result._id }, memberLevels) };
  }

  if (action === 'update') {
    if (!event.memberId) throw new Error('会员不存在');
    assertValidMember(event.member, memberLevels);
    const data = editableMemberData(event.member, memberLevels, nowText(context));
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
