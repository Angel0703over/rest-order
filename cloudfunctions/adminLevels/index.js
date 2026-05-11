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

async function assertOwner(db, openid) {
  if (!db || !openid) throw new Error('无法识别微信用户');
  const result = await db.collection('users').where({ openid }).limit(1).get();
  const user = result && result.data && result.data[0];
  if (!user || user.role !== 'owner') {
    throw new Error('只有店长可以维护会员等级');
  }
  return user;
}

function normalizeLevel(level) {
  return {
    ...level,
    id: level.id || level._id,
  };
}

function nowText(context) {
  const now = context && typeof context.now === 'function' ? context.now() : new Date();
  return now.toLocaleString('zh-CN', { hour12: false });
}

function assertValidLevel(level = {}) {
  if (!level.name || !level.name.trim()) {
    throw new Error('请输入会员等级名称');
  }
  if (!level.note || !level.note.trim()) {
    throw new Error('请输入会员权益说明');
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(level.color || '')) {
    throw new Error('请输入正确的颜色值');
  }
}

async function listLevels(db) {
  const result = await db.collection('memberLevels').where({ enabled: true }).orderBy('rank', 'asc').get();
  return (result.data || []).map(normalizeLevel);
}

async function main(event = {}, context = {}) {
  const db = getDatabase(context);
  const openid = await getOpenid(context);
  await assertOwner(db, openid);

  const action = event.action || 'list';
  if (action === 'list') {
    return { levels: await listLevels(db) };
  }

  if (action === 'update') {
    if (!event.levelId) throw new Error('会员等级不存在');
    assertValidLevel(event.level);
    const data = {
      name: event.level.name.trim(),
      note: event.level.note.trim(),
      color: event.level.color.trim(),
      updatedAt: nowText(context),
    };
    await db.collection('memberLevels').doc(event.levelId).update({ data });
    return { ok: true, level: normalizeLevel({ ...data, _id: event.levelId }) };
  }

  throw new Error('未知会员等级操作');
}

exports.main = main;
