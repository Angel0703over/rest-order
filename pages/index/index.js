const {
  store,
  demoMembers,
  locations,
  getMealAvailability,
  getMealCategoryView,
  getMenuDisplayState,
  getOrderSummary,
  getOrderFollowUpActions,
} = require('../../utils/menu');
const {
  createOrder: createCloudOrder,
  getCustomerMenu,
  getMyMemberProfile,
  getStoreSettings,
} = require('../../utils/cloudApi');
const { DEV_FORCE_CUSTOMER_ENTRY } = require('../../utils/cloudConfig');
const { CUSTOMER_ENTRY_PAGE } = require('../../utils/routes');
const { loginAndStoreSession, redirectToEntryPage } = require('../../utils/session');
const { normalizeStoreSettings } = require('../../utils/settings');

const initialCategoryView = getMealCategoryView(demoMembers[0].levelId);
const initialSettings = normalizeStoreSettings({ storeName: store.name, locations });

function getLocationState(nextLocations, roomIndex = 0, tableIndex = 0) {
  const safeLocations = nextLocations && nextLocations.length ? nextLocations : initialSettings.locations;
  const selectedRoomIndex = Math.min(roomIndex, safeLocations.length - 1);
  const selectedRoom = safeLocations[selectedRoomIndex];
  const selectedTableIndex = Math.min(tableIndex, selectedRoom.tables.length - 1);
  const selectedTable = selectedRoom.tables[selectedTableIndex];
  return {
    locations: safeLocations,
    selectedRoomIndex,
    selectedTableIndex,
    selectedRoom,
    selectedTable,
    selectedLocationText: `${selectedRoom.name} · ${selectedTable.name}`,
  };
}

Page({
  data: {
    store,
    locations: initialSettings.locations,
    storeOpen: initialSettings.isOpen,
    currentMember: demoMembers[0],
    meals: getMealAvailability(demoMembers[0].levelId),
    categoryTabs: initialCategoryView.categoryTabs,
    selectedCategoryId: initialCategoryView.selectedCategoryId,
    currentCategoryMeals: initialCategoryView.meals,
    menuSource: null,
    memberProfileLoading: false,
    menuLoading: false,
    orderSubmitting: false,
    menuState: getMenuDisplayState({ isOnline: true, mealCount: getMealAvailability(demoMembers[0].levelId).length }),
    isOnline: true,
    selectedMealIds: [],
    selectedMealNames: [],
    selectedMealText: '',
    ...getLocationState(initialSettings.locations),
    latestOrder: null,
    orderSummary: null,
    orderActions: getOrderFollowUpActions(),
    showOrderModal: false,
    toastText: '',
  },

  onLoad() {
    this.redirectByCloudLogin();
    this.loginAs(demoMembers[0].id);
    this.loadMemberProfile();
    this.loadCustomerMenu(demoMembers[0].levelId);
    this.loadStoreSettings();
  },

  redirectByCloudLogin() {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      return;
    }
    const existingSession = app.globalData.cloudSession;
    if (existingSession && existingSession.entryPage) {
      console.log('cloud login existing session', existingSession);
      redirectToEntryPage(existingSession.entryPage, CUSTOMER_ENTRY_PAGE);
      return;
    }
    loginAndStoreSession(app)
      .then((session) => {
        console.log('cloud login session', session);
        redirectToEntryPage(session.entryPage, CUSTOMER_ENTRY_PAGE);
      })
      .catch((error) => {
        console.error('cloud login failed', error);
      });
  },

  applyMenuSource(memberLevelId, menuSource, selectedCategoryId, selectedMealIds = []) {
    const meals = getMealAvailability(memberLevelId, menuSource);
    const categoryView = getMealCategoryView(memberLevelId, selectedCategoryId, selectedMealIds, menuSource);
    return {
      meals,
      categoryTabs: categoryView.categoryTabs,
      selectedCategoryId: categoryView.selectedCategoryId,
      currentCategoryMeals: categoryView.meals,
      menuState: getMenuDisplayState({ isOnline: true, mealCount: meals.length }),
    };
  },

  loadCustomerMenu(memberLevelId) {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      return;
    }

    this.setData({ menuLoading: true });
    getCustomerMenu(memberLevelId)
      .then((menuSource) => {
        this.setData({
          menuSource,
          menuLoading: false,
          isOnline: true,
          ...this.applyMenuSource(
            memberLevelId,
            menuSource,
            this.data.selectedCategoryId,
            this.data.selectedMealIds
          ),
          toastText: '',
        });
      })
      .catch((error) => {
        console.error('cloud customer menu failed', error);
        this.setData({
          menuSource: null,
          menuLoading: false,
          isOnline: false,
          ...this.applyMenuSource(memberLevelId, null, this.data.selectedCategoryId, this.data.selectedMealIds),
          toastText: '云端菜单加载失败，已使用本地菜单',
        });
      });
  },

  loadStoreSettings() {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      return;
    }
    getStoreSettings()
      .then((result) => {
        const settings = normalizeStoreSettings(result.settings);
        this.setData({
          store: { ...this.data.store, name: settings.storeName },
          storeOpen: settings.isOpen,
          ...getLocationState(settings.locations, this.data.selectedRoomIndex, this.data.selectedTableIndex),
          toastText: settings.isOpen ? '' : '门店已暂停点单，请联系店员',
        });
      })
      .catch((error) => {
        console.error('cloud store settings failed', error);
      });
  },

  loadMemberProfile() {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      return;
    }
    this.setData({ memberProfileLoading: true });
    getMyMemberProfile()
      .then((result) => {
        const member = {
          id: result.member.id,
          nickname: result.member.nickname,
          phone: result.member.phone,
          levelId: result.member.levelId,
        };
        if (app.globalData) {
          app.globalData.currentMember = member;
        }
        this.setData({
          currentMember: member,
          memberProfileLoading: false,
          selectedMealIds: [],
          selectedMealNames: [],
          selectedMealText: '',
          ...this.applyMenuSource(member.levelId, this.data.menuSource),
          toastText: '',
        });
        this.loadCustomerMenu(member.levelId);
      })
      .catch((error) => {
        console.error('cloud member profile failed', error);
        this.setData({ memberProfileLoading: false });
      });
  },

  loginAs(memberId) {
    const currentMember = demoMembers.find((member) => member.id === memberId);
    const menuState = this.applyMenuSource(currentMember.levelId, this.data.menuSource);

    this.setData({
      currentMember,
      ...menuState,
      selectedMealIds: [],
      selectedMealNames: [],
      selectedMealText: '',
      orderSummary: null,
      orderActions: getOrderFollowUpActions(),
      showOrderModal: false,
      toastText: '',
    });
  },

  onSelectCategory(event) {
    const categoryView = getMealCategoryView(
      this.data.currentMember.levelId,
      event.currentTarget.dataset.id,
      this.data.selectedMealIds,
      this.data.menuSource
    );
    this.setData({
      categoryTabs: categoryView.categoryTabs,
      selectedCategoryId: categoryView.selectedCategoryId,
      currentCategoryMeals: categoryView.meals,
    });
  },

  onSelectMeal(event) {
    const mealId = event.currentTarget.dataset.id;
    const meal = this.data.meals.find((item) => item.id === mealId);
    if (!meal.available) {
      this.showToast(meal.lockReason);
      return;
    }
    const selectedMealIds = this.data.selectedMealIds.includes(mealId)
      ? this.data.selectedMealIds.filter((id) => id !== mealId)
      : [...this.data.selectedMealIds, mealId];
    const selectedMealNames = this.data.meals
      .filter((item) => selectedMealIds.includes(item.id))
      .map((item) => item.name);
    this.setData({
      selectedMealIds,
      selectedMealNames,
      selectedMealText: selectedMealNames.join('、'),
      currentCategoryMeals: getMealCategoryView(
        this.data.currentMember.levelId,
        this.data.selectedCategoryId,
        selectedMealIds,
        this.data.menuSource
      ).meals,
      toastText: '',
    });
  },

  onRoomChange(event) {
    const selectedRoomIndex = Number(event.detail.value);
    const selectedRoom = this.data.locations[selectedRoomIndex];
    const selectedTable = selectedRoom.tables[0];
    this.setData({
      selectedRoomIndex,
      selectedTableIndex: 0,
      selectedRoom,
      selectedTable,
      selectedLocationText: `${selectedRoom.name} · ${selectedTable.name}`,
      toastText: '',
    });
  },

  onTableChange(event) {
    const selectedTableIndex = Number(event.detail.value);
    const selectedTable = this.data.selectedRoom.tables[selectedTableIndex];
    this.setData({
      selectedTableIndex,
      selectedTable,
      selectedLocationText: `${this.data.selectedRoom.name} · ${selectedTable.name}`,
      toastText: '',
    });
  },

  submitCloudOrder() {
    this.setData({ orderSubmitting: true, toastText: '' });
    return createCloudOrder({
      member: {
        id: this.data.currentMember.id,
        nickname: this.data.currentMember.nickname,
        phone: this.data.currentMember.phone,
        levelId: this.data.currentMember.levelId,
      },
      mealIds: this.data.selectedMealIds,
      devForceCustomerOrder: DEV_FORCE_CUSTOMER_ENTRY,
      location: {
        roomId: this.data.selectedRoom.id,
        roomName: this.data.selectedRoom.name,
        tableId: this.data.selectedTable.id,
        tableName: this.data.selectedTable.name,
      },
    })
      .then((result) => {
        const latestOrder = result.order;
        this.setData({
          latestOrder,
          orderSummary: getOrderSummary(latestOrder),
          orderActions: getOrderFollowUpActions(),
          showOrderModal: true,
          orderSubmitting: false,
          selectedMealIds: [],
          selectedMealNames: [],
          selectedMealText: '',
          currentCategoryMeals: getMealCategoryView(
            this.data.currentMember.levelId,
            this.data.selectedCategoryId,
            [],
            this.data.menuSource
          ).meals,
          toastText: '',
        });
      })
      .catch((error) => {
        console.error('cloud create order failed', error);
        this.setData({ orderSubmitting: false });
        this.showToast(error.message || '订单提交失败，请稍后再试');
      });
  },

  onSubmitOrder() {
    if (this.data.selectedMealIds.length === 0) {
      this.showToast('请选择可点餐食');
      return;
    }
    if (!this.data.storeOpen) {
      this.showToast('门店已暂停点单，请联系店员');
      return;
    }
    if (this.data.orderSubmitting) {
      return;
    }
    const app = getApp();
    if (!app.globalData.cloudReady) {
      this.showToast('云端下单暂不可用，请联系店员协助');
      return;
    }
    this.submitCloudOrder();
  },

  showToast(toastText) {
    this.setData({ toastText });
  },

  onRetryMenu() {
    this.loadCustomerMenu(this.data.currentMember.levelId);
  },

  onCloseOrderModal() {
    this.setData({ showOrderModal: false });
  },

  onContinueOrder() {
    this.setData({ showOrderModal: false });
    if (wx.pageScrollTo) {
      wx.pageScrollTo({ scrollTop: 0, duration: 250 });
    }
  },

  onViewLatestOrder() {
    this.setData({ showOrderModal: false });
    wx.switchTab({ url: '/pages/orders/index' });
  },

  noop() {},
});
