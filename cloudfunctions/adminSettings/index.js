let cloud = null;

try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (error) {
  cloud = null;
}

const defaultLocations = [
  { id: 'vip-1', name: 'VIP包厢1', sort: 1, enabled: true, tables: [{ id: '1', name: '桌号1', sort: 1, enabled: true }, { id: '2', name: '桌号2', sort: 2, enabled: true }] },
  { id: 'vip-2', name: 'VIP包厢2', sort: 2, enabled: true, tables: [{ id: '1', name: '桌号1', sort: 1, enabled: true }, { id: '2', name: '桌号2', sort: 2, enabled: true }] },
  { id: 'vip-3', name: 'VIP包厢3', sort: 3, enabled: true, tables: [{ id: '1', name: '桌号1', sort: 1, enabled: true }, { id: '2', name: '桌号2', sort: 2, enabled: true }] },
  { id: 'lash-1', name: '美睫房1', sort: 4, enabled: true, tables: [{ id: '1', name: '桌号1', sort: 1, enabled: true }, { id: '2', name: '桌号2', sort: 2, enabled: true }] },
  { id: 'lash-2', name: '美睫房2', sort: 5, enabled: true, tables: [{ id: '1', name: '桌号1', sort: 1, enabled: true }, { id: '2', name: '桌号2', sort: 2, enabled: true }] },
  { id: 'sofa', name: '沙发区', sort: 6, enabled: true, tables: [{ id: '1', name: '桌号1', sort: 1, enabled: true }, { id: '2', name: '桌号2', sort: 2, enabled: true }] },
];

function getDatabase(context) {
  if (context && Object.prototype.hasOwnProperty.call(context, 'db')) return context.db;
  if (cloud && cloud.database) return cloud.database();
  return null;
}

async function getOpenid(context) {
  if (context && context.OPENID) return context.OPENID;
  if (cloud && cloud.getWXContext) return cloud.getWXContext().OPENID;
  return '';
}

function nowText(context) {
  const now = context && typeof context.now === 'function' ? context.now() : new Date();
  return now.toLocaleString('zh-CN', { hour12: false });
}

async function assertOwner(db, openid) {
  if (!db || !openid) throw new Error('无法识别微信用户');
  const result = await db.collection('users').where({ openid }).limit(1).get();
  const user = result && result.data && result.data[0];
  if (!user || user.role !== 'owner') throw new Error('只有店长可以维护门店设置');
  return user;
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
    .filter((table) => table.name)
    .sort((left, right) => left.sort - right.sort);
}

function normalizeLocations(locations = defaultLocations) {
  return locations
    .map((room, index) => ({
      id: normalizeId(room, `room-${index + 1}`),
      name: String((room && room.name) || `区域${index + 1}`).trim(),
      sort: Number((room && room.sort) || index + 1),
      enabled: !room || room.enabled !== false,
      tables: normalizeTables((room && room.tables) || []),
    }))
    .filter((room) => room.name && room.tables.length > 0)
    .sort((left, right) => left.sort - right.sort);
}

function normalizeSettings(settings = {}) {
  return {
    id: 'store',
    storeName: String(settings.storeName || settings.name || '会员休息点单').trim(),
    isOpen: settings.isOpen !== false,
    locations: normalizeLocations(settings.locations || defaultLocations),
  };
}

function validateSettings(settings) {
  if (!settings.storeName) throw new Error('请输入门店名称');
  if (!settings.locations.length) throw new Error('至少保留一个区域');
  if (settings.locations.some((room) => !room.tables.length)) throw new Error('每个区域至少需要一个桌号');
}

async function readSettings(db) {
  try {
    const result = await db.collection('settings').doc('store').get();
    return normalizeSettings(result && result.data);
  } catch (error) {
    return normalizeSettings();
  }
}

async function main(event = {}, context = {}) {
  const db = getDatabase(context);
  const openid = await getOpenid(context);
  await assertOwner(db, openid);

  const action = event.action || 'get';
  if (action === 'get') {
    return { settings: await readSettings(db) };
  }

  if (action === 'update') {
    const settings = normalizeSettings(event.settings || {});
    validateSettings(settings);
    const data = {
      storeName: settings.storeName,
      isOpen: settings.isOpen,
      locations: settings.locations,
      updatedAt: nowText(context),
    };
    await db.collection('settings').doc('store').update({ data });
    return { ok: true, settings: { ...settings, updatedAt: data.updatedAt } };
  }

  throw new Error('未知门店设置操作');
}

exports.main = main;
