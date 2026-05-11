const { CLOUD_ENV_ID, isCloudEnvConfigured } = require('./utils/cloudConfig');
const { loginAndStoreSession } = require('./utils/session');

App({
  onLaunch() {
    if (wx.cloud && isCloudEnvConfigured()) {
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
          this.globalData.cloudSessionError = error.message;
        });
    }
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
