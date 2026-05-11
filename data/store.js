const store = {
  name: '会员休息点单',
  entryHint: '扫码进入',
  miniProgramTag: '小程序',
  menuTitle: '今日餐食',
  menuSubtitle: '全部等级餐食都会展示，不可点的会置灰',
};

const memberLevels = [
  { id: 'basic', name: '基础会员', rank: 1, color: '#6f7f8f', note: '可享轻食与基础饮品' },
  { id: 'silver', name: '银卡会员', rank: 2, color: '#8c96a3', note: '可享基础餐食与精品饮品' },
  { id: 'gold', name: '金卡会员', rank: 3, color: '#b48732', note: '可享正餐、甜品和精选饮品' },
  { id: 'diamond', name: '钻石会员', rank: 4, color: '#6b7fd7', note: '可享全量餐食与门店限定款' },
];

const demoMembers = [
  { id: 'u1001', nickname: '林小姐', phone: '138****2106', levelId: 'basic' },
  { id: 'u1002', nickname: '陈小姐', phone: '136****8842', levelId: 'silver' },
  { id: 'u1003', nickname: '周小姐', phone: '159****0678', levelId: 'gold' },
  { id: 'u1004', nickname: '许小姐', phone: '188****9231', levelId: 'diamond' },
];

const categories = [
  { id: 'drinks', name: '饮品' },
  { id: 'light', name: '轻食' },
  { id: 'bakery', name: '烘焙' },
  { id: 'meal', name: '正餐' },
  { id: 'dessert', name: '甜品' },
  { id: 'limited', name: '限定' },
];

const locations = [
  {
    id: 'vip-1',
    name: 'VIP包厢1',
    tables: [
      { id: '1', name: '桌号1' },
      { id: '2', name: '桌号2' },
    ],
  },
  {
    id: 'vip-2',
    name: 'VIP包厢2',
    tables: [
      { id: '1', name: '桌号1' },
      { id: '2', name: '桌号2' },
    ],
  },
  {
    id: 'vip-3',
    name: 'VIP包厢3',
    tables: [
      { id: '1', name: '桌号1' },
      { id: '2', name: '桌号2' },
    ],
  },
  {
    id: 'lash-1',
    name: '美睫房1',
    tables: [
      { id: '1', name: '桌号1' },
      { id: '2', name: '桌号2' },
    ],
  },
  {
    id: 'lash-2',
    name: '美睫房2',
    tables: [
      { id: '1', name: '桌号1' },
      { id: '2', name: '桌号2' },
    ],
  },
  {
    id: 'sofa',
    name: '沙发区',
    tables: [
      { id: '1', name: '桌号1' },
      { id: '2', name: '桌号2' },
    ],
  },
];

const meals = [
  {
    id: 'm101',
    name: '舒缓花茶',
    categoryId: 'drinks',
    requiredLevel: 'basic',
    availableToday: true,
    desc: '低糖花果香，适合做美甲时慢慢喝。',
    image: '/assets/meal-tea.svg',
  },
  {
    id: 'm102',
    name: '鸡胸轻食杯',
    categoryId: 'light',
    requiredLevel: 'basic',
    availableToday: true,
    desc: '清爽高蛋白，休息间隙不负担。',
    image: '/assets/meal-salad.svg',
  },
  {
    id: 'm201',
    name: '桂花拿铁',
    categoryId: 'drinks',
    requiredLevel: 'silver',
    availableToday: true,
    desc: '银卡及以上会员专享热饮。',
    image: '/assets/meal-latte.svg',
  },
  {
    id: 'm202',
    name: '火腿芝士可颂',
    categoryId: 'bakery',
    requiredLevel: 'silver',
    availableToday: true,
    desc: '烘热后外酥内软，适合短休。',
    image: '/assets/meal-croissant.svg',
  },
  {
    id: 'm301',
    name: '牛油果虾仁碗',
    categoryId: 'meal',
    requiredLevel: 'gold',
    availableToday: true,
    desc: '金卡及以上可点，饱腹但清爽。',
    image: '/assets/meal-bowl.svg',
  },
  {
    id: 'm302',
    name: '莓果酸奶杯',
    categoryId: 'dessert',
    requiredLevel: 'gold',
    availableToday: true,
    desc: '酸甜轻盈，适合护理后加餐。',
    image: '/assets/meal-yogurt.svg',
  },
  {
    id: 'm401',
    name: '店长限定双人下午茶',
    categoryId: 'limited',
    requiredLevel: 'diamond',
    availableToday: true,
    desc: '钻石会员限定，含甜点、热饮和水果。',
    image: '/assets/meal-teatime.svg',
  },
  {
    id: 'm402',
    name: '胶原燕窝羹',
    categoryId: 'limited',
    requiredLevel: 'diamond',
    availableToday: true,
    desc: '门店高阶会员休息专享。',
    image: '/assets/meal-dessert.svg',
  },
];

module.exports = {
  store,
  categories,
  locations,
  memberLevels,
  demoMembers,
  meals,
};
