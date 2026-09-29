const assert = require('node:assert/strict');
const storeConfig = require('../data/store');
const {
  DEFAULT_MEAL_IMAGE,
  memberLevels,
  demoMembers,
  meals,
  categories,
  locations,
  resolveMealImage,
  canOrderMeal,
  getCategorizedMealGroups,
  getMealCategoryView,
  getMealAvailability,
  getMenuDisplayState,
  getMemberLevelDisplay,
  getMemberOrderStats,
  getTodayMeals,
  getOrderSummary,
  getOrderFollowUpActions,
  buildOrder,
} = require('../utils/menu');
const {
  defaultStoreSettings,
  normalizeStoreSettings,
  validateStoreSettings,
} = require('../utils/settings');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test('会员等级按由低到高排序', () => {
  assert.deepEqual(memberLevels.map((level) => level.id), ['normal', 'basic', 'silver', 'gold', 'diamond', 'special']);
});

test('门店配置集中导出顾客端需要的数据', () => {
  assert.equal(storeConfig.store.name, '会员休息点单');
  assert.equal(storeConfig.store.entryHint, '扫码进入');
  assert.equal(storeConfig.memberLevels, memberLevels);
  assert.equal(storeConfig.demoMembers, demoMembers);
  assert.equal(storeConfig.categories, categories);
  assert.equal(storeConfig.locations, locations);
  assert.equal(storeConfig.meals, meals);
});

test('会员只能点自己等级可用的餐食', () => {
  const goldOnlyMeal = meals.find((meal) => meal.requiredLevel === 'gold');
  assert.equal(canOrderMeal('silver', goldOnlyMeal), false);
  assert.equal(canOrderMeal('gold', goldOnlyMeal), true);
  assert.equal(canOrderMeal('diamond', goldOnlyMeal), true);
});

test('会员等级展示只点亮当前等级', () => {
  const display = getMemberLevelDisplay('gold');

  assert.deepEqual(
    display.map((level) => ({ id: level.id, active: level.active })),
    [
      { id: 'normal', active: false },
      { id: 'basic', active: false },
      { id: 'silver', active: false },
      { id: 'gold', active: true },
      { id: 'diamond', active: false },
      { id: 'special', active: false },
    ]
  );
});

test('餐食按分类分组展示', () => {
  const groups = getCategorizedMealGroups('gold');
  const drinkGroup = groups.find((group) => group.id === 'drinks');

  assert.equal(drinkGroup.name, '饮品');
  assert.deepEqual(drinkGroup.meals.map((meal) => meal.name), ['舒缓花茶', '桂花拿铁']);
  assert.equal(groups.some((group) => group.meals.length === 0), false);
});

test('点单页提供左侧分类和当前分类餐食', () => {
  const view = getMealCategoryView('gold', 'drinks', ['m101']);

  assert.deepEqual(
    view.categoryTabs.map((category) => ({ id: category.id, active: category.active })),
    [
      { id: 'drinks', active: true },
      { id: 'light', active: false },
      { id: 'bakery', active: false },
      { id: 'meal', active: false },
      { id: 'dessert', active: false },
      { id: 'limited', active: false },
    ]
  );
  assert.deepEqual(view.meals.map((meal) => meal.id), ['m101', 'm201']);
  assert.equal(view.meals.find((meal) => meal.id === 'm101').selected, true);
});

test('顾客端只展示今日上架餐食', () => {
  const customMeals = [
    { id: 'on', availableToday: true },
    { id: 'implicit-on' },
    { id: 'off', availableToday: false },
  ];

  assert.deepEqual(getTodayMeals(customMeals).map((meal) => meal.id), ['on', 'implicit-on']);
});

test('餐食可用状态包含置灰原因', () => {
  const availability = getMealAvailability('basic');
  const locked = availability.find((meal) => meal.requiredLevel === 'diamond');
  assert.equal(locked.available, false);
  assert.match(locked.lockReason, /钻石会员/);
});

test('可以为多个可点餐食生成订单', () => {
  const basicMeal = meals.find((meal) => meal.requiredLevel === 'basic');
  const secondBasicMeal = meals.find((meal) => meal.requiredLevel === 'basic' && meal.id !== basicMeal.id);

  const order = buildOrder({
    memberId: 'u1001',
    memberLevel: 'basic',
    mealIds: [basicMeal.id, secondBasicMeal.id],
    location: { roomId: 'vip-1', tableId: '1' },
  });

  assert.deepEqual(order.mealIds, [basicMeal.id, secondBasicMeal.id]);
  assert.equal(order.mealName, `${basicMeal.name}、${secondBasicMeal.name}`);
  assert.equal(order.locationText, 'VIP包厢1 · 桌号1');
});

test('下单必须选择房间和桌号', () => {
  const basicMeal = meals.find((meal) => meal.requiredLevel === 'basic');

  assert.throws(
    () => buildOrder({ memberId: 'u1001', memberLevel: 'basic', mealIds: [basicMeal.id] }),
    /请选择房间和桌号/
  );
});

test('不能为不可点餐食生成订单', () => {
  const diamondMeal = meals.find((meal) => meal.requiredLevel === 'diamond');

  assert.throws(
    () => buildOrder({
      memberId: 'u1001',
      memberLevel: 'basic',
      mealIds: [diamondMeal.id],
      location: { roomId: 'vip-1', tableId: '1' },
    }),
    /当前会员等级暂不能点/
  );
});

test('会员统计会区分可点和锁定餐食数量', () => {
  assert.deepEqual(getMemberOrderStats('basic'), { total: 8, available: 2, locked: 6 });
  assert.deepEqual(getMemberOrderStats('gold'), { total: 8, available: 6, locked: 2 });
});

test('订单摘要包含弹窗需要展示的信息', () => {
  const basicMeal = meals.find((meal) => meal.requiredLevel === 'basic');
  const order = buildOrder({
    memberId: 'u1001',
    memberLevel: 'basic',
    mealId: basicMeal.id,
    location: { roomId: 'vip-1', tableId: '1' },
  });
  const summary = getOrderSummary(order);

  assert.equal(summary.title, '订单已提交');
  assert.equal(Object.prototype.hasOwnProperty.call(summary, 'shortId'), false);
  assert.equal(summary.primaryLine, `${order.memberName} · ${order.memberLevelName}`);
  assert.equal(summary.mealLine, basicMeal.name);
  assert.match(summary.helperText, /请稍等店员确认/);
});

test('订单完成后提供继续点单和查看订单动作', () => {
  assert.deepEqual(getOrderFollowUpActions(), [
    { id: 'continue', label: '继续点单' },
    { id: 'viewOrder', label: '查看订单' },
  ]);
});

test('菜单展示状态能区分正常、空餐食和网络异常', () => {
  assert.deepEqual(getMenuDisplayState({ isOnline: true, mealCount: 8 }), {
    type: 'ready',
    title: '',
    message: '',
  });
  assert.deepEqual(getMenuDisplayState({ isOnline: true, mealCount: 0 }), {
    type: 'empty',
    title: '今日暂未上架餐食',
    message: '店长上架后，顾客就能在这里点单。',
  });
  assert.deepEqual(getMenuDisplayState({ isOnline: false, mealCount: 8 }), {
    type: 'offline',
    title: '餐食加载失败',
    message: '请检查网络后重试，或联系店员协助点单。',
  });
});
test('customer menu can be built from cloud function data instead of local store', () => {
  const cloudMenu = {
    memberLevels: [
      { id: 'basic', name: 'Basic', rank: 1 },
      { id: 'gold', name: 'Gold', rank: 3 },
    ],
    categories: [
      { id: 'cloud-drinks', name: 'Cloud Drinks', sort: 1 },
      { id: 'cloud-vip', name: 'Cloud VIP', sort: 2 },
    ],
    meals: [
      {
        id: 'cloud-tea',
        name: 'Cloud Tea',
        categoryId: 'cloud-drinks',
        requiredLevel: 'basic',
        availableToday: true,
      },
      {
        id: 'cloud-set',
        name: 'Cloud Set',
        categoryId: 'cloud-vip',
        requiredLevel: 'gold',
        availableToday: true,
      },
    ],
  };

  const availability = getMealAvailability('basic', cloudMenu);
  const categoryView = getMealCategoryView('basic', 'cloud-drinks', ['cloud-tea'], cloudMenu);
  const order = buildOrder({
    memberId: 'u1001',
    memberLevel: 'basic',
    mealIds: ['cloud-tea'],
    location: { roomId: 'vip-1', tableId: '1' },
    menuSource: cloudMenu,
  });

  assert.deepEqual(availability.map((meal) => meal.id), ['cloud-tea', 'cloud-set']);
  assert.equal(availability.find((meal) => meal.id === 'cloud-set').available, false);
  assert.deepEqual(categoryView.categoryTabs.map((category) => category.id), ['cloud-drinks', 'cloud-vip']);
  assert.deepEqual(categoryView.meals.map((meal) => ({ id: meal.id, selected: meal.selected })), [
    { id: 'cloud-tea', selected: true },
  ]);
  assert.equal(order.mealName, 'Cloud Tea');
});

test('customer menu falls back to local store when cloud menu source is null', () => {
  const view = getMealCategoryView('basic', 'drinks', ['m101'], null);

  assert.equal(view.selectedCategoryId, 'drinks');
  assert.equal(view.meals.find((meal) => meal.id === 'm101').selected, true);
});

test('store settings normalize room and table configuration for customer pickers', () => {
  const settings = normalizeStoreSettings({
    storeName: ' 会员休息点单 ',
    isOpen: false,
    locations: [
      {
        _id: 'vip-1',
        name: 'VIP包厢1',
        sort: 2,
        enabled: true,
        tables: [
          { _id: '1', name: '桌号1', enabled: true },
          { _id: '2', name: '桌号2', enabled: false },
        ],
      },
      {
        _id: 'hidden',
        name: '隐藏房间',
        sort: 1,
        enabled: false,
        tables: [{ _id: '1', name: '桌号1', enabled: true }],
      },
    ],
  });

  assert.equal(settings.storeName, '会员休息点单');
  assert.equal(settings.isOpen, false);
  assert.deepEqual(settings.locations.map((room) => room.id), ['vip-1']);
  assert.deepEqual(settings.locations[0].tables.map((table) => table.id), ['1']);
  assert.equal(validateStoreSettings(settings).valid, true);
});

test('store settings fallback keeps default rooms usable', () => {
  const settings = normalizeStoreSettings(null);

  assert.equal(settings.storeName, defaultStoreSettings.storeName);
  assert.equal(settings.locations.length > 0, true);
  assert.equal(settings.locations[0].tables.length > 0, true);
});

test('餐食无图片时回退到本地默认 SVG 占位', () => {
  assert.match(DEFAULT_MEAL_IMAGE, /^\/assets\/.*\.svg$/);
  assert.equal(resolveMealImage(''), DEFAULT_MEAL_IMAGE);
  assert.equal(resolveMealImage('   '), DEFAULT_MEAL_IMAGE);
  assert.equal(resolveMealImage(undefined), DEFAULT_MEAL_IMAGE);
  assert.equal(resolveMealImage('cloud://a/b.png'), 'cloud://a/b.png');
});

test('云端菜单缺少 image 字段时补齐默认占位图', () => {
  const cloudMenu = {
    memberLevels: [{ id: 'basic', name: 'Basic', rank: 1 }],
    categories: [{ id: 'drinks', name: '饮品' }],
    meals: [
      { id: 'no-image', name: '无图餐食', categoryId: 'drinks', requiredLevel: 'basic', availableToday: true },
      { id: 'has-image', name: '有图餐食', categoryId: 'drinks', requiredLevel: 'basic', availableToday: true, image: 'cloud://a/b.png' },
    ],
  };

  const availability = getMealAvailability('basic', cloudMenu);
  assert.equal(availability.find((meal) => meal.id === 'no-image').image, DEFAULT_MEAL_IMAGE);
  assert.equal(availability.find((meal) => meal.id === 'has-image').image, 'cloud://a/b.png');

  const view = getMealCategoryView('basic', 'drinks', [], cloudMenu);
  assert.equal(view.meals.every((meal) => Boolean(meal.image)), true);
});
