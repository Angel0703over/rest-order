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
    throw new Error('只有店长可以维护分类');
  }
  return user;
}

function normalizeCategory(category) {
  return {
    ...category,
    id: category.id || category._id,
  };
}

function nowText(context) {
  const now = context && typeof context.now === 'function' ? context.now() : new Date();
  return now.toLocaleString('zh-CN', { hour12: false });
}

function assertValidCategory(category = {}) {
  if (!category.name || !category.name.trim()) {
    throw new Error('请输入分类名称');
  }
}

async function listCategories(db) {
  const result = await db.collection('categories').where({ enabled: true }).orderBy('sort', 'asc').get();
  return (result.data || []).map(normalizeCategory);
}

async function main(event = {}, context = {}) {
  const db = getDatabase(context);
  const openid = await getOpenid(context);
  await assertOwner(db, openid);

  const action = event.action || 'list';
  if (action === 'list') {
    return { categories: await listCategories(db) };
  }

  if (action === 'create') {
    assertValidCategory(event.category);
    const data = {
      name: event.category.name.trim(),
      sort: Number(event.category.sort || 999),
      enabled: true,
      createdAt: nowText(context),
      updatedAt: nowText(context),
    };
    const result = await db.collection('categories').add({ data });
    return { ok: true, category: normalizeCategory({ ...data, _id: result._id || result.id }) };
  }

  if (action === 'update') {
    if (!event.categoryId) throw new Error('分类不存在');
    assertValidCategory(event.category);
    const data = {
      name: event.category.name.trim(),
      sort: Number(event.category.sort || 999),
      updatedAt: nowText(context),
    };
    await db.collection('categories').doc(event.categoryId).update({ data });
    return { ok: true, category: normalizeCategory({ ...data, _id: event.categoryId }) };
  }

  if (action === 'delete') {
    if (!event.categoryId) throw new Error('分类不存在');
    await db.collection('categories').doc(event.categoryId).update({
      data: { enabled: false, updatedAt: nowText(context) },
    });
    return { ok: true };
  }

  throw new Error('未知分类操作');
}

exports.main = main;
