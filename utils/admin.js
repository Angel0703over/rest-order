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
    };
  });
}

function getAdminMealDraft(meals, mealId) {
  const meal = meals.find((item) => item.id === mealId);
  return meal ? { ...meal } : null;
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
};
