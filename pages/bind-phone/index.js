const { bindMemberPhone } = require('../../utils/cloudApi');
const { loginAndStoreSession } = require('../../utils/session');

Page({
  data: {
    binding: false,
    feedback: '',
  },

  onLoad() {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      this.setData({ feedback: '当前环境暂不支持会员绑定，请联系店员协助。' });
    }
  },

  onGetPhoneNumber(event) {
    const detail = event.detail || {};
    if (detail.errMsg && !detail.errMsg.includes('ok')) {
      this.setData({ feedback: '需要授权手机号后才能匹配会员。' });
      return;
    }
    if (!detail.code) {
      this.setData({ feedback: '未获取到手机号授权，请重试。' });
      return;
    }
    if (this.data.binding) {
      return;
    }

    this.setData({ binding: true, feedback: '' });
    bindMemberPhone(detail.code)
      .then((result) => {
        const app = getApp();
        return loginAndStoreSession(app).then(() => result);
      })
      .then((result) => {
        const app = getApp();
        if (app.globalData) {
          app.globalData.currentMember = result.member || null;
        }
        wx.switchTab({ url: '/pages/index/index' });
      })
      .catch((error) => {
        this.setData({
          binding: false,
          feedback: error.message || '绑定失败，请联系店员确认会员手机号。',
        });
      });
  },
});
