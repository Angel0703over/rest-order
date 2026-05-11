const { ensureAdminAccess, getAdminModules, getCurrentUser } = require('../../../utils/auth');

Page({
  data: {
    modules: [],
    currentUser: null,
  },

  onShow() {
    if (!ensureAdminAccess()) {
      return;
    }
    const currentUser = getCurrentUser();
    this.setData({
      currentUser,
      modules: getAdminModules(currentUser),
    });
  },

  onOpenModule(event) {
    wx.navigateTo({ url: event.currentTarget.dataset.url });
  },
});
