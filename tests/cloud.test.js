const assert = require('node:assert/strict');
const { mockUsers } = require('../data/users');
const { ADMIN_ENTRY_PAGE, STAFF_ENTRY_PAGE } = require('../utils/routes');

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
  await test('cloud API uploads meal images to CloudBase storage', async () => {
    const calls = [];
    const { buildMealImageCloudPath, uploadMealImage } = require('../utils/cloudApi');
    const now = () => new Date('2026-05-11T04:00:00+08:00');
    const result = await uploadMealImage('tmp/photo.png', {
      cloud: {
        uploadFile(options) {
          calls.push(options);
          return Promise.resolve({ fileID: 'cloud://env/meal-images/photo.png' });
        },
      },
    }, now);

    assert.equal(buildMealImageCloudPath('tmp/photo.png', now), 'meal-images/20260511040000-photo.png');
    assert.deepEqual(calls, [{
      cloudPath: 'meal-images/20260511040000-photo.png',
      filePath: 'tmp/photo.png',
    }]);
    assert.equal(result.fileID, 'cloud://env/meal-images/photo.png');
  });

  await test('cloud API submits customer orders through createOrder', async () => {
    const calls = [];
    const { createOrder } = require('../utils/cloudApi');
    const payload = {
      member: { id: 'u1001', nickname: 'Lin', levelId: 'basic' },
      mealIds: ['m101'],
      location: { roomId: 'vip-1', roomName: 'VIP 1', tableId: '1', tableName: 'Table 1' },
    };
    const result = await createOrder(payload, {
      cloud: {
        callFunction(options) {
          calls.push(options);
          return Promise.resolve({ result: { order: { id: 'O1' } } });
        },
      },
    });

    assert.deepEqual(calls, [{ name: 'createOrder', data: payload }]);
    assert.deepEqual(result, { order: { id: 'O1' } });
  });

  await test('cloud API can fetch and update cloud orders', async () => {
    const calls = [];
    const {
      getMyOrders,
      getStaffOrders,
      updateOrderStatus,
    } = require('../utils/cloudApi');
    const wxLike = {
      cloud: {
        callFunction(options) {
          calls.push(options);
          return Promise.resolve({ result: { ok: true } });
        },
      },
    };

    await getMyOrders(wxLike);
    await getStaffOrders(wxLike);
    await updateOrderStatus('order-1', '已完成', wxLike);

    assert.deepEqual(calls, [
      { name: 'getMyOrders', data: {} },
      { name: 'getStaffOrders', data: {} },
      { name: 'updateOrderStatus', data: { orderId: 'order-1', status: '已完成' } },
    ]);
  });

  await test('cloud API can manage categories through adminCategories', async () => {
    const calls = [];
    const { adminCategories } = require('../utils/cloudApi');
    const wxLike = {
      cloud: {
        callFunction(options) {
          calls.push(options);
          return Promise.resolve({ result: { ok: true } });
        },
      },
    };

    await adminCategories({ action: 'list' }, wxLike);
    await adminCategories({ action: 'create', category: { name: 'New' } }, wxLike);

    assert.deepEqual(calls, [
      { name: 'adminCategories', data: { action: 'list' } },
      { name: 'adminCategories', data: { action: 'create', category: { name: 'New' } } },
    ]);
  });

  await test('cloud API can manage member levels through adminLevels', async () => {
    const calls = [];
    const { adminLevels } = require('../utils/cloudApi');
    const wxLike = {
      cloud: {
        callFunction(options) {
          calls.push(options);
          return Promise.resolve({ result: { ok: true } });
        },
      },
    };

    await adminLevels({ action: 'list' }, wxLike);
    await adminLevels({ action: 'update', levelId: 'basic', level: { name: 'Basic' } }, wxLike);

    assert.deepEqual(calls, [
      { name: 'adminLevels', data: { action: 'list' } },
      { name: 'adminLevels', data: { action: 'update', levelId: 'basic', level: { name: 'Basic' } } },
    ]);
  });

  await test('云 API 会统一通过 wx.cloud.callFunction 调用云函数', async () => {
    const calls = [];
    const { callCloudFunction } = require('../utils/cloudApi');
    const result = await callCloudFunction('login', { scene: 'boot' }, {
      cloud: {
        callFunction(options) {
          calls.push(options);
          return Promise.resolve({ result: { ok: true } });
        },
      },
    });

    assert.deepEqual(calls, [{ name: 'login', data: { scene: 'boot' } }]);
    assert.deepEqual(result, { ok: true });
  });

  await test('云 API 能请求顾客菜单', async () => {
    const calls = [];
    const { getCustomerMenu } = require('../utils/cloudApi');
    const result = await getCustomerMenu('gold', {
      cloud: {
        callFunction(options) {
          calls.push(options);
          return Promise.resolve({ result: { memberLevelId: 'gold', meals: [] } });
        },
      },
    });

    assert.deepEqual(calls, [{ name: 'getCustomerMenu', data: { memberLevelId: 'gold' } }]);
    assert.deepEqual(result, { memberLevelId: 'gold', meals: [] });
  });

  await test('login 云函数会按 openid 返回员工入口', async () => {
    const { main } = require('../cloudfunctions/login/index');
    const staffUser = mockUsers.find((user) => user.id === 'staff-assistant');
    const result = await main({ debug: true }, {
      OPENID: staffUser.openid,
      db: null,
    });

    assert.equal(result.user.role, 'staff');
    assert.equal(result.entryPage, STAFF_ENTRY_PAGE);
    assert.equal(result.source, 'mock');
  });

  await test('login cloud function blocks inactive staff from staff entry', async () => {
    const { main } = require('../cloudfunctions/login/index');
    const result = await main({ debug: true }, {
      OPENID: 'inactive-staff-openid',
      db: {
        collection(name) {
          assert.equal(name, 'users');
          return {
            where(query) {
              assert.deepEqual(query, { openid: 'inactive-staff-openid' });
              return {
                limit() {
                  return {
                    async get() {
                      return {
                        data: [{
                          _id: 'staff-disabled',
                          openid: 'inactive-staff-openid',
                          role: 'staff',
                          name: 'Disabled Staff',
                          staffId: 's1009',
                          active: false,
                        }],
                      };
                    },
                  };
                },
              };
            },
          };
        },
      },
    });

    assert.equal(result.user.role, 'customer');
    assert.equal(result.user.staffId, '');
    assert.equal(result.entryPage, '/pages/no-access/index');
    assert.equal(result.source, 'disabled');
    assert.equal(result.disabledReason, 'staffInactive');
  });

  await test('login 云函数优先从 users 云数据库集合读取身份', async () => {
    const { main } = require('../cloudfunctions/login/index');
    const result = await main({ debug: true }, {
      OPENID: 'openid-owner-from-db',
      db: {
        collection(name) {
          assert.equal(name, 'users');
          return {
            where(query) {
              assert.deepEqual(query, { openid: 'openid-owner-from-db' });
              return {
                limit(count) {
                  assert.equal(count, 1);
                  return {
                    async get() {
                      return {
                        data: [{
                          _id: 'cloud-user-owner',
                          openid: 'openid-owner-from-db',
                          role: 'owner',
                          name: '店长',
                          staffId: 's1001',
                        }],
                      };
                    },
                  };
                },
              };
            },
          };
        },
      },
    });

    assert.equal(result.user.role, 'owner');
    assert.equal(result.user.id, 'cloud-user-owner');
    assert.equal(result.entryPage, ADMIN_ENTRY_PAGE);
    assert.equal(result.source, 'database');
    assert.deepEqual(result.debug, {
      usersCollectionCount: 1,
      usersCollectionError: '',
      membersCollectionCount: 0,
      membersCollectionError: '',
    });
    assert.deepEqual(result.permissions, ['settings.manage', 'staff.manage', 'menu.manage', 'member.manage', 'meal.manage', 'orders.update']);
  });

  await test('login cloud function links customer users to active members', async () => {
    const { main } = require('../cloudfunctions/login/index');
    const result = await main({ debug: true }, {
      OPENID: 'customer-openid',
      db: {
        collection(name) {
          if (name === 'users') {
            return {
              where(query) {
                assert.deepEqual(query, { openid: 'customer-openid' });
                return {
                  limit() {
                    return {
                      async get() {
                        return { data: [] };
                      },
                    };
                  },
                };
              },
            };
          }
          assert.equal(name, 'members');
          return {
            where(query) {
              assert.deepEqual(query, { openid: 'customer-openid', active: true });
              return {
                limit() {
                  return {
                    async get() {
                      return {
                        data: [{
                          _id: 'u2001',
                          openid: 'customer-openid',
                          nickname: '顾客A',
                          phone: '138****0001',
                          levelId: 'gold',
                          active: true,
                        }],
                      };
                    },
                  };
                },
              };
            },
          };
        },
      },
    });

    assert.equal(result.user.role, 'customer');
    assert.equal(result.user.memberId, 'u2001');
    assert.equal(result.user.name, '顾客A');
    assert.equal(result.entryPage, '/pages/index/index');
    assert.equal(result.source, 'member');
  });

  await test('getCustomerMenu 云函数会返回会员可点状态', async () => {
    const { main } = require('../cloudfunctions/getCustomerMenu/index');
    const result = await main({ memberLevelId: 'basic' }, { db: null });
    const diamondMeal = result.meals.find((meal) => meal.requiredLevel === 'diamond');
    const basicMeal = result.meals.find((meal) => meal.requiredLevel === 'basic');

    assert.equal(result.memberLevelId, 'basic');
    assert.equal(result.memberLevels.length, 4);
    assert.equal(result.categories.length, 6);
    assert.equal(result.meals.length, 8);
    assert.equal(basicMeal.available, true);
    assert.equal(diamondMeal.available, false);
    assert.match(diamondMeal.lockReason, /钻石会员/);
  });
  await test('createOrder validates identity, meal level, shelf status and location before saving', async () => {
    const { main } = require('../cloudfunctions/createOrder/index');
    const added = [];
    const result = await main({
      member: { id: 'u1001', nickname: 'Lin', phone: '138****2106', levelId: 'basic' },
      mealIds: ['m101', 'm102'],
      location: { roomId: 'vip-1', roomName: 'VIP 1', tableId: '1', tableName: 'Table 1' },
    }, {
      OPENID: 'openid-customer',
      db: {
        collection(name) {
          if (name === 'users') {
            return {
              where(query) {
                assert.deepEqual(query, { openid: 'openid-customer' });
                return {
                  limit() {
                    return {
                      async get() {
                        return { data: [{ _id: 'user-1', openid: 'openid-customer', role: 'customer', memberId: 'u1001' }] };
                      },
                    };
                  },
                };
              },
            };
          }
          if (name === 'orders') {
            return {
              async add(payload) {
                added.push(payload.data);
                return { _id: 'cloud-order-1' };
              },
            };
          }
          return {
            where() {
              return {
                async get() {
                  return { data: [] };
                },
              };
            },
          };
        },
      },
      now: () => new Date('2026-05-11T09:20:00+08:00'),
    });

    assert.equal(result.ok, true);
    assert.equal(result.order.id, 'cloud-order-1');
    assert.deepEqual(result.order.mealIds, ['m101', 'm102']);
    assert.equal(result.order.status, '已提交');
    assert.equal(result.order.locationText, 'VIP 1 - Table 1');
    assert.equal(added.length, 1);
    assert.equal(added[0].openid, 'openid-customer');
    assert.equal(added[0].status, '已提交');
  });
  await test('createOrder allows owner openid to submit only when dev customer order flag is present', async () => {
    const { main } = require('../cloudfunctions/createOrder/index');
    const added = [];
    const result = await main({
      devForceCustomerOrder: true,
      member: { id: 'u1001', nickname: 'Lin', phone: '138****2106', levelId: 'basic' },
      mealIds: ['m101'],
      location: { roomId: 'vip-1', roomName: 'VIP 1', tableId: '1', tableName: 'Table 1' },
    }, {
      OPENID: 'openid-owner',
      db: {
        collection(name) {
          if (name === 'users') {
            return {
              where() {
                return {
                  limit() {
                    return {
                      async get() {
                        return { data: [{ _id: 'owner-1', openid: 'openid-owner', role: 'owner', staffId: 's1001' }] };
                      },
                    };
                  },
                };
              },
            };
          }
          if (name === 'orders') {
            return {
              async add(payload) {
                added.push(payload.data);
                return { _id: 'cloud-order-dev' };
              },
            };
          }
          return {
            where() {
              return {
                async get() {
                  return { data: [] };
                },
              };
            },
          };
        },
      },
      now: () => new Date('2026-05-11T09:30:00+08:00'),
    });

    assert.equal(result.ok, true);
    assert.equal(result.order.id, 'cloud-order-dev');
    assert.equal(added[0].devMode, true);
  });

  await test('createOrder rejects orders when store settings are closed', async () => {
    const { main } = require('../cloudfunctions/createOrder/index');
    const db = {
      collection(name) {
        if (name === 'users') {
          return {
            where() {
              return {
                limit() {
                  return {
                    async get() {
                      return { data: [{ _id: 'user-1', openid: 'openid-customer', role: 'customer', memberId: 'u1001' }] };
                    },
                  };
                },
              };
            },
          };
        }
        if (name === 'settings') {
          return {
            doc() {
              return {
                async get() {
                  return { data: { _id: 'store', storeName: 'Store', isOpen: false, locations: [] } };
                },
              };
            },
          };
        }
        return {
          where() {
            return {
              async get() {
                return { data: [] };
              },
            };
          },
        };
      },
    };

    await assert.rejects(
      () => main({
        member: { id: 'u1001', nickname: 'Lin', phone: '138****2106', levelId: 'basic' },
        mealIds: ['m101'],
        location: { roomId: 'vip-1', roomName: 'VIP 1', tableId: '1', tableName: 'Table 1' },
      }, { OPENID: 'openid-customer', db }),
      /门店已暂停点单/
    );
  });

  await test('order cloud functions read customer and staff orders and update status', async () => {
    const cloudOrders = [
      {
        _id: 'order-today',
        openid: 'openid-customer',
        status: '已提交',
        createdAt: '2026/5/11 09:00:00',
        mealName: 'Tea',
      },
      {
        _id: 'order-other-user',
        openid: 'openid-other',
        status: '已提交',
        createdAt: '2026/5/11 10:00:00',
        mealName: 'Salad',
      },
      {
        _id: 'order-yesterday',
        openid: 'openid-customer',
        status: '已提交',
        createdAt: '2026/5/10 10:00:00',
        mealName: 'Latte',
      },
    ];
    const updated = [];
    const db = {
      collection(name) {
        if (name === 'users') {
          return {
            where(query) {
              return {
                limit() {
                  return {
                    async get() {
                      return {
                        data: [{
                          _id: query.openid === 'openid-staff' ? 'staff-1' : 'customer-1',
                          openid: query.openid,
                          role: query.openid === 'openid-staff' ? 'staff' : 'customer',
                          memberId: query.openid === 'openid-staff' ? '' : 'u1001',
                          staffId: query.openid === 'openid-staff' ? 's1002' : '',
                        }],
                      };
                    },
                  };
                },
              };
            },
          };
        }
        if (name === 'orders') {
          return {
            where(query) {
              return {
                orderBy() {
                  return this;
                },
                async get() {
                  if (query.openid) {
                    return { data: cloudOrders.filter((order) => order.openid === query.openid) };
                  }
                  return { data: cloudOrders };
                },
              };
            },
            doc(orderId) {
              return {
                async update(payload) {
                  updated.push({ orderId, data: payload.data });
                  return { updated: 1 };
                },
              };
            },
          };
        }
        throw new Error(`unexpected collection ${name}`);
      },
    };
    const myOrders = await require('../cloudfunctions/getMyOrders/index').main({}, {
      OPENID: 'openid-customer',
      db,
      now: () => new Date('2026-05-11T11:00:00+08:00'),
    });
    const staffOrders = await require('../cloudfunctions/getStaffOrders/index').main({}, {
      OPENID: 'openid-staff',
      db,
      now: () => new Date('2026-05-11T11:00:00+08:00'),
    });
    const statusResult = await require('../cloudfunctions/updateOrderStatus/index').main({
      orderId: 'order-today',
      status: '已完成',
    }, {
      OPENID: 'openid-staff',
      db,
      now: () => new Date('2026-05-11T11:30:00+08:00'),
    });

    assert.deepEqual(myOrders.orders.map((order) => order.id), ['order-today']);
    assert.deepEqual(staffOrders.orders.map((order) => order.id), ['order-today', 'order-other-user']);
    assert.equal(statusResult.ok, true);
    assert.equal(updated[0].orderId, 'order-today');
    assert.equal(updated[0].data.status, '已完成');
    assert.equal(updated[0].data.handledBy, 's1002');
  });

  await test('adminCategories cloud function lists creates updates and soft deletes categories for owner', async () => {
    const { main } = require('../cloudfunctions/adminCategories/index');
    const categories = [{ _id: 'drinks', name: 'Drinks', sort: 1, enabled: true }];
    const mutations = [];
    const db = {
      collection(name) {
        if (name === 'users') {
          return {
            where(query) {
              return { limit: () => ({ get: async () => ({ data: [{ openid: query.openid, role: 'owner' }] }) }) };
            },
          };
        }
        assert.equal(name, 'categories');
        return {
          where() {
            return {
              orderBy() { return this; },
              get: async () => ({ data: categories }),
            };
          },
          add(payload) {
            mutations.push(['add', payload.data]);
            return Promise.resolve({ _id: 'cat-new' });
          },
          doc(id) {
            return {
              update(payload) {
                mutations.push(['update', id, payload.data]);
                return Promise.resolve({ updated: 1 });
              },
            };
          },
        };
      },
    };

    const list = await main({ action: 'list' }, { OPENID: 'owner-openid', db });
    const created = await main({ action: 'create', category: { name: ' Bakery ', sort: 2 } }, { OPENID: 'owner-openid', db });
    const updated = await main({ action: 'update', categoryId: 'drinks', category: { name: 'Tea', sort: 3 } }, { OPENID: 'owner-openid', db });
    const deleted = await main({ action: 'delete', categoryId: 'drinks' }, { OPENID: 'owner-openid', db });

    assert.deepEqual(list.categories.map((item) => item.id), ['drinks']);
    assert.equal(created.category.id, 'cat-new');
    assert.deepEqual(mutations[0][1].name, 'Bakery');
    assert.deepEqual(mutations[1], ['update', 'drinks', { name: 'Tea', sort: 3, updatedAt: updated.category.updatedAt }]);
    assert.deepEqual(mutations[2][2].enabled, false);
    assert.equal(deleted.ok, true);
  });

  await test('adminLevels cloud function lists and updates member levels for owner', async () => {
    const { main } = require('../cloudfunctions/adminLevels/index');
    const levels = [{ _id: 'basic', name: 'Basic', note: 'Note', color: '#111111', rank: 1, enabled: true }];
    const mutations = [];
    const db = {
      collection(name) {
        if (name === 'users') {
          return {
            where(query) {
              return { limit: () => ({ get: async () => ({ data: [{ openid: query.openid, role: 'owner' }] }) }) };
            },
          };
        }
        assert.equal(name, 'memberLevels');
        return {
          where() {
            return {
              orderBy() { return this; },
              get: async () => ({ data: levels }),
            };
          },
          doc(id) {
            return {
              update(payload) {
                mutations.push(['update', id, payload.data]);
                return Promise.resolve({ updated: 1 });
              },
            };
          },
        };
      },
    };

    const list = await main({ action: 'list' }, { OPENID: 'owner-openid', db });
    const updated = await main({
      action: 'update',
      levelId: 'basic',
      level: { name: '基础会员', note: '可点饮品', color: '#6f7f8f' },
    }, { OPENID: 'owner-openid', db });

    assert.deepEqual(list.levels.map((item) => item.id), ['basic']);
    assert.equal(updated.level.id, 'basic');
    assert.deepEqual(mutations[0], ['update', 'basic', {
      name: '基础会员',
      note: '可点饮品',
      color: '#6f7f8f',
      updatedAt: updated.level.updatedAt,
    }]);
  });
  await test('cloud API can manage meals through adminMeals', async () => {
    const calls = [];
    const { adminMeals } = require('../utils/cloudApi');
    const wxLike = {
      cloud: {
        callFunction(options) {
          calls.push(options);
          return Promise.resolve({ result: { ok: true } });
        },
      },
    };

    await adminMeals({ action: 'list' }, wxLike);
    await adminMeals({ action: 'toggleAvailability', mealId: 'm101', availableToday: false }, wxLike);

    assert.deepEqual(calls, [
      { name: 'adminMeals', data: { action: 'list' } },
      { name: 'adminMeals', data: { action: 'toggleAvailability', mealId: 'm101', availableToday: false } },
    ]);
  });

  await test('cloud API can manage staff through adminStaff', async () => {
    const calls = [];
    const { adminStaff } = require('../utils/cloudApi');
    const wxLike = {
      cloud: {
        callFunction(options) {
          calls.push(options);
          return Promise.resolve({ result: { ok: true } });
        },
      },
    };

    await adminStaff({ action: 'list' }, wxLike);
    await adminStaff({ action: 'update', staffId: 's1002', staff: { name: 'Chen' } }, wxLike);

    assert.deepEqual(calls, [
      { name: 'adminStaff', data: { action: 'list' } },
      { name: 'adminStaff', data: { action: 'update', staffId: 's1002', staff: { name: 'Chen' } } },
    ]);
  });

  await test('cloud API can read and manage store settings', async () => {
    const calls = [];
    const { adminSettings, getStoreSettings } = require('../utils/cloudApi');
    const wxLike = {
      cloud: {
        callFunction(options) {
          calls.push(options);
          return Promise.resolve({ result: { ok: true } });
        },
      },
    };

    await getStoreSettings(wxLike);
    await adminSettings({ action: 'update', settings: { storeName: '会员休息点单', isOpen: true } }, wxLike);

    assert.deepEqual(calls, [
      { name: 'getStoreSettings', data: {} },
      { name: 'adminSettings', data: { action: 'update', settings: { storeName: '会员休息点单', isOpen: true } } },
    ]);
  });

  await test('cloud API can read current customer member profile', async () => {
    const calls = [];
    const { getMyMemberProfile } = require('../utils/cloudApi');
    const wxLike = {
      cloud: {
        callFunction(options) {
          calls.push(options);
          return Promise.resolve({ result: { member: { id: 'u1001' } } });
        },
      },
    };

    const result = await getMyMemberProfile(wxLike);

    assert.deepEqual(calls, [{ name: 'getMyMemberProfile', data: {} }]);
    assert.deepEqual(result, { member: { id: 'u1001' } });
  });

  await test('adminMeals cloud function lists updates and toggles meals for owner', async () => {
    const { main } = require('../cloudfunctions/adminMeals/index');
    const meals = [{ _id: 'm101', name: 'Tea', categoryId: 'drinks', desc: 'Warm', image: '/tea.svg', requiredLevel: 'basic', availableToday: true, sort: 1, enabled: true }];
    const categories = [{ _id: 'drinks', name: 'Drinks', sort: 1, enabled: true }];
    const levels = [{ _id: 'basic', name: 'Basic', note: 'Note', color: '#111111', rank: 1, enabled: true }];
    const mutations = [];
    const db = {
      collection(name) {
        if (name === 'users') {
          return {
            where(query) {
              return { limit: () => ({ get: async () => ({ data: [{ openid: query.openid, role: 'owner' }] }) }) };
            },
          };
        }
        const dataByName = { meals, categories, memberLevels: levels };
        return {
          where() {
            return {
              orderBy() { return this; },
              get: async () => ({ data: dataByName[name] || [] }),
            };
          },
          doc(id) {
            return {
              update(payload) {
                mutations.push(['update', name, id, payload.data]);
                return Promise.resolve({ updated: 1 });
              },
            };
          },
        };
      },
    };

    const list = await main({ action: 'list' }, { OPENID: 'owner-openid', db });
    const updated = await main({
      action: 'update',
      mealId: 'm101',
      meal: { name: 'Tea 2', categoryId: 'drinks', desc: 'Hot', image: '/tea2.svg', requiredLevel: 'basic', availableToday: true },
    }, { OPENID: 'owner-openid', db });
    const toggled = await main({ action: 'toggleAvailability', mealId: 'm101', availableToday: false }, { OPENID: 'owner-openid', db });

    assert.deepEqual(list.meals.map((item) => item.id), ['m101']);
    assert.deepEqual(list.categories.map((item) => item.id), ['drinks']);
    assert.deepEqual(list.memberLevels.map((item) => item.id), ['basic']);
    assert.equal(updated.meal.id, 'm101');
    assert.equal(toggled.ok, true);
    assert.equal(mutations[0][1], 'meals');
    assert.equal(mutations[0][3].name, 'Tea 2');
    assert.equal(mutations[1][3].availableToday, false);
  });

  await test('adminStaff cloud function lists creates updates and disables staff for owner', async () => {
    const { main } = require('../cloudfunctions/adminStaff/index');
    const users = [
      { _id: 'owner-doc', openid: 'owner-openid', role: 'owner', staffId: 's1001', name: 'Owner', phone: '13900001111', title: 'Owner', active: true },
      { _id: 'staff-doc', openid: 'staff-openid', role: 'staff', staffId: 's1002', name: 'Staff', phone: '13900002222', title: 'Staff', active: true },
    ];
    const mutations = [];
    const db = {
      collection(name) {
        assert.equal(name, 'users');
        return {
          where(query) {
            return {
              orderBy() { return this; },
              limit() { return this; },
              async get() {
                if (Object.prototype.hasOwnProperty.call(query, 'openid')) {
                  return { data: users.filter((user) => user.openid === query.openid) };
                }
                if (Object.prototype.hasOwnProperty.call(query, 'staffId')) {
                  return { data: users.filter((user) => user.staffId === query.staffId) };
                }
                if (query.role === 'owner') {
                  return { data: users.filter((user) => user.role === 'owner') };
                }
                if (query.role === 'staff') {
                  return { data: users.filter((user) => user.role === 'staff') };
                }
                return { data: [] };
              },
            };
          },
          add(payload) {
            mutations.push(['add', payload.data]);
            return Promise.resolve({ _id: 'new-staff-doc' });
          },
          doc(id) {
            return {
              update(payload) {
                mutations.push(['update', id, payload.data]);
                return Promise.resolve({ updated: 1 });
              },
            };
          },
        };
      },
    };

    const list = await main({ action: 'list' }, { OPENID: 'owner-openid', db });
    const created = await main({
      action: 'create',
      staff: { name: ' New Staff ', phone: '13800000000', title: 'Artist' },
    }, { OPENID: 'owner-openid', db, now: () => new Date('2026-05-11T12:00:00+08:00') });
    const updated = await main({
      action: 'update',
      staffId: 's1002',
      staff: { name: 'Staff 2', phone: '13900003333', title: 'Senior', active: false },
    }, { OPENID: 'owner-openid', db, now: () => new Date('2026-05-11T12:30:00+08:00') });
    const disabled = await main({ action: 'disable', staffId: 's1002' }, {
      OPENID: 'owner-openid',
      db,
      now: () => new Date('2026-05-11T13:00:00+08:00'),
    });

    assert.deepEqual(list.staffMembers.map((staff) => staff.id), ['s1001', 's1002']);
    assert.equal(created.staff.id, 's1003');
    assert.equal(created.staff.userId, 'new-staff-doc');
    assert.equal(updated.staff.active, false);
    assert.equal(disabled.ok, true);
    assert.equal(mutations[0][0], 'add');
    assert.equal(mutations[0][1].role, 'staff');
    assert.equal(mutations[0][1].openid, '');
    assert.deepEqual(mutations[1][2].name, 'Staff 2');
    assert.equal(mutations[2][2].active, false);
  });

  await test('settings cloud functions read public settings and allow owner updates', async () => {
    const getStoreSettings = require('../cloudfunctions/getStoreSettings/index');
    const adminSettings = require('../cloudfunctions/adminSettings/index');
    const mutations = [];
    const currentSettings = {
      _id: 'store',
      storeName: 'Old Store',
      isOpen: true,
      locations: [
        {
          id: 'vip-1',
          name: 'VIP 1',
          sort: 1,
          enabled: true,
          tables: [{ id: '1', name: 'Table 1', enabled: true }],
        },
      ],
    };
    const db = {
      collection(name) {
        if (name === 'users') {
          return {
            where(query) {
              return { limit: () => ({ get: async () => ({ data: [{ openid: query.openid, role: 'owner' }] }) }) };
            },
          };
        }
        assert.equal(name, 'settings');
        return {
          doc(id) {
            assert.equal(id, 'store');
            return {
              async get() {
                return { data: currentSettings };
              },
              async update(payload) {
                mutations.push(payload.data);
                Object.assign(currentSettings, payload.data);
                return { updated: 1 };
              },
            };
          },
        };
      },
    };

    const publicSettings = await getStoreSettings.main({}, { db });
    const updated = await adminSettings.main({
      action: 'update',
      settings: {
        storeName: '会员休息点单',
        isOpen: false,
        locations: [
          {
            id: 'vip-2',
            name: 'VIP包厢2',
            sort: 1,
            enabled: true,
            tables: [{ id: '1', name: '桌号1', enabled: true }],
          },
        ],
      },
    }, { OPENID: 'owner-openid', db, now: () => new Date('2026-05-11T14:00:00+08:00') });

    assert.equal(publicSettings.settings.storeName, 'Old Store');
    assert.equal(publicSettings.settings.locations[0].id, 'vip-1');
    assert.equal(updated.settings.storeName, '会员休息点单');
    assert.equal(updated.settings.isOpen, false);
    assert.equal(updated.settings.locations[0].name, 'VIP包厢2');
    assert.equal(mutations[0].updatedAt, updated.settings.updatedAt);
  });

  await test('getMyMemberProfile returns member and level for current customer openid', async () => {
    const { main } = require('../cloudfunctions/getMyMemberProfile/index');
    const db = {
      collection(name) {
        if (name === 'members') {
          return {
            where(query) {
              assert.deepEqual(query, { openid: 'customer-openid', active: true });
              return {
                limit() {
                  return {
                    async get() {
                      return {
                        data: [{
                          _id: 'u2001',
                          openid: 'customer-openid',
                          nickname: '顾客A',
                          phone: '138****0001',
                          levelId: 'gold',
                          active: true,
                        }],
                      };
                    },
                  };
                },
              };
            },
          };
        }
        assert.equal(name, 'memberLevels');
        return {
          doc(id) {
            assert.equal(id, 'gold');
            return {
              async get() {
                return { data: { _id: 'gold', name: '金卡会员', rank: 3, color: '#b48732', note: '可享正餐' } };
              },
            };
          },
        };
      },
    };

    const result = await main({}, { OPENID: 'customer-openid', db });

    assert.equal(result.member.id, 'u2001');
    assert.equal(result.member.nickname, '顾客A');
    assert.equal(result.member.levelId, 'gold');
    assert.equal(result.level.name, '金卡会员');
  });
}

run();
