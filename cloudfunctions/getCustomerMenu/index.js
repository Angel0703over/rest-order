let cloud = null;

try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
} catch (error) {
  cloud = null;
}

const {
  categories: fallbackCategories,
  meals: fallbackMeals,
  memberLevels: fallbackMemberLevels,
} = require('./seedData');

function getDatabase(context) {
  if (context && Object.prototype.hasOwnProperty.call(context, 'db')) {
    return context.db;
  }
  if (cloud && cloud.database) {
    return cloud.database();
  }
  return null;
}

function normalizeId(item) {
  return {
    ...item,
    id: item.id || item._id,
  };
}

async function readCollection(db, name, fallback) {
  if (!db) {
    return fallback.map(normalizeId);
  }
  try {
    const result = await db.collection(name).where({ enabled: true }).get();
    return result.data.map(normalizeId);
  } catch (error) {
    return fallback.map(normalizeId);
  }
}

function sortByRank(items) {
  return items.slice().sort((a, b) => (a.rank || a.sort || 0) - (b.rank || b.sort || 0));
}

function canOrderMeal(memberLevelId, meal, levels) {
  const memberLevel = levels.find((level) => level.id === memberLevelId);
  const requiredLevel = levels.find((level) => level.id === meal.requiredLevel);
  if (!memberLevel || !requiredLevel) {
    return false;
  }
  return memberLevel.rank >= requiredLevel.rank;
}

async function main(event = {}, context = {}) {
  const db = getDatabase(context);
  const memberLevelId = event.memberLevelId || 'basic';
  const memberLevels = sortByRank(await readCollection(db, 'memberLevels', fallbackMemberLevels));
  const categories = sortByRank(await readCollection(db, 'categories', fallbackCategories));
  const allMeals = sortByRank(await readCollection(db, 'meals', fallbackMeals));
  const meals = allMeals
    .filter((meal) => meal.availableToday !== false)
    .map((meal) => {
      const requiredLevel = memberLevels.find((level) => level.id === meal.requiredLevel);
      const category = categories.find((item) => item.id === meal.categoryId);
      const available = canOrderMeal(memberLevelId, meal, memberLevels);
      return {
        ...meal,
        categoryName: category ? category.name : '未分类',
        requiredLevelName: requiredLevel ? requiredLevel.name : '',
        available,
        lockReason: available || !requiredLevel ? '' : `${requiredLevel.name}及以上可点`,
      };
    });

  return {
    memberLevelId,
    memberLevels,
    categories,
    meals,
  };
}

exports.main = main;
