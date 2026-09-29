const {
  buildOrderFilters,
  countPendingOrders,
  filterNewOrders,
  filterOrdersByStatus,
  getOrderStatusOptions,
} = require('../../../utils/orders');
const { enterAdminPage } = require('../../../utils/auth');
const { getStaffOrders, updateOrderStatus } = require('../../../utils/cloudApi');

const AUTO_REFRESH_INTERVAL = 15000;

function resolveActiveStatus(filters, activeFilterKey) {
  const matched = filters.find((filter) => filter.key === activeFilterKey);
  return matched ? matched.status : '';
}

function formatTime(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

Page({
  data: {
    orders: [],
    visibleOrders: [],
    filters: buildOrderFilters([]),
    activeFilterKey: 'all',
    pendingCount: 0,
    statusOptions: getOrderStatusOptions(),
    feedback: '',
    loading: false,
    updatedAt: '',
    autoRefreshSeconds: AUTO_REFRESH_INTERVAL / 1000,
  },

  onShow() {
    enterAdminPage(this, 'orders.update', () => {
      this.refreshOrders();
      this.startAutoRefresh();
    });
  },

  onHide() {
    this.stopAutoRefresh();
  },

  onUnload() {
    this.stopAutoRefresh();
  },

  onPullDownRefresh() {
    this.refreshOrders().then(() => {
      if (wx.stopPullDownRefresh) {
        wx.stopPullDownRefresh();
      }
    });
  },

  startAutoRefresh() {
    this.stopAutoRefresh();
    this.autoRefreshTimer = setInterval(() => {
      this.refreshOrders({ silent: true });
    }, AUTO_REFRESH_INTERVAL);
  },

  stopAutoRefresh() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  },

  refreshOrders(options = {}) {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      this.setData({
        orders: [],
        visibleOrders: [],
        filters: buildOrderFilters([]),
        pendingCount: 0,
        feedback: '云端订单暂不可用',
      });
      return Promise.resolve();
    }
    if (!options.silent) {
      this.setData({ loading: true, feedback: '' });
    }
    return getStaffOrders()
      .then((result) => {
        this.applyOrders(result.orders || [], options);
      })
      .catch((error) => {
        console.error('cloud get admin orders failed', error);
        if (!options.silent) {
          this.setData({ loading: false, feedback: error.message || '订单加载失败' });
        }
      });
  },

  applyOrders(orders, options = {}) {
    const isFirstLoad = !this.hasLoadedOnce;
    const newPending = isFirstLoad ? [] : filterNewOrders(this.data.orders, orders);
    const filters = buildOrderFilters(orders);
    const activeStatus = resolveActiveStatus(filters, this.data.activeFilterKey);
    const patch = {
      orders,
      filters,
      visibleOrders: filterOrdersByStatus(orders, activeStatus),
      pendingCount: countPendingOrders(orders),
      loading: false,
      updatedAt: formatTime(new Date()),
    };
    if (newPending.length > 0) {
      patch.feedback = `有 ${newPending.length} 个新订单待处理`;
    } else if (!options.silent) {
      patch.feedback = '';
    }
    this.hasLoadedOnce = true;
    this.setData(patch);
  },

  onFilterTap(event) {
    const activeFilterKey = event.currentTarget.dataset.key;
    if (!activeFilterKey || activeFilterKey === this.data.activeFilterKey) {
      return;
    }
    const activeStatus = resolveActiveStatus(this.data.filters, activeFilterKey);
    this.setData({
      activeFilterKey,
      visibleOrders: filterOrdersByStatus(this.data.orders, activeStatus),
    });
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
