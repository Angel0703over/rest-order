const { CLOUD_ENV_ID, isCloudEnvConfigured } = require('./utils/cloudConfig');
const { loginAndStoreSession, markSessionFailed } = require('./utils/session');

App({
  onLaunch() {
    const cloudAvailable = Boolean(wx.cloud) && isCloudEnvConfigured();
    this.globalData.cloudReady = cloudAvailable;

    if (!cloudAvailable) {
      this.globalData.cloudSessionError = '云开发未配置，已进入本地演示模式';
      return;
    }

    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true,
    });
    loginAndStoreSession(this)
      .then((session) => {
        console.log('app cloud login session', session);
      })
      .catch((error) => {
        console.error('app cloud login failed', error);
        markSessionFailed(this, error);
      });
  },

  globalData: {
    currentMember: null,
    latestOrder: null,
    cloudReady: isCloudEnvConfigured(),
    cloudSession: null,
    cloudSessionReady: false,
    cloudSessionError: '',
  },
});
