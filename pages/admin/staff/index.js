const { staffMembers: fallbackStaffMembers } = require('../../../data/users');
const { ensureAdminAccess } = require('../../../utils/auth');
const { getStaffDraft, validateStaffDraft } = require('../../../utils/admin');
const { adminStaff } = require('../../../utils/cloudApi');

function firstStaff(staffMembers) {
  return staffMembers[0] || {
    id: '',
    role: 'staff',
    name: '',
    phone: '',
    title: '',
    active: true,
  };
}

Page({
  data: {
    staffMembers: fallbackStaffMembers,
    selectedStaffId: fallbackStaffMembers[0].id,
    draft: getStaffDraft(fallbackStaffMembers, fallbackStaffMembers[0].id),
    feedback: '',
    loading: false,
  },

  onShow() {
    if (!ensureAdminAccess(wx, 'staff.manage')) {
      return;
    }
    this.refreshStaff();
  },

  refreshStaff(selectedStaffId = this.data.selectedStaffId) {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      this.setData({ feedback: '云端员工管理暂不可用' });
      return;
    }
    this.setData({ loading: true, feedback: '' });
    adminStaff({ action: 'list' })
      .then((result) => {
        const staffMembers = result.staffMembers || [];
        const selected = staffMembers.find((item) => item.id === selectedStaffId) || firstStaff(staffMembers);
        this.setData({
          staffMembers,
          selectedStaffId: selected.id,
          draft: { ...selected },
          loading: false,
        });
      })
      .catch((error) => {
        console.error('cloud admin staff failed', error);
        this.setData({ loading: false, feedback: error.message || '员工加载失败' });
      });
  },

  onSelectStaff(event) {
    const selectedStaffId = event.currentTarget.dataset.id;
    const draft = getStaffDraft(this.data.staffMembers, selectedStaffId);
    this.setData({
      selectedStaffId,
      draft,
      feedback: '',
    });
  },

  onNameInput(event) {
    this.setData({ 'draft.name': event.detail.value });
  },

  onPhoneInput(event) {
    this.setData({ 'draft.phone': event.detail.value });
  },

  onTitleInput(event) {
    this.setData({ 'draft.title': event.detail.value });
  },

  onActiveChange(event) {
    if (this.data.draft.role === 'owner') {
      return;
    }
    this.setData({ 'draft.active': event.detail.value });
  },

  onCreateStaff() {
    adminStaff({
      action: 'create',
      staff: {
        name: '新店员',
        phone: '13800000000',
        title: '店员',
      },
    })
      .then((result) => {
        this.setData({ feedback: '员工已新增' });
        this.refreshStaff(result.staff.id);
      })
      .catch((error) => {
        this.setData({ feedback: error.message || '员工新增失败' });
      });
  },

  onSaveStaff() {
    if (this.data.draft.role === 'owner') {
      this.setData({ feedback: '店长账号不能在这里修改' });
      return;
    }
    const validation = validateStaffDraft(this.data.draft);
    if (!validation.valid) {
      this.setData({ feedback: validation.message });
      return;
    }
    adminStaff({
      action: 'update',
      staffId: this.data.selectedStaffId,
      staff: this.data.draft,
    })
      .then(() => {
        this.setData({ feedback: '员工已保存' });
        this.refreshStaff(this.data.selectedStaffId);
      })
      .catch((error) => {
        this.setData({ feedback: error.message || '员工保存失败' });
      });
  },

  onDeleteStaff() {
    if (this.data.draft.role === 'owner') {
      this.setData({ feedback: '店长账号不能停用' });
      return;
    }
    adminStaff({ action: 'disable', staffId: this.data.selectedStaffId })
      .then(() => {
        this.setData({ feedback: '员工已停用' });
        this.refreshStaff(this.data.selectedStaffId);
      })
      .catch((error) => {
        this.setData({ feedback: error.message || '员工停用失败' });
      });
  },
});
