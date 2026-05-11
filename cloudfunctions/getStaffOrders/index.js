let cloud = null;

try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (error) {
  cloud = null;
}

function getDatabase(context) {
  if (context && Object.prototype.hasOwnProperty.call(context, 'db')) {
    return context.db;
  }
  if (cloud && cloud.database) {
    return cloud.database();
  }
  return null;
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

async function getUser(db, openid) {
  const result = await db.collection('users').where({ openid }).limit(1).get();
  return result && result.data && result.data.length ? result.data[0] : null;
}

function normalizeOrder(order) {
  return {
    ...order,
    id: order.id || order._id,
  };
}

function toDateKey(date) {
  const value = date instanceof Date ? date : new Date(date);
  return `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}`;
}

function filterToday(orders, now) {
  const todayKey = toDateKey(now);
  return orders.filter((order) => toDateKey(order.createdAt) === todayKey);
}

function getNow(context) {
  return context && typeof context.now === 'function' ? context.now() : new Date();
}

async function main(event = {}, context = {}) {
  const db = getDatabase(context);
  const openid = await getOpenid(context);
  if (!db) {
    return { orders: [] };
  }
  if (!openid) {
    throw new Error('无法识别微信用户');
  }
  const user = await getUser(db, openid);
  if (!user || !['owner', 'staff'].includes(user.role)) {
    throw new Error('当前身份不能查看工作台订单');
  }

  const result = await db.collection('orders').where({}).orderBy('createdAt', 'desc').get();
  return {
    orders: filterToday((result.data || []).map(normalizeOrder), getNow(context)),
  };
}

exports.main = main;
