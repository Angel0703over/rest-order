const { demoMembers, memberLevels: fallbackLevels } = require('../../../data/store');
const { ensureAdminAccess } = require('../../../utils/auth');
const { matchMemberLevelByPoints, searchMembersForLookup } = require('../../../utils/admin');
const { adminMembers } = require('../../../utils/cloudApi');

function firstMember(members) {
  return members[0] || {
    id: '',
    openid: '',
    memberCardNo: '',
    nickname: '',
    phone: '',
    levelId: 'normal',
    levelName: '普通',
    sourceLevelName: '',
    totalPoints: 0,
    availablePoints: 0,
    usedPoints: 0,
    balance: 0,
    totalSpent: 0,
    active: true,
  };
}

function fallbackMembers() {
  return demoMembers.map((member) => {
    const level = fallbackLevels.find((item) => item.id === member.levelId) || fallbackLevels[0];
    return {
      ...member,
      openid: '',
      memberCardNo: member.id,
      active: true,
      levelName: level ? level.name : '',
      totalPoints: 0,
      availablePoints: 0,
      usedPoints: 0,
      balance: 0,
      totalSpent: 0,
    };
  });
}

function buildDraft(member, levels) {
  const totalPoints = Number(member.totalPoints || 0);
  const level = matchMemberLevelByPoints(totalPoints, levels) || levels.find((item) => item.id === member.levelId);
  return {
    ...member,
    totalPoints,
    availablePoints: Number(member.availablePoints || 0),
    usedPoints: Number(member.usedPoints || 0),
    balance: Number(member.balance || 0),
    totalSpent: Number(member.totalSpent || 0),
    levelId: level ? level.id : member.levelId,
    levelName: level ? level.name : member.levelName,
  };
}

function getFilteredMembers(members, keyword) {
  return searchMembersForLookup(members, keyword);
}

Page({
  data: {
    allMembers: fallbackMembers(),
    members: [],
    memberSearchKeyword: '',
    memberLevels: fallbackLevels,
    selectedMemberId: '',
    draft: buildDraft(firstMember([]), fallbackLevels),
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
        const allMembers = result.members || [];
        const members = getFilteredMembers(allMembers, this.data.memberSearchKeyword);
        const memberLevels = result.memberLevels || [];
        const selected = members.find((item) => item.id === selectedMemberId) || firstMember(members);
        this.setData({
          allMembers,
          members,
          memberLevels,
          selectedMemberId: selected.id,
          draft: buildDraft(selected, memberLevels),
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
    const draft = this.data.allMembers.find((member) => member.id === selectedMemberId);
    this.setData({
      selectedMemberId,
      draft: buildDraft(draft, this.data.memberLevels),
      feedback: '',
    });
  },

  onMemberSearchInput(event) {
    const memberSearchKeyword = event.detail.value;
    const members = getFilteredMembers(this.data.allMembers, memberSearchKeyword);
    const selected = members.find((member) => member.id === this.data.selectedMemberId) || firstMember(members);
    this.setData({
      memberSearchKeyword,
      members,
      selectedMemberId: selected.id,
      draft: buildDraft(selected, this.data.memberLevels),
      feedback: '',
    });
  },

  onClearMemberSearch() {
    const members = getFilteredMembers(this.data.allMembers, '');
    const selected = members.find((member) => member.id === this.data.selectedMemberId) || firstMember(members);
    this.setData({
      memberSearchKeyword: '',
      members,
      selectedMemberId: selected.id,
      draft: buildDraft(selected, this.data.memberLevels),
      feedback: '',
    });
  },

  setDraftValue(field, value) {
    this.setData({ [`draft.${field}`]: value });
  },

  setDraftNumber(field, value) {
    this.setDraftValue(field, Number(value || 0));
  },

  onMemberCardInput(event) { this.setDraftValue('memberCardNo', event.detail.value); },
  onNicknameInput(event) { this.setDraftValue('nickname', event.detail.value); },
  onPhoneInput(event) { this.setDraftValue('phone', event.detail.value); },
  onTagInput(event) { this.setDraftValue('tag', event.detail.value); },
  onBirthdayInput(event) { this.setDraftValue('birthday', event.detail.value); },
  onTitleInput(event) { this.setDraftValue('title', event.detail.value); },
  onGroupInput(event) { this.setDraftValue('groupName', event.detail.value); },
  onQqInput(event) { this.setDraftValue('qq', event.detail.value); },
  onWechatInput(event) { this.setDraftValue('wechat', event.detail.value); },
  onEmailInput(event) { this.setDraftValue('email', event.detail.value); },
  onAddressInput(event) { this.setDraftValue('address', event.detail.value); },
  onPreferenceInput(event) { this.setDraftValue('preference', event.detail.value); },
  onRemarkInput(event) { this.setDraftValue('remark', event.detail.value); },
  onOpenidInput(event) { this.setDraftValue('openid', event.detail.value); },
  onStoreInput(event) { this.setDraftValue('storeName', event.detail.value); },
  onPackageInput(event) { this.setDraftValue('packageItems', event.detail.value); },
  onExpiresInput(event) { this.setDraftValue('expiresAt', event.detail.value); },
  onLastConsumeInput(event) { this.setDraftValue('lastConsumeAt', event.detail.value); },
  onBalanceInput(event) { this.setDraftNumber('balance', event.detail.value); },
  onTotalSpentInput(event) { this.setDraftNumber('totalSpent', event.detail.value); },
  onAvailablePointsInput(event) { this.setDraftNumber('availablePoints', event.detail.value); },
  onUsedPointsInput(event) { this.setDraftNumber('usedPoints', event.detail.value); },

  onTotalPointsInput(event) {
    const totalPoints = Number(event.detail.value || 0);
    const level = matchMemberLevelByPoints(totalPoints, this.data.memberLevels);
    this.setData({
      'draft.totalPoints': totalPoints,
      'draft.levelId': level ? level.id : this.data.draft.levelId,
      'draft.levelName': level ? level.name : this.data.draft.levelName,
    });
  },

  onActiveChange(event) {
    this.setDraftValue('active', event.detail.value);
  },

  onCreateMember() {
    adminMembers({
      action: 'create',
      member: {
        memberCardNo: '',
        nickname: '新会员',
        phone: '13800000000',
        totalPoints: 0,
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
