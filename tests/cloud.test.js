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

  await test('cloud API can manage members through adminMembers', async () => {
    const calls = [];
    const { adminMembers } = require('../utils/cloudApi');
    const wxLike = {
      cloud: {
        callFunction(options) {
          calls.push(options);
          return Promise.resolve({ result: { ok: true } });
        },
      },
    };

    await adminMembers({ action: 'list' }, wxLike);
    await adminMembers({ action: 'update', memberId: 'u1001', member: { levelId: 'gold' } }, wxLike);

    assert.deepEqual(calls, [
      { name: 'adminMembers', data: { action: 'list' } },
      { name: 'adminMembers', data: { action: 'update', memberId: 'u1001', member: { levelId: 'gold' } } },
    ]);
  });

  await test('cloud API can bind customer phone through bindMemberPhone', async () => {
    const calls = [];
    const { bindMemberPhone } = require('../utils/cloudApi');
    const result = await bindMemberPhone('phone-code-1', {
      cloud: {
        callFunction(options) {
          calls.push(options);
          return Promise.resolve({ result: { ok: true, user: { memberId: 'u1001' } } });
        },
      },
    });

    assert.deepEqual(calls, [{ name: 'bindMemberPhone', data: { code: 'phone-code-1' } }]);
    assert.deepEqual(result, { ok: true, user: { memberId: 'u1001' } });
  });

  await test('cloud API calls wx.cloud.callFunction', async () => {
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

  await test('cloud API can request customer menu', async () => {
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

  await test('login cloud function routes staff by openid', async () => {
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

  await test('login 浜戝嚱鏁颁紭鍏堜粠 users 浜戞暟鎹簱闆嗗悎璇诲彇韬唤', async () => {
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
                          name: '搴楅暱',
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
                          nickname: '椤惧A',
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
    assert.equal(result.user.name, '椤惧A');
    assert.equal(result.entryPage, '/pages/index/index');
    assert.equal(result.source, 'member');
  });

  await test('login cloud function sends unbound customers to phone binding', async () => {
    const { main } = require('../cloudfunctions/login/index');
    const result = await main({}, {
      OPENID: 'new-customer-openid',
      db: {
        collection(name) {
          return {
            where(query) {
              if (name === 'users') {
                assert.deepEqual(query, { openid: 'new-customer-openid' });
              } else {
                assert.equal(name, 'members');
                assert.deepEqual(query, { openid: 'new-customer-openid', active: true });
              }
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
        },
      },
    });

    assert.equal(result.entryPage, '/pages/bind-phone/index');
    assert.equal(result.bindingRequired, true);
    assert.equal(result.user.memberId, '');
  });

  await test('bindMemberPhone links openid to an active member by phone and creates customer user', async () => {
    const { main } = require('../cloudfunctions/bindMemberPhone/index');
    const updates = [];
    const adds = [];
    const result = await main({ code: 'phone-code' }, {
      OPENID: 'openid-new-customer',
      phoneInfo: { phoneNumber: '15162965666' },
      now: () => new Date('2026-05-20T10:00:00+08:00'),
      db: {
        collection(name) {
          if (name === 'members') {
            return {
              where(query) {
                assert.deepEqual(query, { phone: '15162965666', active: true });
                return {
                  limit(count) {
                    assert.equal(count, 2);
                    return {
                      async get() {
                        return {
                          data: [{
                            _id: 'member-3341',
                            phone: '15162965666',
                            nickname: '徐曼',
                            levelId: 'normal',
                            active: true,
                            openid: '',
                          }],
                        };
                      },
                    };
                  },
                };
              },
              doc(id) {
                assert.equal(id, 'member-3341');
                return {
                  async update(payload) {
                    updates.push(['members', payload.data]);
                    return {};
                  },
                };
              },
            };
          }
          assert.equal(name, 'users');
          return {
            where(query) {
              assert.deepEqual(query, { openid: 'openid-new-customer' });
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
            async add(payload) {
              adds.push(payload.data);
              return { _id: 'user-new' };
            },
          };
        },
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.user.memberId, 'member-3341');
    assert.equal(result.entryPage, '/pages/index/index');
    assert.deepEqual(updates, [[
      'members',
      { openid: 'openid-new-customer', updatedAt: '2026/5/20 10:00:00' },
    ]]);
    assert.equal(adds[0].role, 'customer');
    assert.equal(adds[0].memberId, 'member-3341');
  });

  await test('bindMemberPhone rejects a phone already bound to another openid', async () => {
    const { main } = require('../cloudfunctions/bindMemberPhone/index');

    await assert.rejects(
      () => main({ code: 'phone-code' }, {
        OPENID: 'openid-new-customer',
        phoneInfo: { phoneNumber: '15162965666' },
        db: {
          collection(name) {
            assert.equal(name, 'members');
            return {
              where() {
                return {
                  limit() {
                    return {
                      async get() {
                        return {
                          data: [{
                            _id: 'member-3341',
                            phone: '15162965666',
                            nickname: '徐曼',
                            active: true,
                            openid: 'openid-other',
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
      }),
      /已绑定其他微信/
    );
  });

  await test('getCustomerMenu cloud function returns meal availability', async () => {
    const { main } = require('../cloudfunctions/getCustomerMenu/index');
    const result = await main({ memberLevelId: 'basic' }, { db: null });
    const diamondMeal = result.meals.find((meal) => meal.requiredLevel === 'diamond');
    const basicMeal = result.meals.find((meal) => meal.requiredLevel === 'basic');

    assert.equal(result.memberLevelId, 'basic');
    assert.equal(result.memberLevels.length, 6);
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

  await test('adminCategories cloud function allows staff to maintain categories', async () => {
    const { main } = require('../cloudfunctions/adminCategories/index');
    const db = {
      collection(name) {
        if (name === 'users') {
          return {
            where(query) {
              return { limit: () => ({ get: async () => ({ data: [{ openid: query.openid, role: 'staff' }] }) }) };
            },
          };
        }
        assert.equal(name, 'categories');
        return {
          where() {
            return {
              orderBy() { return this; },
              get: async () => ({ data: [{ _id: 'drinks', name: 'Drinks', sort: 1, enabled: true }] }),
            };
          },
        };
      },
    };

    const list = await main({ action: 'list' }, { OPENID: 'staff-openid', db });

    assert.deepEqual(list.categories.map((item) => item.id), ['drinks']);
  });

  await test('adminLevels cloud function lists and updates member levels for owner', async () => {
    const { main } = require('../cloudfunctions/adminLevels/index');
    const levels = [{ _id: 'basic', name: 'Basic', note: 'Note', color: '#111111', rank: 1, minPoints: 2, maxPoints: 1000, enabled: true }];
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
      level: { name: '鍩虹浼氬憳', note: '鍙偣楗搧', color: '#6f7f8f', minPoints: 2, maxPoints: 1000 },
    }, { OPENID: 'owner-openid', db });

    assert.deepEqual(list.levels.map((item) => item.id), ['basic']);
    assert.equal(updated.level.id, 'basic');
    assert.deepEqual(mutations[0], ['update', 'basic', {
      name: '鍩虹浼氬憳',
      note: '鍙偣楗搧',
      color: '#6f7f8f',
      minPoints: 2,
      maxPoints: 1000,
      updatedAt: updated.level.updatedAt,
    }]);
  });

  await test('adminMembers cloud function lists creates updates and disables members for owner', async () => {
    const { main } = require('../cloudfunctions/adminMembers/index');
    const members = [
      { _id: 'u1001', openid: '', memberCardNo: '3341', nickname: 'Lin', phone: '138****2106', levelId: 'basic', totalPoints: 10, balance: 88.5, active: true },
    ];
    const levels = [
      { _id: 'normal', name: 'Normal', rank: 1, minPoints: 0, maxPoints: 1, enabled: true },
      { _id: 'basic', name: 'Basic', rank: 2, minPoints: 2, maxPoints: 1000, enabled: true },
      { _id: 'gold', name: 'Gold', rank: 4, minPoints: 2001, maxPoints: 3000, enabled: true },
    ];
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
        if (name === 'memberLevels') {
          return {
            where() {
              return { orderBy() { return this; }, get: async () => ({ data: levels }) };
            },
          };
        }
        assert.equal(name, 'members');
        return {
          where() {
            return {
              orderBy() { return this; },
              limit() { return this; },
              get: async () => ({ data: members }),
            };
          },
          add(payload) {
            mutations.push(['add', payload.data]);
            return Promise.resolve({ _id: 'u1002' });
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
      member: { memberCardNo: '3342', nickname: 'Chen', phone: '136****8842', totalPoints: 2500, balance: 860.96, openid: 'openid-chen' },
    }, { OPENID: 'owner-openid', db, now: () => new Date('2026-05-11T16:00:00+08:00') });
    const updated = await main({
      action: 'update',
      memberId: 'u1001',
      member: { memberCardNo: '3341', nickname: 'Lin 2', phone: '138****2106', totalPoints: 0, sourceLevelName: 'Gold', openid: 'openid-lin', active: true },
    }, { OPENID: 'owner-openid', db, now: () => new Date('2026-05-11T16:30:00+08:00') });
    const disabled = await main({ action: 'disable', memberId: 'u1001' }, {
      OPENID: 'owner-openid',
      db,
      now: () => new Date('2026-05-11T17:00:00+08:00'),
    });

    assert.deepEqual(list.members.map((member) => member.id), ['u1001']);
    assert.deepEqual(list.memberLevels.map((level) => level.id), ['normal', 'basic', 'gold']);
    assert.equal(created.member.id, 'u1002');
    assert.equal(created.member.levelId, 'gold');
    assert.equal(updated.member.levelId, 'normal');
    assert.equal(updated.member.memberCardNo, '3341');
    assert.equal(disabled.ok, true);
    assert.equal(mutations[0][0], 'add');
    assert.equal(mutations[0][1].openid, 'openid-chen');
    assert.equal(mutations[0][1].balance, 860.96);
    assert.equal(mutations[0][1].levelId, 'gold');
    assert.deepEqual(mutations[1][2].nickname, 'Lin 2');
    assert.equal(mutations[1][2].sourceLevelName, 'Gold');
    assert.equal(mutations[2][2].active, false);
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
    await adminSettings({ action: 'update', settings: { storeName: '浼氬憳浼戞伅鐐瑰崟', isOpen: true } }, wxLike);

    assert.deepEqual(calls, [
      { name: 'getStoreSettings', data: {} },
      { name: 'adminSettings', data: { action: 'update', settings: { storeName: '浼氬憳浼戞伅鐐瑰崟', isOpen: true } } },
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

  await test('adminMeals cloud function allows staff to maintain meals', async () => {
    const { main } = require('../cloudfunctions/adminMeals/index');
    const db = {
      collection(name) {
        if (name === 'users') {
          return {
            where(query) {
              return { limit: () => ({ get: async () => ({ data: [{ openid: query.openid, role: 'staff' }] }) }) };
            },
          };
        }
        const dataByName = {
          meals: [{ _id: 'm101', name: 'Tea', categoryId: 'drinks', desc: 'Warm', image: '/tea.svg', requiredLevel: 'basic', availableToday: true, sort: 1, enabled: true }],
          categories: [{ _id: 'drinks', name: 'Drinks', sort: 1, enabled: true }],
          memberLevels: [{ _id: 'basic', name: 'Basic', note: 'Note', color: '#111111', rank: 1, enabled: true }],
        };
        return {
          where() {
            return {
              orderBy() { return this; },
              get: async () => ({ data: dataByName[name] || [] }),
            };
          },
        };
      },
    };

    const list = await main({ action: 'list' }, { OPENID: 'staff-openid', db });

    assert.deepEqual(list.meals.map((item) => item.id), ['m101']);
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
        storeName: '浼氬憳浼戞伅鐐瑰崟',
        isOpen: false,
        locations: [
          {
            id: 'vip-2',
            name: 'VIP鍖呭帰2',
            sort: 1,
            enabled: true,
            tables: [{ id: '1', name: '妗屽彿1', enabled: true }],
          },
        ],
      },
    }, { OPENID: 'owner-openid', db, now: () => new Date('2026-05-11T14:00:00+08:00') });

    assert.equal(publicSettings.settings.storeName, 'Old Store');
    assert.equal(publicSettings.settings.locations[0].id, 'vip-1');
    assert.equal(updated.settings.storeName, '浼氬憳浼戞伅鐐瑰崟');
    assert.equal(updated.settings.isOpen, false);
    assert.equal(updated.settings.locations[0].name, 'VIP鍖呭帰2');
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
                          nickname: '椤惧A',
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
                return { data: { _id: 'gold', name: '閲戝崱浼氬憳', rank: 3, color: '#b48732', note: '鍙韩姝ｉ' } };
              },
            };
          },
        };
      },
    };

    const result = await main({}, { OPENID: 'customer-openid', db });

    assert.equal(result.member.id, 'u2001');
    assert.equal(result.member.nickname, '椤惧A');
    assert.equal(result.member.levelId, 'gold');
    assert.equal(result.level.name, '閲戝崱浼氬憳');
  });
}

run();


