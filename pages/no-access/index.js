const { ADMIN_HOME_PAGE, setCurrentUserId } = require('../../utils/auth');

Page({
  data: {
    title: '暂无店长权限',
    message: '当前账号不是店长账号，无法进入管理端。顾客请返回点单页面。',
  },

  onBackToCustomer() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  onUseAdminMock() {
    setCurrentUserId('staff-owner');
    wx.reLaunch({ url: ADMIN_HOME_PAGE });
  },
});
