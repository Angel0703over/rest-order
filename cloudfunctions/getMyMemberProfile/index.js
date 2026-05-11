let cloud = null;

try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (error) {
  cloud = null;
}

const fallbackLevel = {
  _id: 'basic',
  name: '基础会员',
  rank: 1,
  color: '#6f7f8f',
  note: '可享轻食与基础饮品',
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

function normalizeMember(member) {
  return {
    id: member._id || member.id || '',
    openid: member.openid || '',
    nickname: member.nickname || member.name || '',
    phone: member.phone || '',
    levelId: member.levelId || 'basic',
    active: member.active !== false,
  };
}

function normalizeLevel(level) {
  const source = level || fallbackLevel;
  return {
    id: source._id || source.id || 'basic',
    name: source.name || fallbackLevel.name,
    rank: source.rank || fallbackLevel.rank,
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
  const level = await getLevel(db, member.levelId || 'basic');

  return {
    member: normalizeMember(member),
    level: normalizeLevel(level),
  };
}

exports.main = main;
