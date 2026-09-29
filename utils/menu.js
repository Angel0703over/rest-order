const { store, categories, locations, memberLevels, demoMembers, meals } = require('../data/store');

const DEFAULT_MEAL_IMAGE = '/assets/meal-bowl.svg';

function resolveMealImage(image) {
  const value = typeof image === 'string' ? image.trim() : '';
  return value || DEFAULT_MEAL_IMAGE;
}

function normalizeItem(item) {
  if (!item) {
    return item;
  }
  return {
    ...item,
    id: item.id || item._id,
  };
}

function normalizeMenuSource(source = {}) {
  const currentSource = source || {};
  return {
    memberLevels: (currentSource.memberLevels || memberLevels).map(normalizeItem),
    categories: (currentSource.categories || categories).map(normalizeItem),
    meals: (currentSource.meals || meals)
      .map(normalizeItem)
      .map((meal) => (meal ? { ...meal, image: resolveMealImage(meal.image) } : meal)),
  };
}

function getLevel(levelId, source) {
  const menuSource = normalizeMenuSource(source);
  return menuSource.memberLevels.find((level) => level.id === levelId);
}

function getCategory(categoryId, source) {
  const menuSource = normalizeMenuSource(source);
  return menuSource.categories.find((category) => category.id === categoryId);
}

function getLocation(roomId, tableId) {
  const room = locations.find((item) => item.id === roomId);
  const table = room && room.tables.find((item) => item.id === tableId);
  if (!room || !table) {
    return null;
  }
  return {
    roomId: room.id,
    roomName: room.name,
    tableId: table.id,
    tableName: table.name,
    text: `${room.name} · ${table.name}`,
  };
}

function canOrderMeal(memberLevelId, meal, source) {
  const memberLevel = getLevel(memberLevelId, source);
  const requiredLevel = getLevel(meal.requiredLevel, source);
  if (!memberLevel || !requiredLevel) {
    return false;
  }
  return memberLevel.rank >= requiredLevel.rank;
}

function getMemberLevelDisplay(memberLevelId) {
  return memberLevels.map((level) => ({
    ...level,
    active: level.id === memberLevelId,
  }));
}

function getTodayMeals(sourceMeals = meals) {
  return sourceMeals.filter((meal) => meal.availableToday !== false);
}

function getMealAvailability(memberLevelId, source) {
  const menuSource = normalizeMenuSource(source);
  return getTodayMeals(menuSource.meals).map((meal) => {
    const requiredLevel = getLevel(meal.requiredLevel, menuSource);
    const category = getCategory(meal.categoryId, menuSource);
    const available = canOrderMeal(memberLevelId, meal, menuSource);
    return {
      ...meal,
      categoryName: category ? category.name : '未分类',
      category: category ? category.name : '未分类',
      requiredLevelName: requiredLevel ? requiredLevel.name : '',
      available,
      lockReason: available ? '' : `${requiredLevel.name}及以上可点`,
    };
  });
}

function getCategorizedMealGroups(memberLevelId, source) {
  const menuSource = normalizeMenuSource(source);
  const availability = getMealAvailability(memberLevelId, menuSource);
  return menuSource.categories
    .map((category) => ({
      ...category,
      meals: availability.filter((meal) => meal.categoryId === category.id),
    }))
    .filter((category) => category.meals.length > 0);
}

function getMealCategoryView(memberLevelId, selectedCategoryId, selectedMealIds = [], source) {
  const groups = getCategorizedMealGroups(memberLevelId, source);
  const fallbackCategoryId = groups[0] ? groups[0].id : '';
  const activeCategoryId = groups.some((group) => group.id === selectedCategoryId)
    ? selectedCategoryId
    : fallbackCategoryId;
  const currentGroup = groups.find((group) => group.id === activeCategoryId) || { meals: [] };
  return {
    categoryTabs: groups.map((group) => ({
      id: group.id,
      name: group.name,
      active: group.id === activeCategoryId,
    })),
    selectedCategoryId: activeCategoryId,
    meals: currentGroup.meals.map((meal) => ({
      ...meal,
      selected: selectedMealIds.includes(meal.id),
    })),
  };
}

function getMemberOrderStats(memberLevelId, source) {
  const availability = getMealAvailability(memberLevelId, source);
  const available = availability.filter((meal) => meal.available).length;
  return {
    total: availability.length,
    available,
    locked: availability.length - available,
  };
}

function getMenuDisplayState({ isOnline, mealCount }) {
  if (!isOnline) {
    return {
      type: 'offline',
      title: '餐食加载失败',
      message: '请检查网络后重试，或联系店员协助点单。',
    };
  }
  if (mealCount === 0) {
    return {
      type: 'empty',
      title: '今日暂未上架餐食',
      message: '店长上架后，顾客就能在这里点单。',
    };
  }
  return {
    type: 'ready',
    title: '',
    message: '',
  };
}

function buildOrder({ memberId, memberLevel, mealId, mealIds, location, menuSource }) {
  const source = normalizeMenuSource(menuSource);
  const member = demoMembers.find((item) => item.id === memberId);
  const ids = mealIds && mealIds.length ? mealIds : [mealId];
  const selectedMeals = ids.map((id) => source.meals.find((item) => item.id === id));
  const selectedLocation = location && getLocation(location.roomId, location.tableId);
  if (!member) {
    throw new Error('未找到会员信息');
  }
  if (!selectedLocation) {
    throw new Error('请选择房间和桌号');
  }
  if (selectedMeals.some((meal) => !meal)) {
    throw new Error('未找到餐食信息');
  }
  if (selectedMeals.some((meal) => !canOrderMeal(memberLevel, meal, source))) {
    throw new Error('当前会员等级暂不能点这份餐食');
  }
  return {
    id: `O${Date.now()}`,
    memberId,
    memberName: member.nickname,
    memberLevelName: getLevel(memberLevel, source).name,
    mealId: selectedMeals[0].id,
    mealIds: selectedMeals.map((meal) => meal.id),
    mealName: selectedMeals.map((meal) => meal.name).join('、'),
    mealNames: selectedMeals.map((meal) => meal.name),
    location: selectedLocation,
    locationText: selectedLocation.text,
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    status: '已提交',
  };
}

function getOrderSummary(order) {
  return {
    title: '订单已提交',
    primaryLine: `${order.memberName} · ${order.memberLevelName}`,
    mealLine: order.mealName,
    helperText: '请稍等店员确认，餐食会送到休息区。',
  };
}

function getOrderFollowUpActions() {
  return [
    { id: 'continue', label: '继续点单' },
    { id: 'viewOrder', label: '查看订单' },
  ];
}

module.exports = {
  DEFAULT_MEAL_IMAGE,
  store,
  categories,
  locations,
  memberLevels,
  demoMembers,
  meals,
  resolveMealImage,
  getCategory,
  getLocation,
  getLevel,
  canOrderMeal,
  getMemberLevelDisplay,
  getCategorizedMealGroups,
  getMealCategoryView,
  getTodayMeals,
  getMealAvailability,
  getMenuDisplayState,
  getMemberOrderStats,
  buildOrder,
  getOrderSummary,
  getOrderFollowUpActions,
};
