const { categories: fallbackCategories, meals: fallbackMeals, memberLevels: fallbackLevels } = require('../../../data/store');
const { ensureAdminAccess } = require('../../../utils/auth');
const { getAdminMealDraft, validateMealDraft } = require('../../../utils/admin');
const { adminMeals, uploadMealImage } = require('../../../utils/cloudApi');

function firstMeal(meals) {
  return meals[0] || {
    id: '',
    name: '',
    categoryId: '',
    desc: '',
    image: '',
    requiredLevel: 'basic',
    availableToday: true,
  };
}

Page({
  data: {
    meals: fallbackMeals,
    categories: fallbackCategories,
    memberLevels: fallbackLevels,
    selectedMealId: fallbackMeals[0].id,
    draft: getAdminMealDraft(fallbackMeals, fallbackMeals[0].id),
    feedback: '',
    loading: false,
    uploadingImage: false,
  },

  onShow() {
    if (!ensureAdminAccess(wx, 'meal.manage')) {
      return;
    }
    this.refreshMeals();
  },

  refreshMeals(selectedMealId = this.data.selectedMealId) {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      this.setData({ feedback: '云端餐食暂不可用' });
      return;
    }
    this.setData({ loading: true, feedback: '' });
    adminMeals({ action: 'list' })
      .then((result) => {
        const meals = result.meals || [];
        const selected = meals.find((item) => item.id === selectedMealId) || firstMeal(meals);
        this.setData({
          meals,
          categories: result.categories || [],
          memberLevels: result.memberLevels || [],
          selectedMealId: selected.id,
          draft: { ...selected },
          loading: false,
        });
      })
      .catch((error) => {
        console.error('cloud admin meals failed', error);
        this.setData({ loading: false, feedback: error.message || '餐食加载失败' });
      });
  },

  onSelectMeal(event) {
    const selectedMealId = event.currentTarget.dataset.id;
    this.setData({
      selectedMealId,
      draft: getAdminMealDraft(this.data.meals, selectedMealId),
      feedback: '',
    });
  },

  onNameInput(event) {
    this.setData({ 'draft.name': event.detail.value });
  },

  onCategoryInput(event) {
    this.setData({ 'draft.categoryId': this.data.categories[event.detail.value].id });
  },

  onDescInput(event) {
    this.setData({ 'draft.desc': event.detail.value });
  },

  onImageInput(event) {
    this.setData({ 'draft.image': event.detail.value });
  },

  onLevelChange(event) {
    this.setData({ 'draft.requiredLevel': this.data.memberLevels[event.detail.value].id });
  },

  onChooseImage() {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      this.setData({ feedback: '云存储暂不可用' });
      return;
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (file && file.tempFilePath) {
          this.setData({ uploadingImage: true, feedback: '图片上传中' });
          uploadMealImage(file.tempFilePath)
            .then((uploadResult) => {
              this.setData({
                'draft.image': uploadResult.fileID,
                uploadingImage: false,
                feedback: '图片已上传，保存餐食后生效',
              });
            })
            .catch((error) => {
              console.error('cloud upload meal image failed', error);
              this.setData({
                uploadingImage: false,
                feedback: error.message || '图片上传失败',
              });
            });
        }
      },
    });
  },

  onAvailabilityChange(event) {
    const mealId = event.currentTarget.dataset.id || this.data.draft.id || this.data.selectedMealId;
    const availableToday = event.detail.value;
    adminMeals({ action: 'toggleAvailability', mealId, availableToday })
      .then(() => {
        this.setData({
          selectedMealId: mealId,
          'draft.availableToday': availableToday,
          feedback: availableToday ? '已设为今日上架' : '已设为今日下架',
        });
        this.refreshMeals(mealId);
      })
      .catch((error) => {
        this.setData({ feedback: error.message || '上下架更新失败' });
      });
  },

  onSaveMeal() {
    const validation = validateMealDraft(this.data.draft, this.data.memberLevels, this.data.categories);
    if (!validation.valid) {
      this.setData({ feedback: validation.message });
      return;
    }

    adminMeals({ action: 'update', mealId: this.data.selectedMealId, meal: this.data.draft })
      .then(() => {
        this.setData({ feedback: '餐食信息已保存' });
        this.refreshMeals(this.data.selectedMealId);
      })
      .catch((error) => {
        this.setData({ feedback: error.message || '餐食保存失败' });
      });
  },

  onOpenOrders() {
    wx.navigateTo({ url: '/pages/admin/orders/index' });
  },
});
