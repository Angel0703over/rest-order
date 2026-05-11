let cloud = null;

try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (error) {
  cloud = null;
}

const ORDER_STATUS_OPTIONS = ['已提交', '制作中', '已完成', '已取消'];

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

function getNow(context) {
  return context && typeof context.now === 'function' ? context.now() : new Date();
}

async function main(event = {}, context = {}) {
  const db = getDatabase(context);
  const openid = await getOpenid(context);
  if (!db) {
    throw new Error('数据库不可用');
  }
  if (!openid) {
    throw new Error('无法识别微信用户');
  }
  if (!event.orderId) {
    throw new Error('订单不存在');
  }
  if (!ORDER_STATUS_OPTIONS.includes(event.status)) {
    throw new Error('请选择有效订单状态');
  }

  const user = await getUser(db, openid);
  if (!user || !['owner', 'staff'].includes(user.role)) {
    throw new Error('当前身份不能更新订单状态');
  }

  await db.collection('orders').doc(event.orderId).update({
    data: {
      status: event.status,
      handledBy: user.staffId || user._id || user.id || '',
      updatedAt: getNow(context).toLocaleString('zh-CN', { hour12: false }),
    },
  });

  return { ok: true };
}

exports.main = main;
