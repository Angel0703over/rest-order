const { bindMemberPhone } = require('../../utils/cloudApi');
const { BIND_PHONE_PAGE, CUSTOMER_ENTRY_PAGE } = require('../../utils/routes');
const { loginAndStoreSession, redirectToEntryPage } = require('../../utils/session');

Page({
  data: {
    binding: false,
    feedback: '',
  },

  onLoad() {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      this.setData({ feedback: '当前环境暂不支持身份绑定，请联系店长协助。' });
    }
  },

  onGetPhoneNumber(event) {
    const detail = event.detail || {};
    if (detail.errMsg && !detail.errMsg.includes('ok')) {
      this.setData({ feedback: '需要授权手机号后才能匹配身份。' });
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
        return loginAndStoreSession(app).then((session) => ({ result, session }));
      })
      .then(({ result, session }) => {
        const app = getApp();
        if (app.globalData) {
          app.globalData.currentMember = result.member || null;
        }
        const entryPage = (session && session.entryPage) || result.entryPage || CUSTOMER_ENTRY_PAGE;
        const navigated = redirectToEntryPage(entryPage, BIND_PHONE_PAGE, wx);
        if (!navigated) {
          this.setData({
            binding: false,
            feedback: entryPage === BIND_PHONE_PAGE
              ? '绑定成功，但未匹配到可用身份，请联系店长。'
              : '绑定成功。',
          });
        }
      })
      .catch((error) => {
        this.setData({
          binding: false,
          feedback: error.message || '绑定失败，请联系店长确认手机号。',
        });
      });
  },
});
