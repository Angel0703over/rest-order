const memberLevels = [
  { _id: 'basic', name: '基础会员', rank: 1, enabled: true },
  { _id: 'silver', name: '银卡会员', rank: 2, enabled: true },
  { _id: 'gold', name: '金卡会员', rank: 3, enabled: true },
  { _id: 'diamond', name: '钻石会员', rank: 4, enabled: true },
];

const meals = [
  { _id: 'm101', name: '舒缓花茶', categoryId: 'drinks', requiredLevel: 'basic', availableToday: true, enabled: true },
  { _id: 'm102', name: '鸡胸轻食杯', categoryId: 'light', requiredLevel: 'basic', availableToday: true, enabled: true },
  { _id: 'm201', name: '桂花拿铁', categoryId: 'drinks', requiredLevel: 'silver', availableToday: true, enabled: true },
  { _id: 'm202', name: '火腿芝士可颂', categoryId: 'bakery', requiredLevel: 'silver', availableToday: true, enabled: true },
  { _id: 'm301', name: '牛油果虾仁碗', categoryId: 'meal', requiredLevel: 'gold', availableToday: true, enabled: true },
  { _id: 'm302', name: '莓果酸奶杯', categoryId: 'dessert', requiredLevel: 'gold', availableToday: true, enabled: true },
  { _id: 'm401', name: '店长限定双人下午茶', categoryId: 'limited', requiredLevel: 'diamond', availableToday: true, enabled: true },
  { _id: 'm402', name: '胶原燕窝羹', categoryId: 'limited', requiredLevel: 'diamond', availableToday: true, enabled: true },
];

module.exports = {
  meals,
  memberLevels,
};
