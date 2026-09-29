const memberLevels = [
  { _id: 'normal', name: '普通', rank: 1, minPoints: 0, maxPoints: 1, color: '#9a8f87', note: '普通顾客，可查看会员餐食', enabled: true },
  { _id: 'basic', name: '普通会员', rank: 2, minPoints: 2, maxPoints: 1000, color: '#6f7f8f', note: '可享轻食与基础饮品', enabled: true },
  { _id: 'silver', name: '银卡会员', rank: 3, minPoints: 1001, maxPoints: 2000, color: '#8c96a3', note: '可享基础餐食与精品饮品', enabled: true },
  { _id: 'gold', name: '金卡会员', rank: 4, minPoints: 2001, maxPoints: 3000, color: '#b48732', note: '可享正餐、甜品和精选饮品', enabled: true },
  { _id: 'diamond', name: '钻石会员', rank: 5, minPoints: 3001, maxPoints: 4000, color: '#6b7fd7', note: '可享全量餐食与门店限定款', enabled: true },
  { _id: 'special', name: '特级会员', rank: 6, minPoints: 4001, maxPoints: 6000, color: '#7c4d8b', note: '可享全量餐食与高级限定款', enabled: true },
];

const categories = [
  { _id: 'drinks', name: '饮品', sort: 1, enabled: true },
  { _id: 'light', name: '轻食', sort: 2, enabled: true },
  { _id: 'bakery', name: '烘焙', sort: 3, enabled: true },
  { _id: 'meal', name: '正餐', sort: 4, enabled: true },
  { _id: 'dessert', name: '甜品', sort: 5, enabled: true },
  { _id: 'limited', name: '限定', sort: 6, enabled: true },
];

const meals = [
  { _id: 'm101', name: '舒缓花茶', categoryId: 'drinks', requiredLevel: 'basic', availableToday: true, desc: '低糖花果香，适合做美甲时慢慢喝。', image: '/assets/meal-tea.svg', sort: 1, enabled: true },
  { _id: 'm102', name: '鸡胸轻食杯', categoryId: 'light', requiredLevel: 'basic', availableToday: true, desc: '清爽高蛋白，休息间隙不负担。', image: '/assets/meal-salad.svg', sort: 2, enabled: true },
  { _id: 'm201', name: '桂花拿铁', categoryId: 'drinks', requiredLevel: 'silver', availableToday: true, desc: '银卡及以上会员专享热饮。', image: '/assets/meal-latte.svg', sort: 3, enabled: true },
  { _id: 'm202', name: '火腿芝士可颂', categoryId: 'bakery', requiredLevel: 'silver', availableToday: true, desc: '烘热后外酥内软，适合短休。', image: '/assets/meal-croissant.svg', sort: 4, enabled: true },
  { _id: 'm301', name: '牛油果虾仁碗', categoryId: 'meal', requiredLevel: 'gold', availableToday: true, desc: '金卡及以上可点，饱腹但清爽。', image: '/assets/meal-bowl.svg', sort: 5, enabled: true },
  { _id: 'm302', name: '莓果酸奶杯', categoryId: 'dessert', requiredLevel: 'gold', availableToday: true, desc: '酸甜轻盈，适合护理后加餐。', image: '/assets/meal-yogurt.svg', sort: 6, enabled: true },
  { _id: 'm401', name: '店长限定双人下午茶', categoryId: 'limited', requiredLevel: 'diamond', availableToday: true, desc: '钻石会员限定，含甜点、热饮和水果。', image: '/assets/meal-teatime.svg', sort: 7, enabled: true },
  { _id: 'm402', name: '胶原燕窝羹', categoryId: 'limited', requiredLevel: 'diamond', availableToday: true, desc: '门店高阶会员休息专享。', image: '/assets/meal-dessert.svg', sort: 8, enabled: true },
];

module.exports = {
  categories,
  meals,
  memberLevels,
};
