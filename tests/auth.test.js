const assert = require('node:assert/strict');
const {
  ADMIN_HOME_PAGE,
  NO_ACCESS_PAGE,
  STAFF_HOME_PAGE,
  getCurrentUser,
  getCustomerMember,
  getAdminAccess,
  getAdminModules,
  getLoginEntryPage,
  hasAdminPermission,
  isAdmin,
  setCurrentUserId,
} = require('../utils/auth');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

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
  assert.equal(hasAdminPermission(user, 'staff.manage'), false);
  assert.deepEqual(getAdminAccess(user, 'staff.manage'), {
    allowed: false,
    redirectUrl: NO_ACCESS_PAGE,
  });
  assert.deepEqual(getAdminModules(user).map((module) => module.id), ['orders']);
  assert.equal(getLoginEntryPage(user), STAFF_HOME_PAGE);
});

test('普通顾客访问店长端会被导向无权限页', () => {
  const user = getCurrentUser(createStorage());

  assert.deepEqual(getAdminAccess(user), {
    allowed: false,
    redirectUrl: NO_ACCESS_PAGE,
  });
});
