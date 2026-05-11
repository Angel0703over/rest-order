const CLOUD_ENV_ID = 'cloudbase-d2g0kjsu2c08941b9';
const DEV_FORCE_CUSTOMER_ENTRY = true;

function isCloudEnvConfigured(envId = CLOUD_ENV_ID) {
  return Boolean(envId && envId !== 'replace-with-your-cloud-env-id');
}

module.exports = {
  CLOUD_ENV_ID,
  DEV_FORCE_CUSTOMER_ENTRY,
  isCloudEnvConfigured,
};
