let cloud = null;

try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (error) {
  cloud = null;
}

const { meals: fallbackMeals, memberLevels: fallbackMemberLevels } = require('./seedData');
const DEV_ALLOW_STAFF_CUSTOMER_ORDER = true;

function getDatabase(context) {
  if (context && Object.prototype.hasOwnProperty.call(context, 'db')) {
    return context.db;
  }
  if (cloud && cloud.database) {
    return cloud.database();
  }
  return null;
}

function normalizeId(item) {
  return {
    ...item,
    id: item.id || item._id,
  };
}

async function getOpenid(context) {
  if (context && context.OPENID) {
    return context.OPENID;
  }
  if (cloud && cloud.getWXContext) {
    return cloud.getWXContext().OPENID;
  }
  return '';
}

async function readEnabledCollection(db, name, fallback) {
  if (!db) {
    return fallback.map(normalizeId);
  }
  try {
    const result = await db.collection(name).where({ enabled: true }).get();
    const data = result && result.data ? result.data : [];
    return data.length ? data.map(normalizeId) : fallback.map(normalizeId);
  } catch (error) {
    return fallback.map(normalizeId);
  }
}

async function getUser(db, openid) {
  if (!db || !openid) {
    return null;
  }
  try {
    const result = await db.collection('users').where({ openid }).limit(1).get();
    return result && result.data && result.data.length ? result.data[0] : null;
  } catch (error) {
    return null;
  }
}

async function getStoreSettings(db) {
  if (!db) {
    return null;
  }
  try {
    const result = await db.collection('settings').doc('store').get();
    return result && result.data ? result.data : null;
  } catch (error) {
    return null;
  }
}

function assertStoreAllowsOrder(settings, location) {
  if (!settings) {
    return;
  }
  if (settings.isOpen === false) {
    throw new Error('门店已暂停点单');
  }
  if (!Array.isArray(settings.locations) || !settings.locations.length) {
    return;
  }
  const room = settings.locations.find((item) => (
    (item.id || item._id) === location.roomId && item.enabled !== false
  ));
  const table = room && Array.isArray(room.tables)
    ? room.tables.find((item) => (item.id || item._id) === location.tableId && item.enabled !== false)
    : null;
  if (!room || !table) {
    throw new Error('请选择有效的房间和桌号');
  }
}

function canOrderMeal(memberLevelId, meal, levels) {
  const memberLevel = levels.find((level) => level.id === memberLevelId);
  const requiredLevel = levels.find((level) => level.id === meal.requiredLevel);
  return Boolean(memberLevel && requiredLevel && memberLevel.rank >= requiredLevel.rank);
}

function assertValidPayload(event) {
  if (!event.member || !event.member.id || !event.member.levelId) {
    throw new Error('会员信息不完整');
  }
  if (!Array.isArray(event.mealIds) || event.mealIds.length === 0) {
    throw new Error('请选择可点餐食');
  }
  if (!event.location || !event.location.roomId || !event.location.tableId) {
    throw new Error('请选择房间和桌号');
  }
}

function getNow(context) {
  if (context && typeof context.now === 'function') {
    return context.now();
  }
  return new Date();
}

function toOrderResponse(order, id) {
  return {
    ...order,
    id,
  };
}

async function main(event = {}, context = {}) {
  assertValidPayload(event);

  const db = getDatabase(context);
  const openid = await getOpenid(context);
  if (!openid) {
    throw new Error('无法识别微信用户');
  }

  const user = await getUser(db, openid);
  const devMode = Boolean(event.devForceCustomerOrder && DEV_ALLOW_STAFF_CUSTOMER_ORDER);
  if (user && user.role && user.role !== 'customer' && !devMode) {
    throw new Error('当前身份不能提交顾客订单');
  }
  if (user && user.memberId && user.memberId !== event.member.id) {
    throw new Error('会员身份不匹配');
  }

  const storeSettings = await getStoreSettings(db);
  assertStoreAllowsOrder(storeSettings, event.location);

  const memberLevels = await readEnabledCollection(db, 'memberLevels', fallbackMemberLevels);
  const meals = await readEnabledCollection(db, 'meals', fallbackMeals);
  const selectedMeals = event.mealIds.map((mealId) => meals.find((meal) => meal.id === mealId));

  if (selectedMeals.some((meal) => !meal)) {
    throw new Error('餐食不存在');
  }
  if (selectedMeals.some((meal) => meal.availableToday === false || meal.enabled === false)) {
    throw new Error('餐食已下架');
  }
  if (selectedMeals.some((meal) => !canOrderMeal(event.member.levelId, meal, memberLevels))) {
    throw new Error('当前会员等级暂不能点部分餐食');
  }

  const memberLevel = memberLevels.find((level) => level.id === event.member.levelId);
  const createdAt = getNow(context).toLocaleString('zh-CN', { hour12: false });
  const orderData = {
    openid,
    userId: user ? user._id || user.id || '' : '',
    memberId: event.member.id,
    memberName: event.member.nickname || event.member.name || '',
    memberPhone: event.member.phone || '',
    memberLevelId: event.member.levelId,
    memberLevelName: memberLevel ? memberLevel.name : '',
    mealIds: selectedMeals.map((meal) => meal.id),
    mealNames: selectedMeals.map((meal) => meal.name),
    mealName: selectedMeals.map((meal) => meal.name).join('、'),
    location: {
      roomId: event.location.roomId,
      roomName: event.location.roomName || '',
      tableId: event.location.tableId,
      tableName: event.location.tableName || '',
    },
    locationText: `${event.location.roomName || event.location.roomId} - ${event.location.tableName || event.location.tableId}`,
    status: '已提交',
    createdAt,
    updatedAt: createdAt,
    handledBy: '',
    devMode,
  };

  let orderId = `O${Date.now()}`;
  if (db) {
    const result = await db.collection('orders').add({ data: orderData });
    orderId = result._id || result.id || orderId;
  }

  return {
    ok: true,
    order: toOrderResponse(orderData, orderId),
  };
}

exports.main = main;
