const { demoMembers, memberLevels: fallbackLevels } = require('../../../data/store');
const { ensureAdminAccess } = require('../../../utils/auth');
const { adminMembers } = require('../../../utils/cloudApi');

function firstMember(members) {
  return members[0] || {
    id: '',
    openid: '',
    nickname: '',
    phone: '',
    levelId: 'basic',
    active: true,
  };
}

function fallbackMembers() {
  return demoMembers.map((member) => ({
    ...member,
    openid: '',
    active: true,
    levelName: (fallbackLevels.find((level) => level.id === member.levelId) || {}).name || '',
  }));
}

Page({
  data: {
    members: fallbackMembers(),
    memberLevels: fallbackLevels,
    selectedMemberId: demoMembers[0].id,
    draft: { ...fallbackMembers()[0] },
    feedback: '',
    loading: false,
  },

  onShow() {
    if (!ensureAdminAccess(wx, 'member.manage')) {
      return;
    }
    this.refreshMembers();
  },

  refreshMembers(selectedMemberId = this.data.selectedMemberId) {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      this.setData({ feedback: '云端会员管理暂不可用' });
      return;
    }
    this.setData({ loading: true, feedback: '' });
    adminMembers({ action: 'list' })
      .then((result) => {
        const members = result.members || [];
        const selected = members.find((item) => item.id === selectedMemberId) || firstMember(members);
        this.setData({
          members,
          memberLevels: result.memberLevels || [],
          selectedMemberId: selected.id,
          draft: { ...selected },
          loading: false,
        });
      })
      .catch((error) => {
        console.error('cloud admin members failed', error);
        this.setData({ loading: false, feedback: error.message || '会员加载失败' });
      });
  },

  onSelectMember(event) {
    const selectedMemberId = event.currentTarget.dataset.id;
    const draft = this.data.members.find((member) => member.id === selectedMemberId);
    this.setData({ selectedMemberId, draft: { ...draft }, feedback: '' });
  },

  onNicknameInput(event) {
    this.setData({ 'draft.nickname': event.detail.value });
  },

  onPhoneInput(event) {
    this.setData({ 'draft.phone': event.detail.value });
  },

  onOpenidInput(event) {
    this.setData({ 'draft.openid': event.detail.value });
  },

  onLevelChange(event) {
    const level = this.data.memberLevels[Number(event.detail.value)];
    this.setData({ 'draft.levelId': level.id });
  },

  onActiveChange(event) {
    this.setData({ 'draft.active': event.detail.value });
  },

  onCreateMember() {
    const levelId = this.data.memberLevels[0] ? this.data.memberLevels[0].id : 'basic';
    adminMembers({
      action: 'create',
      member: {
        nickname: '新会员',
        phone: '138****0000',
        levelId,
        openid: '',
        active: true,
      },
    })
      .then((result) => {
        this.setData({ feedback: '会员已新增' });
        this.refreshMembers(result.member.id);
      })
      .catch((error) => {
        this.setData({ feedback: error.message || '会员新增失败' });
      });
  },

  onSaveMember() {
    if (!this.data.draft.nickname || !this.data.draft.nickname.trim()) {
      this.setData({ feedback: '请输入会员姓名' });
      return;
    }
    if (!this.data.draft.phone || !this.data.draft.phone.trim()) {
      this.setData({ feedback: '请输入会员手机号' });
      return;
    }
    adminMembers({
      action: 'update',
      memberId: this.data.selectedMemberId,
      member: this.data.draft,
    })
      .then(() => {
        this.setData({ feedback: '会员已保存' });
        this.refreshMembers(this.data.selectedMemberId);
      })
      .catch((error) => {
        this.setData({ feedback: error.message || '会员保存失败' });
      });
  },

  onDisableMember() {
    adminMembers({ action: 'disable', memberId: this.data.selectedMemberId })
      .then(() => {
        this.setData({ feedback: '会员已停用' });
        this.refreshMembers(this.data.selectedMemberId);
      })
      .catch((error) => {
        this.setData({ feedback: error.message || '会员停用失败' });
      });
  },

  onOpenLevels() {
    wx.navigateTo({ url: '/pages/admin/levels/index' });
  },
});
