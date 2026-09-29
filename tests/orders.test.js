const assert = require('node:assert/strict');
const {
  addOrder,
  buildOrderFilters,
  countPendingOrders,
  filterNewOrders,
  filterOrdersByStatus,
  getOrderFilters,
  getTodayOrders,
  getOrderStatusOptions,
  updateOrderStatus,
} = require('../utils/orders');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const todayOrder = {
  id: 'O202605090001',
  memberName: '林小姐',
  memberLevelName: '基础会员',
  mealName: '舒缓花茶',
  createdAt: '2026/5/9 12:00:00',
  status: '已提交',
};

test('新增订单会放到列表最前面', () => {
  const orders = addOrder([{ id: 'old' }], todayOrder);

  assert.equal(orders[0].id, todayOrder.id);
  assert.equal(orders[1].id, 'old');
});

test('店长只查看当天订单', () => {
  const orders = [
    todayOrder,
    { ...todayOrder, id: 'O202605080001', createdAt: '2026/5/8 18:00:00' },
  ];

  assert.deepEqual(getTodayOrders(orders, new Date('2026-05-09T09:00:00')).map((order) => order.id), [todayOrder.id]);
});

test('订单状态可以流转到制作中和已完成', () => {
  assert.deepEqual(getOrderStatusOptions(), ['已提交', '制作中', '已完成', '已取消']);

  const orders = updateOrderStatus([todayOrder], todayOrder.id, '制作中');
  assert.equal(orders[0].status, '制作中');
  assert.throws(() => updateOrderStatus([todayOrder], todayOrder.id, '乱填状态'), /请选择有效订单状态/);
});

const mixedOrders = [
  { ...todayOrder, id: 'p1', status: '已提交' },
  { ...todayOrder, id: 'p2', status: '已提交' },
  { ...todayOrder, id: 'm1', status: '制作中' },
  { ...todayOrder, id: 'd1', status: '已完成' },
  { ...todayOrder, id: 'c1', status: '已取消' },
];

test('订单可按状态筛选，空状态返回全部', () => {
  assert.equal(filterOrdersByStatus(mixedOrders, '').length, 5);
  assert.deepEqual(filterOrdersByStatus(mixedOrders, '已提交').map((order) => order.id), ['p1', 'p2']);

  const original = mixedOrders.slice();
  filterOrdersByStatus(original, '制作中');
  assert.equal(original.length, 5);
});

test('筛选标签携带各状态计数', () => {
  const filters = buildOrderFilters(mixedOrders);
  assert.deepEqual(filters.map((filter) => filter.label), ['全部', '待处理', '制作中', '已完成', '已取消']);
  assert.deepEqual(filters.map((filter) => filter.count), [5, 2, 1, 1, 1]);
  assert.deepEqual(getOrderFilters().map((filter) => filter.key), ['all', 'pending', 'making', 'done', 'canceled']);
});

test('待处理订单计数用于提醒角标', () => {
  assert.equal(countPendingOrders(mixedOrders), 2);
  assert.equal(countPendingOrders([]), 0);
});

test('对比前后两次订单可识别新到的待处理订单', () => {
  const previous = [mixedOrders[0], mixedOrders[2]];
  const incoming = [
    { ...todayOrder, id: 'p9', status: '已提交' },
    mixedOrders[0],
    mixedOrders[2],
    { ...todayOrder, id: 'd9', status: '已完成' },
  ];

  assert.deepEqual(filterNewOrders(previous, incoming).map((order) => order.id), ['p9']);
  assert.deepEqual(filterNewOrders(previous, incoming, '').map((order) => order.id), ['p9', 'd9']);
});
