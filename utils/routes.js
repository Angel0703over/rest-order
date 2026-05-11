const CUSTOMER_ENTRY_PAGE = '/pages/index/index';
const ADMIN_ENTRY_PAGE = '/pages/admin/home/index';
const STAFF_ENTRY_PAGE = '/pages/staff/home/index';

function getEntryPages() {
  return {
    customer: CUSTOMER_ENTRY_PAGE,
    owner: ADMIN_ENTRY_PAGE,
    staff: STAFF_ENTRY_PAGE,
  };
}

function getEntryPageForRole(role) {
  return getEntryPages()[role] || CUSTOMER_ENTRY_PAGE;
}

module.exports = {
  CUSTOMER_ENTRY_PAGE,
  ADMIN_ENTRY_PAGE,
  STAFF_ENTRY_PAGE,
  getEntryPageForRole,
  getEntryPages,
};
