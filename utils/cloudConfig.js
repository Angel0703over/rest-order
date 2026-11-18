const CLOUD_ENV_ID = 'cloudbase-d2g0kjsu2c08941b9';

// 本地调试开关：仅在「需要固定停留在顾客页」时改为 true（例如只调试顾客端 UI）。
// 打开后店长/员工登录不会跳转到各自入口，三端登录验证必须保持 false。
const FORCE_CUSTOMER_ENTRY_OVERRIDE = false;

// 店长/员工用自己的微信号代顾客下单（走一遍顾客下单链路）的开关，仅开发版生效。
const ALLOW_OWNER_CUSTOMER_ORDER = true;

/**
 * 读取小程序运行版本：develop（开发版）/ trial（体验版）/ release（正式版）。
 * Node 测试环境没有 wx，返回空字符串。
 */
function getEnvVersion() {
  try {
    if (typeof wx === 'undefined' || typeof wx.getAccountInfoSync !== 'function') {
      return '';
    }
    const info = wx.getAccountInfoSync();
    return (info && info.miniProgram && info.miniProgram.envVersion) || '';
  } catch (error) {
    return '';
  }
}

/**
 * 是否抑制「顾客页 → 店长/员工入口」的自动跳转。
 * 只有显式打开 override 且处于开发版时才生效，体验版/正式版一律放行。
 */
function isForceCustomerEntryEnabled(envVersion = getEnvVersion()) {
  if (!FORCE_CUSTOMER_ENTRY_OVERRIDE) {
    return false;
  }
  return envVersion === 'develop';
}

/**
 * 是否允许店长/员工代顾客下单，仅开发版（或无运行环境信息时）开放。
 */
function isOwnerCustomerOrderAllowed(envVersion = getEnvVersion()) {
  if (!ALLOW_OWNER_CUSTOMER_ORDER) {
    return false;
  }
  return !envVersion || envVersion === 'develop';
}

function isCloudEnvConfigured(envId = CLOUD_ENV_ID) {
  return Boolean(envId && envId !== 'replace-with-your-cloud-env-id');
}

module.exports = {
  CLOUD_ENV_ID,
  DEV_ALLOW_OWNER_CUSTOMER_ORDER: isOwnerCustomerOrderAllowed(),
  DEV_FORCE_CUSTOMER_ENTRY: isForceCustomerEntryEnabled(),
  getEnvVersion,
  isCloudEnvConfigured,
  isForceCustomerEntryEnabled,
  isOwnerCustomerOrderAllowed,
};
