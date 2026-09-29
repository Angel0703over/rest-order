const { loginWithCloud } = require('./cloudApi');
const { DEV_FORCE_CUSTOMER_ENTRY } = require('./cloudConfig');
const { BIND_PHONE_PAGE, CUSTOMER_ENTRY_PAGE } = require('./routes');
const { applyCloudSession, markSessionFailed: markAuthSessionFailed } = require('./auth');

const TAB_PAGES = [
  '/pages/index/index',
  '/pages/orders/index',
  '/pages/profile/index',
];

function storeSession(app, session) {
  if (app && app.globalData) {
    app.globalData.cloudSession = session;
    app.globalData.cloudSessionReady = true;
    app.globalData.cloudSessionError = '';
  }
  applyCloudSession(session);
  return session;
}

function loginAndStoreSession(app, wxLike = wx) {
  return loginWithCloud(wxLike).then((session) => storeSession(app, session));
}

function markSessionFailed(app, error) {
  const message = (error && error.message) || String(error || '云端登录失败');
  if (app && app.globalData) {
    app.globalData.cloudSessionError = message;
    app.globalData.cloudSessionReady = false;
  }
  markAuthSessionFailed();
  return message;
}

function isTabPage(url) {
  return TAB_PAGES.includes(url);
}

function redirectToEntryPage(entryPage, currentPage = CUSTOMER_ENTRY_PAGE, wxLike = wx, options = {}) {
  const forceCustomerEntry = Object.prototype.hasOwnProperty.call(options, 'forceCustomerEntry')
    ? options.forceCustomerEntry
    : DEV_FORCE_CUSTOMER_ENTRY;
  if (
    forceCustomerEntry
    && currentPage === CUSTOMER_ENTRY_PAGE
    && entryPage !== CUSTOMER_ENTRY_PAGE
    && entryPage !== BIND_PHONE_PAGE
  ) {
    return false;
  }
  if (!entryPage || entryPage === currentPage) {
    return false;
  }
  if (isTabPage(entryPage)) {
    wxLike.switchTab({ url: entryPage });
  } else {
    const navigate = wxLike.reLaunch || wxLike.redirectTo;
    navigate.call(wxLike, { url: entryPage });
  }
  return true;
}

module.exports = {
  loginAndStoreSession,
  markSessionFailed,
  redirectToEntryPage,
  storeSession,
};
