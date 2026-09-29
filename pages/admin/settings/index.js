const { enterAdminPage } = require('../../../utils/auth');
const { adminSettings } = require('../../../utils/cloudApi');
const { defaultStoreSettings, normalizeStoreSettings, validateStoreSettings } = require('../../../utils/settings');

function firstRoom(settings) {
  return settings.locations[0] || { id: '', name: '', sort: 1, enabled: true, tables: [] };
}

function tablesToText(tables) {
  return (tables || []).map((table) => table.name).join('、');
}

function textToTables(text) {
  return String(text || '')
    .split(/[、,\n]/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, index) => ({
      id: String(index + 1),
      name,
      sort: index + 1,
      enabled: true,
    }));
}

Page({
  data: {
    settings: normalizeStoreSettings(defaultStoreSettings),
    selectedRoomId: defaultStoreSettings.locations[0].id,
    roomDraft: { ...defaultStoreSettings.locations[0] },
    tableText: tablesToText(defaultStoreSettings.locations[0].tables),
    loading: false,
    feedback: '',
  },

  onShow() {
    enterAdminPage(this, 'settings.manage', () => this.refreshSettings());
  },

  refreshSettings(selectedRoomId = this.data.selectedRoomId) {
    const app = getApp();
    if (!app.globalData.cloudReady) {
      this.setData({ feedback: '云端门店设置暂不可用' });
      return;
    }
    this.setData({ loading: true, feedback: '' });
    adminSettings({ action: 'get' })
      .then((result) => {
        const settings = normalizeStoreSettings(result.settings);
        const selected = settings.locations.find((room) => room.id === selectedRoomId) || firstRoom(settings);
        this.setData({
          settings,
          selectedRoomId: selected.id,
          roomDraft: { ...selected },
          tableText: tablesToText(selected.tables),
          loading: false,
        });
      })
      .catch((error) => {
        console.error('cloud admin settings failed', error);
        this.setData({ loading: false, feedback: error.message || '门店设置加载失败' });
      });
  },

  onStoreNameInput(event) {
    this.setData({ 'settings.storeName': event.detail.value });
  },

  onOpenChange(event) {
    this.setData({ 'settings.isOpen': event.detail.value });
  },

  onSelectRoom(event) {
    const selectedRoomId = event.currentTarget.dataset.id;
    const room = this.data.settings.locations.find((item) => item.id === selectedRoomId);
    this.setData({
      selectedRoomId,
      roomDraft: { ...room },
      tableText: tablesToText(room.tables),
      feedback: '',
    });
  },

  onRoomNameInput(event) {
    this.setData({ 'roomDraft.name': event.detail.value });
  },

  onRoomEnabledChange(event) {
    this.setData({ 'roomDraft.enabled': event.detail.value });
  },

  onTableTextInput(event) {
    this.setData({ tableText: event.detail.value });
  },

  onCreateRoom() {
    const nextIndex = this.data.settings.locations.length + 1;
    const room = {
      id: `room-${Date.now()}`,
      name: `新区域${nextIndex}`,
      sort: nextIndex,
      enabled: true,
      tables: [{ id: '1', name: '桌号1', sort: 1, enabled: true }],
    };
    this.setData({
      'settings.locations': [...this.data.settings.locations, room],
      selectedRoomId: room.id,
      roomDraft: { ...room },
      tableText: tablesToText(room.tables),
      feedback: '区域已新增，保存后生效',
    });
  },

  applyRoomDraft() {
    const roomDraft = {
      ...this.data.roomDraft,
      name: String(this.data.roomDraft.name || '').trim(),
      tables: textToTables(this.data.tableText),
    };
    if (!roomDraft.name) {
      this.setData({ feedback: '请输入区域名称' });
      return null;
    }
    if (!roomDraft.tables.length) {
      this.setData({ feedback: '请至少填写一个桌号' });
      return null;
    }
    const locations = this.data.settings.locations.map((room) => (
      room.id === this.data.selectedRoomId ? roomDraft : room
    ));
    const settings = { ...this.data.settings, locations };
    this.setData({ settings, roomDraft });
    return settings;
  },

  onSaveSettings() {
    const settings = this.applyRoomDraft();
    if (!settings) {
      return;
    }
    const validation = validateStoreSettings(settings);
    if (!validation.valid) {
      this.setData({ feedback: validation.message });
      return;
    }
    this.setData({ loading: true, feedback: '' });
    adminSettings({ action: 'update', settings })
      .then((result) => {
        this.setData({ feedback: '门店设置已保存', loading: false });
        this.refreshSettings((result.settings && this.data.selectedRoomId) || '');
      })
      .catch((error) => {
        this.setData({ loading: false, feedback: error.message || '门店设置保存失败' });
      });
  },
});
