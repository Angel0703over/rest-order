const assert = require('node:assert/strict');
const { ADMIN_ENTRY_PAGE, CUSTOMER_ENTRY_PAGE, STAFF_ENTRY_PAGE } = require('../utils/routes');

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
  await test('登录失败会记录会话错误并回退到本地兜底身份', async () => {
    const auth = require('../utils/auth');
    const { markSessionFailed } = require('../utils/session');
    const app = { globalData: {} };

    const message = markSessionFailed(app, new Error('boom'));

    assert.equal(message, 'boom');
    assert.equal(app.globalData.cloudSessionError, 'boom');
    assert.equal(app.globalData.cloudSessionReady, false);
    assert.equal(auth.hasCloudSession(), false);
  });

  await test('云登录会保存会话并返回入口页面', async () => {
    const calls = [];
    const app = {
      globalData: {},
    };
    const wxLike = {
      cloud: {
        callFunction(options) {
          calls.push(options);
          return Promise.resolve({
            result: {
              openid: 'openid-owner',
              source: 'database',
              user: { id: 'u1', role: 'owner', name: '店长' },
              entryPage: ADMIN_ENTRY_PAGE,
              permissions: ['staff.manage'],
            },
          });
        },
      },
    };
    const { loginAndStoreSession } = require('../utils/session');
    const result = await loginAndStoreSession(app, wxLike);

    assert.deepEqual(calls, [{ name: 'login', data: {} }]);
    assert.equal(result.entryPage, ADMIN_ENTRY_PAGE);
    assert.equal(app.globalData.cloudSession.user.role, 'owner');
    assert.equal(app.globalData.cloudSessionReady, true);
  });

  await test('云登录会把云会话写入前端身份来源', async () => {
    const auth = require('../utils/auth');
    auth.applyCloudSession(null);

    const app = { globalData: {} };
    const wxLike = {
      cloud: {
        callFunction() {
          return Promise.resolve({
            result: {
              openid: 'openid-staff',
              source: 'database',
              user: { id: 'u7', role: 'staff', staffId: 's7', name: '店员' },
              entryPage: STAFF_ENTRY_PAGE,
              permissions: ['orders.update'],
            },
          });
        },
      },
    };
    const { loginAndStoreSession } = require('../utils/session');
    await loginAndStoreSession(app, wxLike);

    assert.equal(auth.hasCloudSession(), true);
    assert.equal(auth.getCurrentUser({ getStorageSync: () => '' }).role, 'staff');

    auth.applyCloudSession(null);
    assert.equal(auth.hasCloudSession(), false);
  });

  await test('入口跳转会区分 tab 页面和普通页面', () => {
    const navigation = [];
    const wxLike = {
      switchTab(options) {
        navigation.push(['switchTab', options.url]);
      },
      reLaunch(options) {
        navigation.push(['reLaunch', options.url]);
      },
      redirectTo(options) {
        navigation.push(['redirectTo', options.url]);
      },
    };
    const { redirectToEntryPage } = require('../utils/session');

    redirectToEntryPage(CUSTOMER_ENTRY_PAGE, CUSTOMER_ENTRY_PAGE, wxLike, { forceCustomerEntry: false });
    redirectToEntryPage(STAFF_ENTRY_PAGE, CUSTOMER_ENTRY_PAGE, wxLike, { forceCustomerEntry: false });
    redirectToEntryPage(ADMIN_ENTRY_PAGE, CUSTOMER_ENTRY_PAGE, wxLike, { forceCustomerEntry: false });

    assert.deepEqual(navigation, [
      ['reLaunch', STAFF_ENTRY_PAGE],
      ['reLaunch', ADMIN_ENTRY_PAGE],
    ]);
  });
  await test('dev force customer entry can stop owner cloud session redirecting customer page away', () => {
    const navigation = [];
    const wxLike = {
      switchTab(options) {
        navigation.push(['switchTab', options.url]);
      },
      reLaunch(options) {
        navigation.push(['reLaunch', options.url]);
      },
    };
    const { redirectToEntryPage } = require('../utils/session');

    const redirected = redirectToEntryPage(ADMIN_ENTRY_PAGE, CUSTOMER_ENTRY_PAGE, wxLike, {
      forceCustomerEntry: true,
    });

    assert.equal(redirected, false);
    assert.deepEqual(navigation, []);
  });
}

run();
