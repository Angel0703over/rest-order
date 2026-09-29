const { demoMembers } = require('../data/store');
const {
  CURRENT_USER_STORAGE_KEY,
  defaultUserId,
  mockUsers,
} = require('../data/users');
const {
  ADMIN_ENTRY_PAGE,
  STAFF_ENTRY_PAGE,
  getEntryPageForRole,
} = require('./routes');

const ADMIN_HOME_PAGE = ADMIN_ENTRY_PAGE;
const STAFF_HOME_PAGE = STAFF_ENTRY_PAGE;
const NO_ACCESS_PAGE = '/pages/no-access/index';

const adminModules = [
  {
    id: 'settings',
    title: '门店设置',
    desc: '维护门店名称、营业状态、房间和桌号',
    url: '/pages/admin/settings/index',
    permission: 'settings.manage',
  },
  {
    id: 'staff',
    title: '员工管理',
    desc: '新增、编辑、停用和删除店员账号',
    url: '/pages/admin/staff/index',
    permission: 'staff.manage',
  },
  {
    id: 'categories',
    title: '分类管理',
    desc: '新增、修改、删除餐食分类',
    url: '/pages/admin/categories/index',
    permission: 'menu.manage',
  },
  {
    id: 'members',
    title: '会员管理',
    desc: '新增会员、绑定 openid、修改等级和停用会员',
    url: '/pages/admin/members/index',
    permission: 'member.manage',
  },
  {
    id: 'levels',
    title: '会员等级',
    desc: '维护会员等级名称、权益说明和标签颜色',
    url: '/pages/admin/levels/index',
    permission: 'member.manage',
  },
  {
    id: 'meals',
    title: '餐食维护',
    desc: '维护餐食信息、适用会员等级和每日上下架',
    url: '/pages/admin/meals/index',
    permission: 'meal.manage',
  },
  {
    id: 'orders',
    title: '今日订单',
    desc: '查看顾客订单并更新制作状态',
    url: '/pages/admin/orders/index',
    permission: 'orders.update',
  },
];

const rolePermissions = {
  owner: ['settings.manage', 'staff.manage', 'menu.manage', 'member.manage', 'meal.manage', 'orders.update'],
  staff: ['menu.manage', 'meal.manage', 'orders.update'],
};

const staffWorkbenchModuleIds = ['categories', 'meals', 'orders'];

let cloudSessionUser = null;
let sessionSettled = false;
let resolveSessionSettled = () => {};
let sessionSettledPromise = new Promise((resolve) => {
  resolveSessionSettled = resolve;
});

function getAppInstance() {
  return typeof getApp === 'function' ? getApp() : null;
}

function normalizeSessionUser(user) {
  if (!user || !user.role) {
    return null;
  }
  return {
    id: user.id || '',
    role: user.role,
    memberId: user.memberId || '',
    staffId: user.staffId || '',
    name: user.name || '',
  };
}

function settleSession() {
  if (!sessionSettled) {
    sessionSettled = true;
    resolveSessionSettled();
  }
}

function applyCloudSession(session) {
  cloudSessionUser = normalizeSessionUser(session && session.user);
  settleSession();
  return cloudSessionUser;
}

function markSessionFailed() {
  settleSession();
}

function whenSessionSettled() {
  return sessionSettledPromise;
}

function hasCloudSession() {
  return Boolean(cloudSessionUser);
}

function isCloudConfigured() {
  const app = getAppInstance();
  return Boolean(app && app.globalData && app.globalData.cloudReady);
}

function isSessionPending() {
  if (!isCloudConfigured() || hasCloudSession()) {
    return false;
  }
  const app = getAppInstance();
  const globalData = app.globalData || {};
  if (globalData.cloudSessionReady || globalData.cloudSessionError) {
    return false;
  }
  return true;
}

function getCurrentUser(storage = wx) {
  if (cloudSessionUser) {
    return { ...cloudSessionUser };
  }
  const source = storage && typeof storage.getStorageSync === 'function' ? storage : {};
  const userId = (source.getStorageSync && source.getStorageSync(CURRENT_USER_STORAGE_KEY)) || defaultUserId;
  return mockUsers.find((user) => user.id === userId) || mockUsers.find((user) => user.id === defaultUserId);
}

function setCurrentUserId(userId, storage = wx) {
  storage.setStorageSync(CURRENT_USER_STORAGE_KEY, userId);
}

function isAdmin(user) {
  return user && (user.role === 'owner' || user.role === 'staff');
}

function getCustomerMember(user) {
  if (!user || user.role !== 'customer') {
    return null;
  }
  return demoMembers.find((member) => member.id === user.memberId) || null;
}

function hasAdminPermission(user, permission) {
  if (!permission) {
    return isAdmin(user);
  }
  return Boolean(user && rolePermissions[user.role] && rolePermissions[user.role].includes(permission));
}

function getAdminModules(user) {
  return adminModules.filter((module) => hasAdminPermission(user, module.permission));
}

function getStaffWorkbenchModules(user) {
  return adminModules.filter((module) => (
    staffWorkbenchModuleIds.includes(module.id) && hasAdminPermission(user, module.permission)
  ));
}

function getAdminAccess(user, permission) {
  if (!permission && user && user.role !== 'owner') {
    return {
      allowed: false,
      redirectUrl: NO_ACCESS_PAGE,
    };
  }
  if (hasAdminPermission(user, permission)) {
    return {
      allowed: true,
      redirectUrl: ADMIN_HOME_PAGE,
    };
  }
  return {
    allowed: false,
    redirectUrl: NO_ACCESS_PAGE,
  };
}

function getLoginEntryPage(user) {
  return getEntryPageForRole(user && user.role);
}

function ensureAdminAccess(storage = wx, permission = '') {
  const currentUser = getCurrentUser(storage);
  const access = permission ? getAdminAccess(currentUser, permission) : getAdminAccess(currentUser);
  if (!access.allowed) {
    const target = storage && typeof storage.redirectTo === 'function'
      ? storage
      : (typeof wx !== 'undefined' && wx && typeof wx.redirectTo === 'function' ? wx : null);
    if (target) {
      target.redirectTo({ url: access.redirectUrl });
    }
  }
  return access.allowed;
}

function enterAdminPage(page, permission, onGranted) {
  const wxLike = typeof wx !== 'undefined' ? wx : null;
  const run = () => {
    if (ensureAdminAccess(wxLike, permission)) {
      if (typeof onGranted === 'function') {
        onGranted();
      }
      return true;
    }
    return false;
  };

  if (isSessionPending()) {
    if (page && page.__sessionGuardPending) {
      return false;
    }
    if (page) {
      page.__sessionGuardPending = true;
    }
    const pending = whenSessionSettled().then(() => {
      if (page) {
        page.__sessionGuardPending = false;
        page.__sessionGuardPromise = null;
      }
      return run();
    });
    if (page) {
      page.__sessionGuardPromise = pending;
    }
    return false;
  }

  return run();
}

module.exports = {
  ADMIN_HOME_PAGE,
  NO_ACCESS_PAGE,
  STAFF_HOME_PAGE,
  applyCloudSession,
  enterAdminPage,
  getAdminModules,
  getStaffWorkbenchModules,
  getAdminAccess,
  getCurrentUser,
  getCustomerMember,
  getLoginEntryPage,
  ensureAdminAccess,
  hasAdminPermission,
  hasCloudSession,
  isAdmin,
  isSessionPending,
  markSessionFailed,
  setCurrentUserId,
  whenSessionSettled,
};
