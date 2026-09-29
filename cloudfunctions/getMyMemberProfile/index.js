let cloud = null;

try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (error) {
  cloud = null;
}

const fallbackLevel = {
  _id: 'normal',
  name: '普通',
  rank: 1,
  minPoints: 0,
  maxPoints: 1,
  color: '#9a8f87',
  note: '普通顾客，可查看会员餐食',
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

function toNumber(value, fallback = 0) {
  const number = Number(String(value === undefined || value === null ? '' : value).replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : fallback;
}

function normalizeMember(member) {
  return {
    id: member._id || member.id || '',
    openid: member.openid || '',
    memberCardNo: member.memberCardNo || '',
    nickname: member.nickname || member.name || '',
    phone: member.phone || '',
    levelId: member.levelId || 'normal',
    totalPoints: toNumber(member.totalPoints),
    availablePoints: toNumber(member.availablePoints),
    balance: toNumber(member.balance),
    active: member.active !== false,
  };
}

function normalizeLevel(level) {
  const source = level || fallbackLevel;
  return {
    id: source._id || source.id || 'normal',
    name: source.name || fallbackLevel.name,
    rank: source.rank || fallbackLevel.rank,
    minPoints: toNumber(source.minPoints),
    maxPoints: toNumber(source.maxPoints),
    color: source.color || fallbackLevel.color,
    note: source.note || fallbackLevel.note,
  };
}

async function getMember(db, openid) {
  const result = await db.collection('members').where({ openid, active: true }).limit(1).get();
  return result && result.data && result.data[0] ? result.data[0] : null;
}

async function getLevel(db, levelId) {
  try {
    const result = await db.collection('memberLevels').doc(levelId).get();
    return result && result.data ? result.data : fallbackLevel;
  } catch (error) {
    return fallbackLevel;
  }
}

async function main(event = {}, context = {}) {
  const db = getDatabase(context);
  const openid = await getOpenid(context);
  if (!db || !openid) {
    throw new Error('无法识别会员身份');
  }

  const member = await getMember(db, openid);
  if (!member) {
    throw new Error('未找到会员资料');
  }
  const level = await getLevel(db, member.levelId || 'normal');

  return {
    member: normalizeMember(member),
    level: normalizeLevel(level),
  };
}

exports.main = main;
