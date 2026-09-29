const { enterAdminPage, getCurrentUser, getStaffWorkbenchModules } = require('../../../utils/auth');
const { getOrderStatusOptions } = require('../../../utils/orders');
const { getStaffOrders, updateOrderStatus } = require('../../../utils/cloudApi');

Page({
  data: {
    currentUser: null,
    modules: [],
    orders: [],
    statusOptions: getOrderStatusOptions(),
    feedback: '',
    loading: false,
  },

  onShow() {
    enterAdminPage(this, 'orders.update', () => {
      const currentUser = getCurrentUser();
      this.setData({
        currentUser,
        modules: getStaffWorkbenchModules(currentUser),
      });
      this.refreshOrders();
    });
  },

  refreshOrders() {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      this.setData({ orders: [], feedback: '云端订单暂不可用' });
      return;
    }
    this.setData({ loading: true, feedback: '' });
    getStaffOrders()
      .then((result) => {
        this.setData({
          orders: result.orders || [],
          loading: false,
        });
      })
      .catch((error) => {
        console.error('cloud get staff orders failed', error);
        this.setData({
          loading: false,
          feedback: error.message || '订单加载失败',
        });
      });
  },

  onOpenModule(event) {
    const url = event.currentTarget.dataset.url;
    if (url === '/pages/admin/orders/index') {
      return;
    }
    wx.navigateTo({ url });
  },

  onStatusChange(event) {
    const orderId = event.currentTarget.dataset.id;
    const status = this.data.statusOptions[Number(event.detail.value)];
    updateOrderStatus(orderId, status)
      .then(() => {
        this.setData({ feedback: '订单状态已更新' });
        this.refreshOrders();
      })
      .catch((error) => {
        console.error('cloud update order failed', error);
        this.setData({ feedback: error.message || '订单状态更新失败' });
      });
  },
});
