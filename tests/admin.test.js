const assert = require('node:assert/strict');
const { categories, memberLevels, meals } = require('../data/store');
const {
  createStaff,
  createCategory,
  deleteStaff,
  deleteCategory,
  filterMembers,
  searchMembersForLookup,
  getAdminLevelDraft,
  getAdminMealDraft,
  getMealImageLabel,
  matchMemberLevelByPoints,
  normalizeExcelMemberRow,
  getStaffDraft,
  toggleMealAvailability,
  updateCategory,
  updateMemberLevel,
  updateMeal,
  updateStaff,
  validateCategoryDraft,
  validateMemberLevelDraft,
  validateMealDraft,
  validateStaffDraft,
} = require('../utils/admin');
const { staffMembers } = require('../data/users');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test('店长编辑会员等级时会生成独立草稿', () => {
  const draft = getAdminLevelDraft(memberLevels, 'gold');

  assert.deepEqual(draft, memberLevels.find((level) => level.id === 'gold'));
  assert.notEqual(draft, memberLevels.find((level) => level.id === 'gold'));
});

test('分类草稿必须有名称', () => {
  assert.deepEqual(validateCategoryDraft({ name: '' }), {
    valid: false,
    message: '请输入分类名称',
  });
  assert.deepEqual(validateCategoryDraft({ name: '新品' }), {
    valid: true,
    message: '',
  });
});

test('店长可以新增、修改、删除分类', () => {
  const created = createCategory(categories, { name: '新品' });
  const newCategory = created[created.length - 1];
  assert.equal(newCategory.name, '新品');

  const updated = updateCategory(created, newCategory.id, { name: '限时' });
  assert.equal(updated.find((category) => category.id === newCategory.id).name, '限时');

  const deleted = deleteCategory(updated, newCategory.id);
  assert.equal(deleted.some((category) => category.id === newCategory.id), false);
});

test('员工草稿必须包含姓名、手机号和岗位', () => {
  assert.deepEqual(validateStaffDraft({ name: '', phone: '13800000000', title: '美睫师' }), {
    valid: false,
    message: '请输入员工姓名',
  });
  assert.deepEqual(validateStaffDraft({ name: '小周', phone: '', title: '美睫师' }), {
    valid: false,
    message: '请输入员工手机号',
  });
  assert.deepEqual(validateStaffDraft({ name: '小周', phone: '13800000000', title: '' }), {
    valid: false,
    message: '请输入员工岗位',
  });
  assert.deepEqual(validateStaffDraft({ name: '小周', phone: '13800000000', title: '美睫师' }), {
    valid: true,
    message: '',
  });
});

test('店长可以新增、编辑、停用和删除店员', () => {
  const created = createStaff(staffMembers, {
    name: '小周',
    phone: '13800000000',
    title: '美睫师',
  });
  const newStaff = created[created.length - 1];

  assert.equal(newStaff.role, 'staff');
  assert.equal(newStaff.active, true);
  assert.equal(newStaff.name, '小周');
  assert.notEqual(getStaffDraft(created, newStaff.id), newStaff);

  const updated = updateStaff(created, newStaff.id, {
    name: '周姐',
    phone: '13900000000',
    title: '前台',
    active: false,
  });
  assert.equal(updated.find((staff) => staff.id === newStaff.id).name, '周姐');
  assert.equal(updated.find((staff) => staff.id === newStaff.id).active, false);

  const deleted = deleteStaff(updated, newStaff.id);
  assert.equal(deleted.some((staff) => staff.id === newStaff.id), false);
});

test('会员等级草稿必须有名称、权益说明和正确颜色', () => {
  assert.deepEqual(validateMemberLevelDraft({ name: '', note: '权益', color: '#ffffff' }), {
    valid: false,
    message: '请输入会员等级名称',
  });
  assert.deepEqual(validateMemberLevelDraft({ name: '黑金会员', note: '', color: '#ffffff' }), {
    valid: false,
    message: '请输入会员权益说明',
  });
  assert.deepEqual(validateMemberLevelDraft({ name: '黑金会员', note: '全量权益', color: 'gold' }), {
    valid: false,
    message: '请输入正确的颜色值',
  });
  assert.deepEqual(validateMemberLevelDraft({ name: '黑金会员', note: '全量权益', color: '#111111' }), {
    valid: true,
    message: '',
  });
});

test('保存会员等级只更新目标等级并保留排序', () => {
  const nextLevels = updateMemberLevel(memberLevels, 'silver', {
    name: '白银会员',
    note: '可享咖啡和轻食',
    color: '#8899aa',
  });

  assert.deepEqual(nextLevels.map((level) => level.id), ['normal', 'basic', 'silver', 'gold', 'diamond', 'special']);
  assert.equal(nextLevels.find((level) => level.id === 'silver').name, '白银会员');
  assert.equal(nextLevels.find((level) => level.id === 'basic').name, '普通会员');
  assert.throws(
    () => updateMemberLevel(memberLevels, 'silver', { name: '', note: '权益', color: '#ffffff' }),
    /请输入会员等级名称/
  );
});

test('店长编辑餐食时会生成独立草稿', () => {
  const draft = getAdminMealDraft(meals, 'm301');

  assert.deepEqual(draft, meals.find((meal) => meal.id === 'm301'));
  assert.notEqual(draft, meals.find((meal) => meal.id === 'm301'));
});

test('餐食草稿必须包含名称、分类、描述、图片和有效会员等级', () => {
  const validDraft = {
    name: '燕麦拿铁',
    categoryId: 'drinks',
    desc: '适合休息时饮用。',
    image: '/assets/meal-latte.svg',
    requiredLevel: 'silver',
  };

  assert.deepEqual(validateMealDraft({ ...validDraft, name: '' }, memberLevels), {
    valid: false,
    message: '请输入餐食名称',
  });
  assert.deepEqual(validateMealDraft({ ...validDraft, categoryId: '' }, memberLevels, categories), {
    valid: false,
    message: '请输入餐食分类',
  });
  assert.deepEqual(validateMealDraft({ ...validDraft, desc: '' }, memberLevels, categories), {
    valid: false,
    message: '请输入餐食描述',
  });
  assert.deepEqual(validateMealDraft({ ...validDraft, image: '' }, memberLevels, categories), {
    valid: false,
    message: '请输入餐食图片路径',
  });
  assert.deepEqual(validateMealDraft({ ...validDraft, requiredLevel: 'vip' }, memberLevels, categories), {
    valid: false,
    message: '请选择有效的适用会员等级',
  });
  assert.deepEqual(validateMealDraft({ ...validDraft, categoryId: 'missing' }, memberLevels, categories), {
    valid: false,
    message: '请选择有效的餐食分类',
  });
  assert.deepEqual(validateMealDraft(validDraft, memberLevels, categories), {
    valid: true,
    message: '',
  });
});

test('保存餐食只更新目标餐食并保留列表顺序', () => {
  const nextMeals = updateMeal(meals, 'm201', {
    name: '燕麦拿铁',
    categoryId: 'drinks',
    desc: '温热顺滑，适合护理后饮用。',
    image: '/assets/meal-latte.svg',
    requiredLevel: 'gold',
  }, memberLevels, categories);

  assert.deepEqual(nextMeals.map((meal) => meal.id), meals.map((meal) => meal.id));
  assert.equal(nextMeals.find((meal) => meal.id === 'm201').name, '燕麦拿铁');
  assert.equal(nextMeals.find((meal) => meal.id === 'm201').requiredLevel, 'gold');
  assert.equal(nextMeals.find((meal) => meal.id === 'm101').name, '舒缓花茶');
  assert.throws(
    () => updateMeal(meals, 'm201', { name: '', categoryId: 'drinks', desc: '描述', image: '/assets/meal.svg', requiredLevel: 'basic' }, memberLevels, categories),
    /请输入餐食名称/
  );
});

test('店长可以切换餐食每日上下架并保留列表顺序', () => {
  const nextMeals = toggleMealAvailability(meals, 'm101', false);

  assert.deepEqual(nextMeals.map((meal) => meal.id), meals.map((meal) => meal.id));
  assert.equal(nextMeals.find((meal) => meal.id === 'm101').availableToday, false);
  assert.equal(nextMeals.find((meal) => meal.id === 'm102').availableToday, true);

  const restoredMeals = toggleMealAvailability(nextMeals, 'm101', true);
  assert.equal(restoredMeals.find((meal) => meal.id === 'm101').availableToday, true);
});
test('meal image status hides the raw storage path', () => {
  assert.equal(getMealImageLabel('cloud://env/meal-images/tea.png'), '已上传云端图片');
  assert.equal(getMealImageLabel('/assets/meal-tea.svg'), '默认图片');
  assert.equal(getMealImageLabel(''), '未选择图片');
});

test('member level is matched from total points ranges', () => {
  const levels = [
    { id: 'normal', name: '普通', rank: 1, minPoints: 0, maxPoints: 1 },
    { id: 'basic', name: '普通会员', rank: 2, minPoints: 2, maxPoints: 1000 },
    { id: 'silver', name: '银卡会员', rank: 3, minPoints: 1001, maxPoints: 2000 },
    { id: 'gold', name: '金卡会员', rank: 4, minPoints: 2001, maxPoints: 3000 },
    { id: 'diamond', name: '钻石会员', rank: 5, minPoints: 3001, maxPoints: 4000 },
    { id: 'special', name: '特级会员', rank: 6, minPoints: 4001, maxPoints: 6000 },
  ];

  assert.equal(matchMemberLevelByPoints(0, levels).id, 'normal');
  assert.equal(matchMemberLevelByPoints(1000, levels).id, 'basic');
  assert.equal(matchMemberLevelByPoints(2001, levels).id, 'gold');
  assert.equal(matchMemberLevelByPoints(6001, levels).id, 'special');
});

test('excel member row is normalized to cloud member fields', () => {
  const levels = [
    { id: 'normal', name: '普通', rank: 1, minPoints: 0, maxPoints: 1 },
    { id: 'basic', name: '普通会员', rank: 2, minPoints: 2, maxPoints: 1000 },
  ];
  const member = normalizeExcelMemberRow({
    '会员卡号': '3341',
    '会员姓名': '徐曼',
    '会员手机号': '15162965666',
    '级别名称': '普通会员',
    '可用金额': '860.96',
    '累计消费金额': '139.04',
    '可用积分': '0',
    '累计积分': '0',
    '已使用积分': '0',
    '添加时间': '2026-05-08 15:36:48',
    '会员过期时间': '9999-12-31 00:00:00',
    '属于店铺': '日式美甲沙龙',
    '最后消费时间': '2026-05-08 15:37:24',
  }, levels);

  assert.equal(member._id, 'member-3341');
  assert.equal(member.memberCardNo, '3341');
  assert.equal(member.nickname, '徐曼');
  assert.equal(member.phone, '15162965666');
  assert.equal(member.levelId, 'normal');
  assert.equal(member.sourceLevelName, '普通会员');
  assert.equal(member.balance, 860.96);
  assert.equal(member.totalSpent, 139.04);
  assert.equal(member.storeName, '日式美甲沙龙');
});
test('admin members can be filtered by phone name or card number', () => {
  const members = [
    { id: 'u1', memberCardNo: '3341', nickname: 'Xu Man', phone: '15162965666' },
    { id: 'u2', memberCardNo: '3342', nickname: 'Ellise', phone: '15162963961' },
    { id: 'u3', memberCardNo: '9910', nickname: 'Qin Qing', phone: '13371866862' },
  ];

  assert.deepEqual(filterMembers(members, '').map((member) => member.id), ['u1', 'u2', 'u3']);
  assert.deepEqual(filterMembers(members, '6566').map((member) => member.id), ['u1']);
  assert.deepEqual(filterMembers(members, 'ell').map((member) => member.id), ['u2']);
  assert.deepEqual(filterMembers(members, '9910').map((member) => member.id), ['u3']);
  assert.deepEqual(filterMembers(members, 'no-match').map((member) => member.id), []);
});

test('admin member lookup stays empty until a search keyword is entered', () => {
  const members = [
    { id: 'u1', memberCardNo: '3341', nickname: 'Xu Man', phone: '15162965666' },
    { id: 'u2', memberCardNo: '3342', nickname: 'Ellise', phone: '15162963961' },
  ];

  assert.deepEqual(searchMembersForLookup(members, ''), []);
  assert.deepEqual(searchMembersForLookup(members, '   '), []);
  assert.deepEqual(searchMembersForLookup(members, '3342').map((member) => member.id), ['u2']);
});
