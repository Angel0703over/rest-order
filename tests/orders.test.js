const assert = require('node:assert/strict');
const {
  addOrder,
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
