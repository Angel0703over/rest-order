let cloud = null;

try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (error) {
  cloud = null;
}

const mockUsers = [
  {
    id: 'customer-lin',
    openid: 'mock-openid-customer-lin',
    role: 'customer',
    memberId: 'u1001',
    name: '林小姐',
  },
  {
    id: 'staff-owner',
    openid: 'mock-openid-staff-owner',
    role: 'owner',
    staffId: 's1001',
    name: '店长',
  },
  {
    id: 'staff-assistant',
    openid: 'mock-openid-staff-assistant',
    role: 'staff',
    staffId: 's1002',
    name: '陈小妹',
  },
];

const entryPages = {
  customer: '/pages/index/index',
  owner: '/pages/admin/home/index',
  staff: '/pages/staff/home/index',
  disabled: '/pages/no-access/index',
};

const rolePermissions = {
  owner: ['settings.manage', 'staff.manage', 'menu.manage', 'member.manage', 'meal.manage', 'orders.update'],
  staff: ['orders.update'],
  customer: [],
};

function sanitizeUser(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id || user._id || '',
    role: user.role,
    memberId: user.memberId || '',
    staffId: user.staffId || '',
    name: user.name || '',
  };
}

function sanitizeMemberAsUser(member) {
  if (!member) {
    return null;
  }
  return {
    id: member._id || member.id || '',
    role: 'customer',
    memberId: member._id || member.id || '',
    staffId: '',
    name: member.nickname || member.name || '',
  };
}

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

async function getUserFromCloudDatabase(openid, context) {
  const db = getDatabase(context);
  if (!db || !openid) {
    return {
      error: !db ? 'database unavailable' : 'openid missing',
      user: null,
      count: 0,
    };
  }

  let result = null;
  try {
    result = await db
      .collection('users')
      .where({ openid })
      .limit(1)
      .get();
  } catch (error) {
    return {
      error: error.message || String(error),
      user: null,
      count: 0,
    };
  }

  return {
    error: '',
    user: result && result.data && result.data.length ? result.data[0] : null,
    count: result && result.data ? result.data.length : 0,
  };
}

async function getMemberFromCloudDatabase(openid, context) {
  const db = getDatabase(context);
  if (!db || !openid) {
    return {
      error: !db ? 'database unavailable' : 'openid missing',
      member: null,
      count: 0,
    };
  }

  try {
    const result = await db
      .collection('members')
      .where({ openid, active: true })
      .limit(1)
      .get();
    return {
      error: '',
      member: result && result.data && result.data.length ? result.data[0] : null,
      count: result && result.data ? result.data.length : 0,
    };
  } catch (error) {
    return {
      error: error.message || String(error),
      member: null,
      count: 0,
    };
  }
}

function getPermissions(role) {
  return rolePermissions[role] || [];
}

function getEntryPageForRole(role) {
  return entryPages[role] || entryPages.customer;
}

async function main(event = {}, context = {}) {
  const openid = await getOpenid(context);
  const cloudLookup = await getUserFromCloudDatabase(openid, context);
  const cloudUser = cloudLookup.user;
  const memberLookup = cloudUser ? { member: null, count: 0, error: '' } : await getMemberFromCloudDatabase(openid, context);
  const cloudMember = memberLookup.member;
  const mockUser = mockUsers.find((item) => item.openid === openid) || null;
  const isDisabledStaff = cloudUser && cloudUser.role === 'staff' && cloudUser.active === false;
  const user = isDisabledStaff ? null : (cloudUser || sanitizeMemberAsUser(cloudMember) || mockUser);
  const role = user ? user.role : 'customer';
  const source = isDisabledStaff ? 'disabled' : cloudUser ? 'database' : cloudMember ? 'member' : mockUser ? 'mock' : 'default';

  const response = {
    openid,
    source,
    user: sanitizeUser(user) || {
      id: '',
      role,
      memberId: '',
      staffId: '',
      name: '',
    },
    entryPage: isDisabledStaff ? entryPages.disabled : getEntryPageForRole(role),
    permissions: getPermissions(role),
  };

  if (isDisabledStaff) {
    response.disabledReason = 'staffInactive';
  }

  if (event.debug) {
    response.debug = {
      usersCollectionCount: cloudLookup.count,
      usersCollectionError: cloudLookup.error,
      membersCollectionCount: memberLookup.count,
      membersCollectionError: memberLookup.error,
    };
  }

  return response;
}

exports.main = main;
