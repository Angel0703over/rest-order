const { categories: fallbackCategories } = require('../../../data/store');
const { ensureAdminAccess } = require('../../../utils/auth');
const { validateCategoryDraft } = require('../../../utils/admin');
const { adminCategories } = require('../../../utils/cloudApi');

function firstCategory(categories) {
  return categories[0] || { id: '', name: '', sort: 1, enabled: true };
}

Page({
  data: {
    categories: fallbackCategories,
    selectedCategoryId: fallbackCategories[0].id,
    draft: { ...fallbackCategories[0] },
    feedback: '',
    loading: false,
  },

  onShow() {
    if (!ensureAdminAccess(wx, 'menu.manage')) {
      return;
    }
    this.refreshCategories();
  },

  refreshCategories(selectedCategoryId = this.data.selectedCategoryId) {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      this.setData({ feedback: '云端分类暂不可用' });
      return;
    }
    this.setData({ loading: true, feedback: '' });
    adminCategories({ action: 'list' })
      .then((result) => {
        const categories = result.categories || [];
        const selected = categories.find((item) => item.id === selectedCategoryId) || firstCategory(categories);
        this.setData({
          categories,
          selectedCategoryId: selected.id,
          draft: { ...selected },
          loading: false,
        });
      })
      .catch((error) => {
        console.error('cloud admin categories failed', error);
        this.setData({ loading: false, feedback: error.message || '分类加载失败' });
      });
  },

  onSelectCategory(event) {
    const selectedCategoryId = event.currentTarget.dataset.id;
    const category = this.data.categories.find((item) => item.id === selectedCategoryId);
    this.setData({
      selectedCategoryId,
      draft: { ...category },
      feedback: '',
    });
  },

  onNameInput(event) {
    this.setData({ 'draft.name': event.detail.value });
  },

  onCreateCategory() {
    adminCategories({ action: 'create', category: { name: '新分类', sort: this.data.categories.length + 1 } })
      .then((result) => {
        this.setData({ feedback: '分类已新增' });
        this.refreshCategories(result.category.id);
      })
      .catch((error) => {
        this.setData({ feedback: error.message || '分类新增失败' });
      });
  },

  onSaveCategory() {
    const validation = validateCategoryDraft(this.data.draft);
    if (!validation.valid) {
      this.setData({ feedback: validation.message });
      return;
    }
    adminCategories({
      action: 'update',
      categoryId: this.data.selectedCategoryId,
      category: this.data.draft,
    })
      .then(() => {
        this.setData({ feedback: '分类已保存' });
        this.refreshCategories(this.data.selectedCategoryId);
      })
      .catch((error) => {
        this.setData({ feedback: error.message || '分类保存失败' });
      });
  },

  onDeleteCategory() {
    if (this.data.categories.length <= 1) {
      this.setData({ feedback: '至少保留一个分类' });
      return;
    }
    adminCategories({ action: 'delete', categoryId: this.data.selectedCategoryId })
      .then(() => {
        this.setData({ feedback: '分类已删除' });
        this.refreshCategories('');
      })
      .catch((error) => {
        this.setData({ feedback: error.message || '分类删除失败' });
      });
  },
});
