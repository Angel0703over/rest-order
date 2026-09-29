const ORDER_STORAGE_KEY = 'beauty_rest_orders';
const ORDER_STATUS_OPTIONS = ['已提交', '制作中', '已完成', '已取消'];
const PENDING_ORDER_STATUS = '已提交';

const ORDER_FILTERS = [
  { key: 'all', label: '全部', status: '' },
  { key: 'pending', label: '待处理', status: PENDING_ORDER_STATUS },
  { key: 'making', label: '制作中', status: '制作中' },
  { key: 'done', label: '已完成', status: '已完成' },
  { key: 'canceled', label: '已取消', status: '已取消' },
];

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

function getOrderFilters() {
  return ORDER_FILTERS.map((filter) => ({ ...filter }));
}

function filterOrdersByStatus(orders = [], status = '') {
  if (!status) {
    return orders.slice();
  }
  return orders.filter((order) => order && order.status === status);
}

function countOrdersByStatus(orders = [], status = '') {
  return filterOrdersByStatus(orders, status).length;
}

function countPendingOrders(orders = []) {
  return countOrdersByStatus(orders, PENDING_ORDER_STATUS);
}

function buildOrderFilters(orders = []) {
  return ORDER_FILTERS.map((filter) => ({
    ...filter,
    count: countOrdersByStatus(orders, filter.status),
  }));
}

function filterNewOrders(previousOrders = [], nextOrders = [], status = PENDING_ORDER_STATUS) {
  const knownIds = new Set(previousOrders.map((order) => order && order.id));
  return nextOrders.filter((order) => order && !knownIds.has(order.id) && (!status || order.status === status));
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
  ORDER_FILTERS,
  ORDER_STORAGE_KEY,
  PENDING_ORDER_STATUS,
  addOrder,
  appendOrder,
  buildOrderFilters,
  countOrdersByStatus,
  countPendingOrders,
  filterNewOrders,
  filterOrdersByStatus,
  getOrderFilters,
  getTodayOrders,
  getOrderStatusOptions,
  loadOrders,
  saveOrders,
  updateOrderStatus,
};
