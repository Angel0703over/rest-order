const CURRENT_USER_STORAGE_KEY = 'beauty_rest_current_user_id';

const mockUsers = [
  {
    id: 'customer-lin',
    openid: 'mock-openid-customer-lin',
    role: 'customer',
    memberId: 'u1001',
    name: '林小姐',
  },
  {
    id: 'staff-owner',
    openid: 'mock-openid-staff-owner',
    role: 'owner',
    staffId: 's1001',
    name: '店长',
  },
  {
    id: 'staff-assistant',
    openid: 'mock-openid-staff-assistant',
    role: 'staff',
    staffId: 's1002',
    name: '陈小妹',
  },
];

const staffMembers = [
  {
    id: 's1001',
    userId: 'staff-owner',
    role: 'owner',
    name: '店长',
    phone: '13900001111',
    title: '店长',
    active: true,
  },
  {
    id: 's1002',
    userId: 'staff-assistant',
    role: 'staff',
    name: '陈小妹',
    phone: '13900002222',
    title: '美睫师',
    active: true,
  },
];

const defaultUserId = 'customer-lin';

module.exports = {
  CURRENT_USER_STORAGE_KEY,
  defaultUserId,
  mockUsers,
  staffMembers,
};
