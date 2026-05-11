const ORDER_STORAGE_KEY = 'beauty_rest_orders';
const ORDER_STATUS_OPTIONS = ['已提交', '制作中', '已完成', '已取消'];

function addOrder(orders, order) {
  return [order, ...orders];
}

function toDateKey(date) {
  const value = date instanceof Date ? date : new Date(date);
  return `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}`;
}

function getTodayOrders(orders, now = new Date()) {
  const todayKey = toDateKey(now);
  return orders.filter((order) => toDateKey(order.createdAt) === todayKey);
}

function getOrderStatusOptions() {
  return ORDER_STATUS_OPTIONS.slice();
}

function updateOrderStatus(orders, orderId, status) {
  if (!ORDER_STATUS_OPTIONS.includes(status)) {
    throw new Error('请选择有效订单状态');
  }
  return orders.map((order) => {
    if (order.id !== orderId) {
      return order;
    }
    return {
      ...order,
      status,
    };
  });
}

function loadOrders(storage = wx) {
  return storage.getStorageSync(ORDER_STORAGE_KEY) || [];
}

function saveOrders(orders, storage = wx) {
  storage.setStorageSync(ORDER_STORAGE_KEY, orders);
  return orders;
}

function appendOrder(order, storage = wx) {
  const orders = addOrder(loadOrders(storage), order);
  return saveOrders(orders, storage);
}

module.exports = {
  ORDER_STORAGE_KEY,
  addOrder,
  appendOrder,
  getTodayOrders,
  getOrderStatusOptions,
  loadOrders,
  saveOrders,
  updateOrderStatus,
};
