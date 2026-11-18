# 会员休息点单小程序 Roadmap

## 2026-05-19 会员 Excel 导入与等级规则
- [x] 会员等级改为 6 档：普通、普通会员、银卡会员、金卡会员、钻石会员、特级会员。
- [x] 会员等级增加累计积分区间字段：`minPoints` / `maxPoints`。
- [x] 店长端会员等级页面支持维护积分区间。
- [x] 店长端会员管理页面扩展 Excel 字段：会员卡号、姓名、手机号、生日、称谓、标签、分组、余额、累计消费、可用积分、累计积分、已使用积分、备注、门店、最后消费时间等。
- [x] `adminMembers` 根据 `totalPoints` 自动匹配 `levelId`，并保留 Excel 原始 `sourceLevelName` 方便核对。
- [x] 已从 `E:/Google/202605190601548134会员85496623.xls` 生成 `cloud-database/members.import.json`，共 544 条会员记录。
- [x] 已生成新版 `cloud-database/memberLevels.import.json`，用于 CloudBase JSON Lines 导入。

# 美甲美睫店休息点单小程序 Roadmap

## 一、顾客扫码端
- [x] 顾客扫码默认进入点单首页。
- [x] 点单页不展示模拟会员切换入口。
- [x] 我的页展示顾客昵称、手机号、会员等级和等级权益。
- [x] 展示全部今日上架餐食。
- [x] 当前会员等级不可点的餐食保持可见，但置灰并禁止下单。
- [x] 顾客可多选多个餐食后一次提交。
- [x] 餐食按分类展示，每个分类下使用小图卡片网格。
- [x] 点单页使用左侧分类栏、右侧餐食卡片的点餐结构。
- [x] 顾客下单前选择房间/区域和桌号，订单记录下单位置。
- [x] 提交成功后显示已下单弹窗，订单详情集中在订单页。
- [x] 顾客端拆分为底部 Tab：点单、订单、我的。
- [x] 顾客端不展示任何店长配置入口。
- [x] 顾客端菜单页已从本地 `data/store.js` 切换为优先读取 `getCustomerMenu` 云函数数据，本地 mock 仅作为失败兜底。

## 二、店长管理端
- [x] 店长端使用独立入口页：`/pages/admin/home/index`。
- [x] 店长可新增、编辑、停用和删除店员。
- [x] 店长和店员使用不同后台权限：店长可全量配置，店员可维护分类、餐食并处理订单。
- [x] 顾客、店长、店员登录后进入不同前端页面。
- [x] 店长维护会员等级名称、权益说明和标签颜色。
- [x] 店长维护会员资料、绑定 openid、修改会员等级和停用会员。
- [x] 店长维护餐食名称、图片、描述、适用会员等级。
- [x] 店长维护餐食时可选择分类。
- [x] 店长维护餐食时可上传/选择餐食图片。
- [x] 支持每日餐食上下架。
- [x] 支持新增、修改、删除、查看餐食分类。
- [x] 支持查看当日订单列表和订单状态。
- [x] 店长订单页显示会员、餐食、下单时间和位置。

## 三、员工端
- [x] 员工登录后进入独立员工端：`/pages/staff/home/index`。
- [x] 员工端展示分类管理、餐食维护和订单处理相关功能。
- [x] 员工可查看今日订单、顾客位置、餐食、会员信息。
- [x] 员工可更新订单状态。
- [x] 员工不能访问店长配置页。

## 四、当前技术状态
- [x] 已完成前端原型。
- [x] 已建立本地 mock 用户身份：顾客、店长、店员。
- [x] 已建立本地权限守卫。
- [x] 已建立顾客端、店长端、员工端三类页面入口。
- [x] 已使用本地 mock 数据和微信本地缓存模拟业务数据。
- [x] 接入真实微信登录（前端身份统一为云会话，见 2026-09-29 小节）。
- [x] 用云开发替换本地 mock 数据。（核心点单链路、订单、后台维护、门店配置和会员识别已迁移；本地 mock 仅作兜底演示）

## 五、微信云开发阶段
### 5.1 云开发基础
- [x] 在微信开发者工具中开通云开发环境。
- [x] 确定云环境 ID，并在小程序 `app.js` 中初始化 `wx.cloud.init`。
- [x] 新增 `cloudfunctions/` 云函数目录。
- [x] 新增前端云 API 封装，例如 `utils/cloudApi.js`。
- [x] 保留 mock 数据作为本地兜底或开发演示数据。

### 5.2 云数据库集合设计
- [x] `users`：微信用户身份表，字段包括 `openid`、`role`、`memberId`、`staffId`、`createdAt`、`updatedAt`。
- [x] `members`：顾客会员表，字段包括 openid、昵称、手机号、会员等级、状态。
- [x] 店员资料暂并入 `users`：字段包括 `openid`、`role`、`staffId`、姓名、手机号、岗位、启用状态；后续如员工资料复杂化再拆 `staff` 集合。
- [x] `memberLevels`：会员等级配置表，字段包含等级名称、排序、权益说明、标签颜色。
- [x] `categories`：餐食分类表，字段包含分类名称、排序、启用状态。
- [x] `meals`：餐食表，字段包含名称、描述、分类、图片 fileID、适用会员等级、今日上下架状态。
- [x] `orders`：订单表，字段包含顾客、餐食列表、房间/区域、桌号、状态、下单时间、处理人。
- [x] `settings`：门店配置表，字段包含门店名称、营业状态、房间/桌号配置。

### 5.3 云存储
- [x] 餐食图片上传到云存储。
- [x] `meals.image` 从本地路径迁移为云存储 `fileID`。
- [x] 店长上传图片后自动回填餐食图片地址。
- [x] 为默认 SVG 或示例图片保留本地占位兜底（无图或云 fileID 失效时回退 `/assets/*.svg`）。

### 5.4 第一批云函数
- [x] `login`：获取 openid，返回当前用户身份、权限和登录后入口页面。
- [x] `login` 已支持从 `members` 识别真实顾客会员身份。
- [x] `getCustomerMenu`：顾客端获取会员信息、分类、餐食、可点状态。
- [x] `getMyMemberProfile`：顾客端读取自己的会员资料和会员等级权益。
- [x] `createOrder`：顾客提交订单，校验会员等级、餐食状态、房间和桌号。
- [x] `getMyOrders`：顾客查看自己的订单。
- [x] `getStaffOrders`：员工/店长查看今日订单。
- [x] `updateOrderStatus`：员工/店长更新订单状态。
- [x] `adminStaff`：店长增删改查店员，数据写入 `users` 集合并采用停用式软删除。
- [x] `adminCategories`：店长增删改查分类。
- [x] `adminMeals`：店长维护餐食和上下架状态。
- [x] `adminLevels`：店长维护会员等级。
- [x] `adminMembers`：店长新增、编辑、绑定和停用会员。
- [x] `getStoreSettings`：顾客端读取门店名称、营业状态和房间/桌号配置。
- [x] `adminSettings`：店长维护门店名称、营业状态和房间/桌号配置。

### 5.5 权限与入口
- [x] 顾客登录后进入 `/pages/index/index`。
- [x] 店员登录后进入 `/pages/staff/home/index`。
- [x] 店长登录后进入 `/pages/admin/home/index`。
- [x] 云函数内校验 openid 对应角色，不能只依赖前端隐藏入口。
- [x] 店员只能调用订单相关云函数。
- [x] 店长才能调用员工、分类、餐食、会员等级配置云函数。

### 5.6 数据迁移顺序
- [x] 先迁移会员等级、分类、餐食等低风险配置数据。
- [x] 再迁移顾客登录和会员识别。
- [x] 再迁移顾客提交订单。
- [x] 再迁移员工/店长查看订单与更新状态。
- [x] 最后迁移店长维护员工和图片上传。

## 六、后续增强
- [ ] 订单同步到店内工作台或通知群。
- [x] 增加新订单提醒（订单页自动轮询 + 待处理角标，见 2026-09-29 小节）。
- [x] 增加订单筛选：待处理、制作中、已完成、已取消。
- [x] 增加门店房间/桌号配置页面。

## 2026-05-20 顾客手机号绑定会员
- [x] 新增 `bindMemberPhone` 云函数：通过微信手机号授权 `code` 获取手机号。
- [x] 使用手机号匹配 `members.phone`，绑定成功后写入会员 `openid`。
- [x] 绑定成功时同步创建/更新 `users` 顾客身份记录。
- [x] `login` 对未绑定会员的顾客返回 `/pages/bind-phone/index`。
- [x] 新增顾客绑定手机号页面，绑定后进入点单页。
- [x] 防止一个会员手机号被不同微信重复绑定。

## 2026-09-29 订单筛选与新订单提醒
- [x] `utils/orders.js` 新增 `getOrderFilters` / `buildOrderFilters` / `filterOrdersByStatus` / `countOrdersByStatus` / `countPendingOrders` / `filterNewOrders` 等纯函数，并补充单元测试。
- [x] 店长端/员工端订单页（`pages/admin/orders/index`）增加顶部状态筛选标签：全部、待处理、制作中、已完成、已取消，并显示各状态计数。
- [x] 修复订单卡片标题硬编码「已下单」，改为「下单时间」并展示真实下单时间。
- [x] 待处理订单置顶高亮，并在页头显示「待处理 N 单」角标。
- [x] 订单页 `onShow` 启动 15 秒自动轮询，`onHide`/`onUnload` 清理定时器；检测到新待处理订单时提示。
- [x] 支持下拉刷新（`enablePullDownRefresh`）。

## 2026-09-29 餐食图片占位兜底
- [x] `utils/menu.js` 新增 `DEFAULT_MEAL_IMAGE` 与 `resolveMealImage`，菜单数据在 `normalizeMenuSource` 阶段为缺失图片的餐食补齐默认占位。
- [x] 顾客端点单页餐食图片绑定 `binderror`，云 `fileID` 失效时自动回退默认 SVG，避免出现破图。
- [x] 店长端餐食维护列表缩略图与编辑器预览图同样增加失败回退。
- [x] 补充 `tests/menu.test.js` 占位兜底用例。

## 2026-09-29 前端身份统一为云会话
- [x] `utils/auth.js` 引入云会话身份：`applyCloudSession` 缓存 `login` 云函数返回的用户，`getCurrentUser` 优先返回云会话身份，本地 mock 仅在无云会话时兜底。
- [x] 新增 `enterAdminPage(page, permission, onGranted)` 守卫：云会话未就绪时不跳转、不放行，待会话就绪（或失败）后重新判定，避免真实店长冷启动被误跳无权限页。
- [x] `utils/session.js` 在 `storeSession` 时推送会话到前端身份来源；新增 `markSessionFailed`；`app.js` 处理云未配置/登录失败分支，避免会话永久挂起。
- [x] 九个管理页（`pages/admin/*` 与 `pages/staff/home`）的 `onShow` 改用 `enterAdminPage`，移除对本地 mock 身份的 `ensureAdminAccess` 直接调用。
- [x] `ensureAdminAccess` / `getCurrentUser` 增加防御：storage 或 redirect 能力缺失时不再抛错。
- [x] 补充 `tests/auth.test.js`（云会话身份优先、未就绪不跳转、就绪放行、顾客跳无权限）与 `tests/session.test.js`（会话写入前端身份、失败结算）用例。

## 2026-11-18 上线收敛：三端登录闭环
- [x] 拆分 `utils/cloudConfig.js` 中语义混淆的单一开关：`DEV_FORCE_CUSTOMER_ENTRY`（抑制入口跳转）与 `DEV_ALLOW_OWNER_CUSTOMER_ORDER`（店长代客下单）分离。
- [x] 修正 `FORCE_CUSTOMER_ENTRY_OVERRIDE` 默认值为 `false`：此前为 `true` 会导致店长/员工登录后被卡在顾客页，三端登录无法验证。
- [x] 入口跳转开关改为按运行版本判定，仅 `develop` 生效；体验版/正式版一律放行。
- [x] 新增 `scripts/generate-users-seed.js`：校验 openid 并生成 `cloud-database/users.import.json`（JSON Lines），替代控制台手工录入；含真实 openid 的文件已加入 `.gitignore`。
- [x] `cloud-development.md` 补充脚本用法、`active` 字段语义，并修正「独立 staff 集合」的过期描述。
- [x] 新增 `docs/launch-checklist.md`：真机三端验收清单、交叉验证用例与故障速查。
- [x] 推送本地提交至 `origin/master`（2026-11-18 完成，`c15c0ac`）。
- [ ] 按验收清单完成真机三端走查。
