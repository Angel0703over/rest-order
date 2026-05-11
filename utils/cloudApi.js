function callCloudFunction(name, data = {}, wxLike = wx) {
  if (!wxLike || !wxLike.cloud || !wxLike.cloud.callFunction) {
    return Promise.reject(new Error('当前环境不支持微信云开发'));
  }

  return wxLike.cloud.callFunction({ name, data }).then((response) => response.result);
}

function padTime(value) {
  return String(value).padStart(2, '0');
}

function buildMealImageCloudPath(filePath, now = () => new Date()) {
  const date = now();
  const timestamp = [
    date.getFullYear(),
    padTime(date.getMonth() + 1),
    padTime(date.getDate()),
    padTime(date.getHours()),
    padTime(date.getMinutes()),
    padTime(date.getSeconds()),
  ].join('');
  const fileName = String(filePath || '').split(/[\\/]/).pop() || 'meal-image.jpg';
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
  return `meal-images/${timestamp}-${safeName}`;
}

function uploadMealImage(filePath, wxLike = wx, now = () => new Date()) {
  if (!wxLike || !wxLike.cloud || !wxLike.cloud.uploadFile) {
    return Promise.reject(new Error('当前环境不支持微信云存储'));
  }
  return wxLike.cloud.uploadFile({
    cloudPath: buildMealImageCloudPath(filePath, now),
    filePath,
  });
}

function loginWithCloud(wxLike = wx) {
  return callCloudFunction('login', {}, wxLike);
}

function getCustomerMenu(memberLevelId, wxLike = wx) {
  return callCloudFunction('getCustomerMenu', { memberLevelId }, wxLike);
}

function getStoreSettings(wxLike = wx) {
  return callCloudFunction('getStoreSettings', {}, wxLike);
}

function getMyMemberProfile(wxLike = wx) {
  return callCloudFunction('getMyMemberProfile', {}, wxLike);
}

function createOrder(orderPayload, wxLike = wx) {
  return callCloudFunction('createOrder', orderPayload, wxLike);
}

function getMyOrders(wxLike = wx) {
  return callCloudFunction('getMyOrders', {}, wxLike);
}

function getStaffOrders(wxLike = wx) {
  return callCloudFunction('getStaffOrders', {}, wxLike);
}

function updateOrderStatus(orderId, status, wxLike = wx) {
  return callCloudFunction('updateOrderStatus', { orderId, status }, wxLike);
}

function adminCategories(payload, wxLike = wx) {
  return callCloudFunction('adminCategories', payload, wxLike);
}

function adminLevels(payload, wxLike = wx) {
  return callCloudFunction('adminLevels', payload, wxLike);
}

function adminMeals(payload, wxLike = wx) {
  return callCloudFunction('adminMeals', payload, wxLike);
}

function adminStaff(payload, wxLike = wx) {
  return callCloudFunction('adminStaff', payload, wxLike);
}

function adminSettings(payload, wxLike = wx) {
  return callCloudFunction('adminSettings', payload, wxLike);
}

module.exports = {
  adminCategories,
  adminLevels,
  adminMeals,
  adminSettings,
  adminStaff,
  buildMealImageCloudPath,
  callCloudFunction,
  createOrder,
  getCustomerMenu,
  getMyMemberProfile,
  getMyOrders,
  getStoreSettings,
  getStaffOrders,
  loginWithCloud,
  updateOrderStatus,
  uploadMealImage,
};
