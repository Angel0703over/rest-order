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
  if (!user || user.role !== 'owner') throw new Error('只有店长可以维护餐食');
  return user;
}

function normalizeId(item) {
  return { ...item, id: item.id || item._id };
}

function nowText(context) {
  const now = context && typeof context.now === 'function' ? context.now() : new Date();
  return now.toLocaleString('zh-CN', { hour12: false });
}

async function readEnabled(db, name, sortField) {
  const result = await db.collection(name).where({ enabled: true }).orderBy(sortField, 'asc').get();
  return (result.data || []).map(normalizeId);
}

function assertValidMeal(meal = {}, categories, levels) {
  if (!meal.name || !meal.name.trim()) throw new Error('请输入餐食名称');
  if (!meal.categoryId || !categories.some((item) => item.id === meal.categoryId)) throw new Error('请选择有效的餐食分类');
  if (!meal.desc || !meal.desc.trim()) throw new Error('请输入餐食描述');
  if (!meal.image || !meal.image.trim()) throw new Error('请输入餐食图片路径');
  if (!levels.some((item) => item.id === meal.requiredLevel)) throw new Error('请选择有效的适用会员等级');
}

async function listPayload(db) {
  const meals = await readEnabled(db, 'meals', 'sort');
  const categories = await readEnabled(db, 'categories', 'sort');
  const memberLevels = await readEnabled(db, 'memberLevels', 'rank');
  return { meals, categories, memberLevels };
}

async function main(event = {}, context = {}) {
  const db = getDatabase(context);
  const openid = await getOpenid(context);
  await assertOwner(db, openid);

  const action = event.action || 'list';
  if (action === 'list') {
    return listPayload(db);
  }

  if (action === 'update') {
    if (!event.mealId) throw new Error('餐食不存在');
    const { categories, memberLevels } = await listPayload(db);
    assertValidMeal(event.meal, categories, memberLevels);
    const data = {
      name: event.meal.name.trim(),
      categoryId: event.meal.categoryId,
      desc: event.meal.desc.trim(),
      image: event.meal.image.trim(),
      requiredLevel: event.meal.requiredLevel,
      availableToday: event.meal.availableToday !== false,
      updatedAt: nowText(context),
    };
    await db.collection('meals').doc(event.mealId).update({ data });
    return { ok: true, meal: normalizeId({ ...data, _id: event.mealId }) };
  }

  if (action === 'toggleAvailability') {
    if (!event.mealId) throw new Error('餐食不存在');
    await db.collection('meals').doc(event.mealId).update({
      data: {
        availableToday: event.availableToday === true,
        updatedAt: nowText(context),
      },
    });
    return { ok: true };
  }

  throw new Error('未知餐食操作');
}

exports.main = main;
