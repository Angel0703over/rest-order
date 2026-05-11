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
  staff: ['orders.update'],
};

function getCurrentUser(storage = wx) {
  const userId = storage.getStorageSync(CURRENT_USER_STORAGE_KEY) || defaultUserId;
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
  const access = getAdminAccess(getCurrentUser(storage));
  const permissionAccess = permission ? getAdminAccess(getCurrentUser(storage), permission) : access;
  if (!permissionAccess.allowed) {
    wx.redirectTo({ url: permissionAccess.redirectUrl });
  }
  return permissionAccess.allowed;
}

module.exports = {
  ADMIN_HOME_PAGE,
  NO_ACCESS_PAGE,
  STAFF_HOME_PAGE,
  getAdminModules,
  getAdminAccess,
  getCurrentUser,
  getCustomerMember,
  getLoginEntryPage,
  ensureAdminAccess,
  hasAdminPermission,
  isAdmin,
  setCurrentUserId,
};
