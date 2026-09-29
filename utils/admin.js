function getAdminLevelDraft(levels, levelId) {
  const level = levels.find((item) => item.id === levelId);
  return level ? { ...level } : null;
}

function validateMemberLevelDraft(draft) {
  if (!draft.name || !draft.name.trim()) {
    return { valid: false, message: '请输入会员等级名称' };
  }
  if (!draft.note || !draft.note.trim()) {
    return { valid: false, message: '请输入会员权益说明' };
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(draft.color || '')) {
    return { valid: false, message: '请输入正确的颜色值' };
  }
  if (toNumber(draft.minPoints, -1) < 0 || toNumber(draft.maxPoints, -1) < toNumber(draft.minPoints, 0)) {
    return { valid: false, message: '请输入正确的积分区间' };
  }
  return { valid: true, message: '' };
}

function updateMemberLevel(levels, levelId, draft) {
  const validation = validateMemberLevelDraft(draft);
  if (!validation.valid) {
    throw new Error(validation.message);
  }
  return levels.map((level) => {
    if (level.id !== levelId) {
      return level;
    }
    return {
      ...level,
      name: draft.name.trim(),
      note: draft.note.trim(),
      color: draft.color.trim(),
      minPoints: toNumber(draft.minPoints),
      maxPoints: toNumber(draft.maxPoints),
    };
  });
}

function getAdminMealDraft(meals, mealId) {
  const meal = meals.find((item) => item.id === mealId);
  return meal ? { ...meal } : null;
}

function getMealImageLabel(image = '') {
  if (!image) {
    return '未选择图片';
  }
  if (String(image).startsWith('cloud://')) {
    return '已上传云端图片';
  }
  if (String(image).startsWith('/assets/')) {
    return '默认图片';
  }
  return '已选择图片';
}

function toNumber(value, fallback = 0) {
  const number = Number(String(value === undefined || value === null ? '' : value).replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : fallback;
}

function matchMemberLevelByPoints(totalPoints, levels = []) {
  const points = toNumber(totalPoints);
  const sorted = [...levels].sort((a, b) => (a.rank || 0) - (b.rank || 0));
  const matched = sorted.find((level) => {
    const min = toNumber(level.minPoints, Number.NEGATIVE_INFINITY);
    const max = toNumber(level.maxPoints, Number.POSITIVE_INFINITY);
    return points >= min && points <= max;
  });
  return matched || sorted[sorted.length - 1] || null;
}

function matchMemberLevelByName(levelName, levels = []) {
  const name = String(levelName || '').trim();
  return levels.find((level) => level.name === name) || null;
}

function normalizeExcelMemberRow(row = {}, levels = []) {
  const totalPoints = toNumber(row['累计积分']);
  const pointLevel = matchMemberLevelByPoints(totalPoints, levels);
  const level = pointLevel || matchMemberLevelByName(row['级别名称'], levels);
  const memberCardNo = String(row['会员卡号'] || '').trim();
  return {
    _id: memberCardNo ? `member-${memberCardNo}` : undefined,
    memberCardNo,
    nickname: String(row['会员姓名'] || '').trim(),
    tag: String(row['标签'] || '').trim(),
    phone: String(row['会员手机号'] || '').trim(),
    birthday: String(row['会员生日'] || '').trim(),
    title: String(row['会员称谓'] || '').trim(),
    levelId: level ? level.id : '',
    levelName: level ? level.name : String(row['级别名称'] || '').trim(),
    sourceLevelName: String(row['级别名称'] || '').trim(),
    groupName: String(row['分组名称'] || '').trim(),
    qq: String(row.QQ || '').trim(),
    wechat: String(row['微信号'] || '').trim(),
    email: String(row['邮箱'] || '').trim(),
    address: String(row['用户地址'] || '').trim(),
    preference: String(row['用户喜好'] || '').trim(),
    balance: toNumber(row['可用金额']),
    remark: String(row['备注信息'] || '').trim(),
    totalSpent: toNumber(row['累计消费金额']),
    availablePoints: toNumber(row['可用积分']),
    totalPoints,
    usedPoints: toNumber(row['已使用积分']),
    createdAt: String(row['添加时间'] || '').trim(),
    expiresAt: String(row['会员过期时间'] || '').trim(),
    packageItems: String(row['计次项目'] || '').trim(),
    storeName: String(row['属于店铺'] || '').trim(),
    lastConsumeAt: String(row['最后消费时间'] || '').trim(),
    openid: String(row.openid || row.openId || '').trim(),
    active: row.active !== false,
  };
}

function filterMembers(members = [], keyword = '') {
  const query = String(keyword || '').trim().toLowerCase();
  if (!query) {
    return members;
  }
  return members.filter((member) => [
    member.phone,
    member.nickname,
    member.memberCardNo,
  ].some((value) => String(value || '').toLowerCase().includes(query)));
}

function searchMembersForLookup(members = [], keyword = '') {
  if (!String(keyword || '').trim()) {
    return [];
  }
  return filterMembers(members, keyword);
}

function validateCategoryDraft(draft) {
  if (!draft.name || !draft.name.trim()) {
    return { valid: false, message: '请输入分类名称' };
  }
  return { valid: true, message: '' };
}

function createCategory(categories, draft) {
  const validation = validateCategoryDraft(draft);
  if (!validation.valid) {
    throw new Error(validation.message);
  }
  const id = `cat-${Date.now()}`;
  return [
    ...categories,
    {
      id,
      name: draft.name.trim(),
    },
  ];
}

function updateCategory(categories, categoryId, draft) {
  const validation = validateCategoryDraft(draft);
  if (!validation.valid) {
    throw new Error(validation.message);
  }
  return categories.map((category) => {
    if (category.id !== categoryId) {
      return category;
    }
    return {
      ...category,
      name: draft.name.trim(),
    };
  });
}

function deleteCategory(categories, categoryId) {
  return categories.filter((category) => category.id !== categoryId);
}

function getStaffDraft(staffMembers, staffId) {
  const staff = staffMembers.find((item) => item.id === staffId);
  return staff ? { ...staff } : null;
}

function validateStaffDraft(draft) {
  if (!draft.name || !draft.name.trim()) {
    return { valid: false, message: '请输入员工姓名' };
  }
  if (!draft.phone || !draft.phone.trim()) {
    return { valid: false, message: '请输入员工手机号' };
  }
  if (!draft.title || !draft.title.trim()) {
    return { valid: false, message: '请输入员工岗位' };
  }
  return { valid: true, message: '' };
}

function createStaff(staffMembers, draft) {
  const validation = validateStaffDraft(draft);
  if (!validation.valid) {
    throw new Error(validation.message);
  }
  const id = `s${Date.now()}`;
  return [
    ...staffMembers,
    {
      id,
      userId: '',
      role: 'staff',
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      title: draft.title.trim(),
      active: true,
    },
  ];
}

function updateStaff(staffMembers, staffId, draft) {
  const validation = validateStaffDraft(draft);
  if (!validation.valid) {
    throw new Error(validation.message);
  }
  return staffMembers.map((staff) => {
    if (staff.id !== staffId) {
      return staff;
    }
    return {
      ...staff,
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      title: draft.title.trim(),
      active: draft.active !== false,
    };
  });
}

function deleteStaff(staffMembers, staffId) {
  return staffMembers.filter((staff) => staff.id !== staffId || staff.role === 'owner');
}

function validateMealDraft(draft, levels, categories = []) {
  if (!draft.name || !draft.name.trim()) {
    return { valid: false, message: '请输入餐食名称' };
  }
  if (!draft.categoryId || !draft.categoryId.trim()) {
    return { valid: false, message: '请输入餐食分类' };
  }
  if (categories.length && !categories.some((category) => category.id === draft.categoryId)) {
    return { valid: false, message: '请选择有效的餐食分类' };
  }
  if (!draft.desc || !draft.desc.trim()) {
    return { valid: false, message: '请输入餐食描述' };
  }
  if (!draft.image || !draft.image.trim()) {
    return { valid: false, message: '请输入餐食图片路径' };
  }
  if (!levels.some((level) => level.id === draft.requiredLevel)) {
    return { valid: false, message: '请选择有效的适用会员等级' };
  }
  return { valid: true, message: '' };
}

function updateMeal(meals, mealId, draft, levels, categories = []) {
  const validation = validateMealDraft(draft, levels, categories);
  if (!validation.valid) {
    throw new Error(validation.message);
  }
  return meals.map((meal) => {
    if (meal.id !== mealId) {
      return meal;
    }
    return {
      ...meal,
      name: draft.name.trim(),
      categoryId: draft.categoryId,
      desc: draft.desc.trim(),
      image: draft.image.trim(),
      requiredLevel: draft.requiredLevel,
      availableToday: draft.availableToday !== false,
    };
  });
}

function toggleMealAvailability(meals, mealId, availableToday) {
  return meals.map((meal) => {
    if (meal.id !== mealId) {
      return meal.availableToday === undefined ? { ...meal, availableToday: true } : meal;
    }
    return {
      ...meal,
      availableToday,
    };
  });
}

module.exports = {
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
};
