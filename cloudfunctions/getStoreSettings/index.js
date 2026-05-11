let cloud = null;

try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (error) {
  cloud = null;
}

const defaultSettings = {
  id: 'store',
  storeName: '会员休息点单',
  isOpen: true,
  locations: [
    { id: 'vip-1', name: 'VIP包厢1', sort: 1, enabled: true, tables: [{ id: '1', name: '桌号1', sort: 1, enabled: true }, { id: '2', name: '桌号2', sort: 2, enabled: true }] },
    { id: 'vip-2', name: 'VIP包厢2', sort: 2, enabled: true, tables: [{ id: '1', name: '桌号1', sort: 1, enabled: true }, { id: '2', name: '桌号2', sort: 2, enabled: true }] },
    { id: 'vip-3', name: 'VIP包厢3', sort: 3, enabled: true, tables: [{ id: '1', name: '桌号1', sort: 1, enabled: true }, { id: '2', name: '桌号2', sort: 2, enabled: true }] },
    { id: 'lash-1', name: '美睫房1', sort: 4, enabled: true, tables: [{ id: '1', name: '桌号1', sort: 1, enabled: true }, { id: '2', name: '桌号2', sort: 2, enabled: true }] },
    { id: 'lash-2', name: '美睫房2', sort: 5, enabled: true, tables: [{ id: '1', name: '桌号1', sort: 1, enabled: true }, { id: '2', name: '桌号2', sort: 2, enabled: true }] },
    { id: 'sofa', name: '沙发区', sort: 6, enabled: true, tables: [{ id: '1', name: '桌号1', sort: 1, enabled: true }, { id: '2', name: '桌号2', sort: 2, enabled: true }] },
  ],
};

function getDatabase(context) {
  if (context && Object.prototype.hasOwnProperty.call(context, 'db')) return context.db;
  if (cloud && cloud.database) return cloud.database();
  return null;
}

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

function normalizeLocations(locations = []) {
  return locations
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

function normalizeSettings(settings) {
  const source = settings || defaultSettings;
  const normalized = {
    id: source.id || source._id || 'store',
    storeName: String(source.storeName || source.name || defaultSettings.storeName).trim(),
    isOpen: source.isOpen !== false,
    locations: normalizeLocations(source.locations || defaultSettings.locations),
  };
  if (!normalized.locations.length) {
    normalized.locations = normalizeLocations(defaultSettings.locations);
  }
  return normalized;
}

async function main(event = {}, context = {}) {
  const db = getDatabase(context);
  if (!db) {
    return { settings: normalizeSettings(defaultSettings), source: 'default' };
  }
  try {
    const result = await db.collection('settings').doc('store').get();
    return { settings: normalizeSettings(result && result.data), source: 'database' };
  } catch (error) {
    return { settings: normalizeSettings(defaultSettings), source: 'default' };
  }
}

exports.main = main;
