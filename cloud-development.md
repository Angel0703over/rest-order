# 微信云开发接入说明

## 当前阶段

当前项目已经加入云开发基础骨架：

- `app.js`：预留 `wx.cloud.init` 初始化。
- `app.js`：启动时会自动调用 `login` 云函数并保存云端会话。
- `utils/cloudConfig.js`：配置云环境 ID。
- `utils/cloudApi.js`：统一封装前端云函数调用。
- `utils/session.js`：保存云登录结果，并根据 `entryPage` 跳转入口页面。
- `cloudfunctions/login`：登录云函数，已支持优先读取 `users` 云数据库集合。
- `cloudfunctions/getCustomerMenu`：顾客菜单云函数，读取会员等级、分类和餐食。
- `cloud-database/`：云数据库初始导入数据。

现在还没有把页面数据切到云数据库，前端仍使用本地 mock 数据和微信本地缓存。

## 开通云开发后需要修改

1. 在微信开发者工具中开通云开发。
2. 复制云环境 ID。
3. 修改 `utils/cloudConfig.js`：

```js
const CLOUD_ENV_ID = '你的云环境 ID';
```

4. 在微信开发者工具中右键 `cloudfunctions/login`，选择上传并部署。
5. 在小程序端调用 `login` 云函数，确认可以返回 openid、身份和入口页面。

## users 集合初始化

先在云数据库里创建 `users` 集合，再新增一条自己的店长身份记录。把下面的 `openid` 换成你刚刚测试 `login` 得到的真实 openid：

```json
{
  "openid": "你的真实 openid",
  "role": "owner",
  "name": "店长",
  "memberId": "",
  "staffId": "s1001",
  "createdAt": "2026-05-10 00:00:00",
  "updatedAt": "2026-05-10 00:00:00"
}
```

角色说明：

- `customer`：顾客，登录后进入 `/pages/index/index`。
- `staff`：店员，登录后进入 `/pages/staff/home/index`。
- `owner`：店长，登录后进入 `/pages/admin/home/index`。

新增后重新测试 `login` 云函数，如果该 openid 的 `role` 是 `owner`，返回的 `entryPage` 应该是 `/pages/admin/home/index`。

## 云数据库集合

建议先创建这些集合：

- `users`：openid 与角色关系。
- `members`：顾客会员信息。
- `staff`：店长和店员信息。
- `memberLevels`：会员等级配置。
- `categories`：餐食分类。
- `meals`：餐食信息。
- `orders`：订单。
- `settings`：门店配置。

## 菜单数据导入

先在云数据库里创建三个集合：

- `memberLevels`
- `categories`
- `meals`

然后分别导入这些文件：

- `cloud-database/memberLevels.json`
- `cloud-database/categories.json`
- `cloud-database/meals.json`

导入后部署 `cloudfunctions/getCustomerMenu`，测试参数：

```json
{
  "memberLevelId": "basic"
}
```

正常返回应该包含：

- `memberLevels`：4 档会员等级。
- `categories`：6 个餐食分类。
- `meals`：今日上架餐食，并带有 `available` 和 `lockReason`。

## 第一批云函数迁移顺序

1. `login`：真实读取 `users`、`members`、`staff`。
2. `getCustomerMenu`：替换顾客端餐食 mock 数据。
3. `createOrder`：替换本地下单缓存。
4. `getStaffOrders`：员工和店长读取今日订单。
5. `updateOrderStatus`：员工和店长更新订单状态。
6. `adminMeals`、`adminCategories`、`adminLevels`、`adminStaff`：替换店长配置页。

## 权限原则

前端隐藏入口只是体验优化，真实权限必须在云函数内判断：

- `customer`：只能读取自己的会员信息、菜单和订单，能创建订单。
- `staff`：只能读取和更新订单状态。
- `owner`：可以管理店员、分类、餐食、会员等级和订单。
- `createOrder` 部署前检查：在 CloudBase 文档型数据库中新建 `orders` 集合，权限选 `无权限 [ADMINONLY]`；上传并部署 `cloudfunctions/createOrder`，选择“云端安装依赖”。顾客端提交订单会调用该云函数，不再写入本地缓存。

## 本地调试入口开关

- `utils/cloudConfig.js` 中的 `DEV_FORCE_CUSTOMER_ENTRY` 用于本地开发。
- 设置为 `true` 时，编译到 `pages/index/index` 会停留在顾客点单页，不会因为当前 openid 是店长而跳到后台。
- 需要测试店长/店员自动入口时，把它改为 `false` 后重新编译。
- `cloudfunctions/createOrder/index.js` 中的 `DEV_ALLOW_STAFF_CUSTOMER_ORDER` 用于配合本地调试下单；正式上线前应改为 `false` 并重新部署。

## 订单列表与状态云函数

需要上传并部署以下云函数，均选择“云端安装依赖”：

1. `cloudfunctions/getMyOrders`
2. `cloudfunctions/getStaffOrders`
3. `cloudfunctions/updateOrderStatus`

部署后：

- 顾客“订单”页通过 `getMyOrders` 读取自己的今日订单。
- 员工端和店长订单页通过 `getStaffOrders` 读取今日全部订单。
- 员工端和店长订单页通过 `updateOrderStatus` 更新订单状态。

## 店长分类维护云函数

需要上传并部署：

1. `cloudfunctions/adminCategories`

部署后店长“分类管理”页会通过云函数读取、创建、修改、删除 `categories` 集合。删除采用软删除：把 `enabled` 改为 `false`。

## 店长会员等级维护云函数

需要上传并部署：

1. `cloudfunctions/adminLevels`

部署后店长“会员等级”页会通过云函数读取和修改 `memberLevels` 集合。当前只允许修改等级名称、权益说明和颜色，不允许新增或删除等级，避免影响顾客可点规则。

## 店长餐食维护云函数

需要上传并部署：

1. `cloudfunctions/adminMeals`

部署后店长“餐食维护”页会通过云函数读取 `meals`、`categories`、`memberLevels`，并能保存餐食名称、分类、描述、图片路径、适用会员等级和今日上下架状态。

## 餐食图片云存储

店长在“餐食维护”页点击“上传图片”后，会通过 `wx.cloud.uploadFile` 上传到云存储的 `meal-images/` 目录，并把返回的 `fileID` 回填到 `meals.image`。上传后仍需点击“保存餐食”，才会把新的 `fileID` 写入云数据库。
## 店长员工管理云函数
当前员工管理不再单独创建 `staff` 集合，统一使用 `users` 集合作为身份与员工资料的数据源。这样 `adminStaff` 新增、停用员工后，`login` 云函数会直接按同一条 `users` 记录判断入口。

需要上传并部署：
1. `cloudfunctions/adminStaff`
2. `cloudfunctions/login`（本次增加了停用员工不能进入员工端的规则）

部署时仍选择“上传并部署：云端安装依赖”。

`users` 里的店员记录建议字段：
```json
{
  "openid": "",
  "role": "staff",
  "memberId": "",
  "staffId": "s1002",
  "name": "店员姓名",
  "phone": "13900002222",
  "title": "美睫师",
  "active": true,
  "createdAt": "2026/5/11 12:00:00",
  "updatedAt": "2026/5/11 12:00:00"
}
```

说明：
- 店长端“员工管理”页会通过 `adminStaff` 读取、创建、保存和停用 `users` 中的员工记录。
- 新增员工时 `openid` 先为空；员工要真正登录员工端时，需要把该员工微信登录得到的真实 `openid` 绑定到对应记录。
- 停用员工会把 `active` 改成 `false`，不会物理删除记录；停用后该 openid 再登录会进入无权限页。

## 门店设置 settings
在云数据库创建 `settings` 集合，权限选择 `无权限[ADMINONLY]`。然后导入：

- `cloud-database/settings.json`

该文件是一行 JSON，适合 CloudBase 的 JSON Lines 导入方式。默认文档 `_id` 是 `store`，包含：

- `storeName`：门店名称。
- `isOpen`：是否营业，`false` 时顾客端不能提交订单。
- `locations`：房间/区域列表，每个区域包含 `tables` 桌号列表。

需要上传并部署：
1. `cloudfunctions/getStoreSettings`
2. `cloudfunctions/adminSettings`
3. `cloudfunctions/createOrder`（本次增加了营业状态和房间/桌号云端校验）

部署后：
- 顾客点单页会通过 `getStoreSettings` 读取门店名称、营业状态和房间/桌号。
- 店长工作台会多一个“门店设置”入口，用 `adminSettings` 保存配置。
- 店长把营业状态改为暂停后，顾客端会提示暂停点单，`createOrder` 云函数也会拒绝新订单。

## 顾客会员资料 members
在云数据库创建 `members` 集合，权限选择 `无权限[ADMINONLY]`。然后导入：

- `cloud-database/members.json`

该文件是 JSON Lines 格式，包含 4 条演示会员。初始 `openid` 为空，正式测试某个微信用户时，把该顾客真实 `openid` 填到对应会员记录里。

会员记录字段示例：
```json
{
  "_id": "u1001",
  "openid": "顾客真实 openid",
  "nickname": "林小姐",
  "phone": "138****2106",
  "levelId": "basic",
  "active": true,
  "createdAt": "2026/5/11 00:00:00",
  "updatedAt": "2026/5/11 00:00:00"
}
```

需要上传并部署：
1. `cloudfunctions/getMyMemberProfile`
2. `cloudfunctions/login`（本次增加了从 `members` 识别顾客会员身份）

部署后：
- 顾客点单页会优先读取自己的云端会员资料，并按真实 `levelId` 展示可点餐食。
- “我的”页会展示云端会员昵称、手机号、会员等级和权益。
- 如果没有绑定 `members.openid`，页面会继续使用本地演示会员兜底，方便开发调试。

## 店长会员管理云函数
需要上传并部署：

1. `cloudfunctions/adminMembers`

部署后，店长工作台会出现“会员管理”入口。该页面会通过 `adminMembers`：

- 读取 `members` 会员列表和 `memberLevels` 等级列表。
- 新增会员。
- 编辑会员姓名、手机号、绑定 openid、会员等级和启用状态。
- 停用会员，停用后该会员不会再被 `login` 和 `getMyMemberProfile` 识别为有效顾客。

绑定真实顾客时，把该顾客通过 `login` 云函数拿到的 `openid` 填到对应会员的“绑定 openid”输入框并保存即可。
