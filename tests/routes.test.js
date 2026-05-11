const assert = require('node:assert/strict');
const {
  CUSTOMER_ENTRY_PAGE,
  ADMIN_ENTRY_PAGE,
  STAFF_ENTRY_PAGE,
  getEntryPageForRole,
  getEntryPages,
} = require('../utils/routes');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test('顾客扫码入口和店长入口分离', () => {
  assert.equal(CUSTOMER_ENTRY_PAGE, '/pages/index/index');
  assert.equal(ADMIN_ENTRY_PAGE, '/pages/admin/home/index');
  assert.equal(STAFF_ENTRY_PAGE, '/pages/staff/home/index');
  assert.deepEqual(getEntryPages(), {
    customer: CUSTOMER_ENTRY_PAGE,
    owner: ADMIN_ENTRY_PAGE,
    staff: STAFF_ENTRY_PAGE,
  });
  assert.equal(getEntryPageForRole('customer'), CUSTOMER_ENTRY_PAGE);
  assert.equal(getEntryPageForRole('owner'), ADMIN_ENTRY_PAGE);
  assert.equal(getEntryPageForRole('staff'), STAFF_ENTRY_PAGE);
});
