const { getMyOrders } = require('../../utils/cloudApi');

Page({
  data: {
    orders: [],
    feedback: '',
    loading: false,
  },

  onShow() {
    this.refreshOrders();
  },

  refreshOrders() {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      this.setData({ orders: [], feedback: '云端订单暂不可用' });
      return;
    }
    this.setData({ loading: true, feedback: '' });
    getMyOrders()
      .then((result) => {
        this.setData({
          orders: result.orders || [],
          loading: false,
          feedback: '',
        });
      })
      .catch((error) => {
        console.error('cloud get my orders failed', error);
        this.setData({
          loading: false,
          feedback: error.message || '订单加载失败',
        });
      });
  },
});
