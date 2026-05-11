const assert = require('node:assert/strict');
const { categories, memberLevels, meals } = require('../data/store');
const {
  createStaff,
  createCategory,
  deleteStaff,
  deleteCategory,
  getAdminLevelDraft,
  getAdminMealDraft,
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

  assert.deepEqual(nextLevels.map((level) => level.id), ['basic', 'silver', 'gold', 'diamond']);
  assert.equal(nextLevels.find((level) => level.id === 'silver').name, '白银会员');
  assert.equal(nextLevels.find((level) => level.id === 'basic').name, '基础会员');
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
