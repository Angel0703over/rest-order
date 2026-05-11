const { locations } = require('../data/store');

const defaultStoreSettings = {
  id: 'store',
  storeName: '会员休息点单',
  isOpen: true,
  locations: locations.map((room, roomIndex) => ({
    id: room.id,
    name: room.name,
    sort: roomIndex + 1,
    enabled: true,
    tables: room.tables.map((table, tableIndex) => ({
      id: table.id,
      name: table.name,
      sort: tableIndex + 1,
      enabled: true,
    })),
  })),
};

function normalizeId(item, fallbackId) {
  return String((item && (item.id || item._id)) || fallbackId);
}

function normalizeTables(tables = []) {
  return tables
    .map((table, index) => ({
      id: normalizeId(table, String(index + 1)),
      name: String((table && table.name) || `桌号${index + 1}`).trim(),
      sort: Number((table && table.sort) || index + 1),
      enabled: !table || table.enabled !== false,
    }))
    .filter((table) => table.enabled && table.name)
    .sort((left, right) => left.sort - right.sort);
}

function normalizeLocations(sourceLocations = []) {
  return sourceLocations
    .map((room, index) => ({
      id: normalizeId(room, `room-${index + 1}`),
      name: String((room && room.name) || `区域${index + 1}`).trim(),
      sort: Number((room && room.sort) || index + 1),
      enabled: !room || room.enabled !== false,
      tables: normalizeTables((room && room.tables) || []),
    }))
    .filter((room) => room.enabled && room.name && room.tables.length > 0)
    .sort((left, right) => left.sort - right.sort);
}

function normalizeStoreSettings(settings) {
  const source = settings || defaultStoreSettings;
  const normalized = {
    id: source.id || source._id || 'store',
    storeName: String(source.storeName || source.name || defaultStoreSettings.storeName).trim(),
    isOpen: source.isOpen !== false,
    locations: normalizeLocations(source.locations || defaultStoreSettings.locations),
  };
  if (!normalized.locations.length) {
    normalized.locations = normalizeLocations(defaultStoreSettings.locations);
  }
  return normalized;
}

function validateStoreSettings(settings) {
  const current = normalizeStoreSettings(settings);
  if (!current.storeName) {
    return { valid: false, message: '请输入门店名称' };
  }
  if (!current.locations.length) {
    return { valid: false, message: '至少保留一个可用区域' };
  }
  if (current.locations.some((room) => !room.tables.length)) {
    return { valid: false, message: '每个区域至少需要一个桌号' };
  }
  return { valid: true, message: '' };
}

module.exports = {
  defaultStoreSettings,
  normalizeStoreSettings,
  validateStoreSettings,
};
