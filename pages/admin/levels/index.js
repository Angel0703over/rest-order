const { memberLevels: fallbackLevels } = require('../../../data/store');
const { ensureAdminAccess } = require('../../../utils/auth');
const { getAdminLevelDraft, validateMemberLevelDraft } = require('../../../utils/admin');
const { adminLevels } = require('../../../utils/cloudApi');

function firstLevel(levels) {
  return levels[0] || { id: '', name: '', note: '', color: '#6f7f8f', rank: 1, enabled: true };
}

Page({
  data: {
    levels: fallbackLevels,
    selectedLevelId: fallbackLevels[0].id,
    draft: getAdminLevelDraft(fallbackLevels, fallbackLevels[0].id),
    feedback: '',
    loading: false,
  },

  onShow() {
    if (!ensureAdminAccess(wx, 'member.manage')) {
      return;
    }
    this.refreshLevels();
  },

  refreshLevels(selectedLevelId = this.data.selectedLevelId) {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      this.setData({ feedback: '云端会员等级暂不可用' });
      return;
    }
    this.setData({ loading: true, feedback: '' });
    adminLevels({ action: 'list' })
      .then((result) => {
        const levels = result.levels || [];
        const selected = levels.find((item) => item.id === selectedLevelId) || firstLevel(levels);
        this.setData({
          levels,
          selectedLevelId: selected.id,
          draft: { ...selected },
          loading: false,
        });
      })
      .catch((error) => {
        console.error('cloud admin levels failed', error);
        this.setData({ loading: false, feedback: error.message || '会员等级加载失败' });
      });
  },

  onSelectLevel(event) {
    const selectedLevelId = event.currentTarget.dataset.id;
    this.setData({
      selectedLevelId,
      draft: getAdminLevelDraft(this.data.levels, selectedLevelId),
      feedback: '',
    });
  },

  onNameInput(event) {
    this.setData({ 'draft.name': event.detail.value });
  },

  onNoteInput(event) {
    this.setData({ 'draft.note': event.detail.value });
  },

  onColorInput(event) {
    this.setData({ 'draft.color': event.detail.value });
  },

  onSaveLevel() {
    const validation = validateMemberLevelDraft(this.data.draft);
    if (!validation.valid) {
      this.setData({ feedback: validation.message });
      return;
    }

    adminLevels({
      action: 'update',
      levelId: this.data.selectedLevelId,
      level: this.data.draft,
    })
      .then(() => {
        this.setData({ feedback: '会员等级已保存' });
        this.refreshLevels(this.data.selectedLevelId);
      })
      .catch((error) => {
        this.setData({ feedback: error.message || '会员等级保存失败' });
      });
  },

  onOpenMeals() {
    wx.navigateTo({ url: '/pages/admin/meals/index' });
  },
});
