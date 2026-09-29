const assert = require('node:assert/strict');
const {
  ADMIN_HOME_PAGE,
  NO_ACCESS_PAGE,
  STAFF_HOME_PAGE,
  applyCloudSession,
  enterAdminPage,
  getCurrentUser,
  getCustomerMember,
  getAdminAccess,
  getAdminModules,
  getStaffWorkbenchModules,
  getLoginEntryPage,
  hasAdminPermission,
  hasCloudSession,
  isAdmin,
  isSessionPending,
  setCurrentUserId,
} = require('../utils/auth');

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

async function run() {

function createStorage(initial = {}) {
  const data = { ...initial };
  return {
    getStorageSync(key) {
      return data[key];
    },
    setStorageSync(key, value) {
      data[key] = value;
    },
  };
}

test('默认当前用户是顾客会员而不是店长', () => {
  const user = getCurrentUser(createStorage());

  assert.equal(user.role, 'customer');
  assert.equal(isAdmin(user), false);
  assert.equal(getCustomerMember(user).id, 'u1001');
});

test('切换为店长身份后可以访问管理端', () => {
  const storage = createStorage();
  setCurrentUserId('staff-owner', storage);
  const user = getCurrentUser(storage);

  assert.equal(isAdmin(user), true);
  assert.deepEqual(getAdminAccess(user), {
    allowed: true,
    redirectUrl: ADMIN_HOME_PAGE,
  });
});

test('店长可以访问员工管理和所有后台模块', () => {
  const storage = createStorage();
  setCurrentUserId('staff-owner', storage);
  const user = getCurrentUser(storage);
  const modules = getAdminModules(user);

  assert.equal(user.role, 'owner');
  assert.equal(hasAdminPermission(user, 'settings.manage'), true);
  assert.equal(hasAdminPermission(user, 'staff.manage'), true);
  assert.deepEqual(modules.map((module) => module.id), ['settings', 'staff', 'categories', 'members', 'levels', 'meals', 'orders']);
});

test('店员只能访问今日订单模块', () => {
  const storage = createStorage();
  setCurrentUserId('staff-assistant', storage);
  const user = getCurrentUser(storage);

  assert.equal(user.role, 'staff');
  assert.equal(isAdmin(user), true);
  assert.equal(hasAdminPermission(user, 'orders.update'), true);
  assert.equal(hasAdminPermission(user, 'menu.manage'), true);
  assert.equal(hasAdminPermission(user, 'meal.manage'), true);
  assert.equal(hasAdminPermission(user, 'staff.manage'), false);
  assert.deepEqual(getAdminAccess(user, 'staff.manage'), {
    allowed: false,
    redirectUrl: NO_ACCESS_PAGE,
  });
  assert.deepEqual(getAdminModules(user).map((module) => module.id), ['categories', 'meals', 'orders']);
  assert.equal(getLoginEntryPage(user), STAFF_HOME_PAGE);
});

test('staff workbench shows only category, meal and order modules', () => {
  const storage = createStorage();
  setCurrentUserId('staff-owner', storage);
  const user = getCurrentUser(storage);

  assert.equal(user.role, 'owner');
  assert.deepEqual(getStaffWorkbenchModules(user).map((module) => module.id), ['categories', 'meals', 'orders']);
});

test('普通顾客访问店长端会被导向无权限页', () => {
  const user = getCurrentUser(createStorage());

  assert.deepEqual(getAdminAccess(user), {
    allowed: false,
    redirectUrl: NO_ACCESS_PAGE,
  });
});

function withApp(globalData) {
  global.getApp = () => ({ globalData });
  return () => {
    delete global.getApp;
  };
}

function withWx(navigation) {
  global.wx = {
    getStorageSync: () => '',
    setStorageSync: () => {},
    redirectTo(options) {
      navigation.push(options.url);
    },
  };
  return () => {
    delete global.wx;
  };
}

test('云会话身份优先于本地 mock 身份', () => {
  applyCloudSession({ user: { id: 'u9', role: 'owner', staffId: 's9', name: '真实店长' } });

  const user = getCurrentUser(createStorage());

  assert.equal(hasCloudSession(), true);
  assert.equal(user.role, 'owner');
  assert.equal(user.name, '真实店长');
  assert.equal(isAdmin(user), true);
  assert.deepEqual(
    getAdminModules(user).map((module) => module.id),
    ['settings', 'staff', 'categories', 'members', 'levels', 'meals', 'orders']
  );

  applyCloudSession(null);
  assert.equal(hasCloudSession(), false);
  assert.equal(getCurrentUser(createStorage()).role, 'customer');
});

await test('云会话未就绪时进入管理页不跳转，就绪后放行', async () => {
  const navigation = [];
  const restoreWx = withWx(navigation);
  const restoreApp = withApp({ cloudReady: true, cloudSessionReady: false, cloudSessionError: '' });
  applyCloudSession(null);

  assert.equal(isSessionPending(), true);

  const page = {};
  let granted = false;
  const result = enterAdminPage(page, 'orders.update', () => {
    granted = true;
  });

  assert.equal(result, false);
  assert.equal(granted, false);
  assert.deepEqual(navigation, []);
  assert.equal(page.__sessionGuardPending, true);
  assert.equal(typeof page.__sessionGuardPromise.then, 'function');

  applyCloudSession({ user: { id: 'u9', role: 'owner', name: '店长' } });
  await page.__sessionGuardPromise;
  await Promise.resolve();

  assert.equal(granted, true);
  assert.deepEqual(navigation, []);
  assert.equal(page.__sessionGuardPending, false);

  applyCloudSession(null);
  restoreApp();
  restoreWx();
});

test('云会话就绪后管理页正常放行', () => {
  const navigation = [];
  const restoreWx = withWx(navigation);
  const restoreApp = withApp({ cloudReady: true, cloudSessionReady: true });
  applyCloudSession({ user: { id: 'u9', role: 'owner', name: '店长' } });

  assert.equal(isSessionPending(), false);

  let granted = false;
  const result = enterAdminPage({}, 'staff.manage', () => {
    granted = true;
  });

  assert.equal(result, true);
  assert.equal(granted, true);
  assert.deepEqual(navigation, []);

  applyCloudSession(null);
  restoreApp();
  restoreWx();
});

test('云会话为顾客时访问管理页跳转无权限页', () => {
  const navigation = [];
  const restoreWx = withWx(navigation);
  const restoreApp = withApp({ cloudReady: true, cloudSessionReady: true });
  applyCloudSession({ user: { id: 'u1', role: 'customer', memberId: 'u1001' } });

  const result = enterAdminPage({}, 'orders.update', () => {});

  assert.equal(result, false);
  assert.deepEqual(navigation, [NO_ACCESS_PAGE]);

  applyCloudSession(null);
  restoreApp();
  restoreWx();
});

}

run();
