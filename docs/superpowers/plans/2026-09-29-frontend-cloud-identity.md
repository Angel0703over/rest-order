# 前端身份统一为云会话 实施记录

> 高风险改动（P0）：统一前端身份来源，移除对本地 mock 身份的门禁依赖。

**目标：** 前端页面访问控制以 `login` 云函数返回的云会话为准，本地 mock 身份仅作为无云会话时的兜底；真实店长在冷启动时不会因云会话尚未返回而被误判为顾客并跳转无权限页。

**技术栈：** 微信小程序、CloudBase、Node.js 测试（无框架）。

---

## 背景问题

改动前存在**身份双轨**：
- 云函数按真实 `openid` 校验权限（服务端可信）。
- 前端 `utils/auth.js` 的 `getCurrentUser/ensureAdminAccess` 却读取 `data/users.js` 的 mock 用户，页面入口由 mock 决定。

后果：真实 openid 不在 mock 列表时，前端把用户当成默认顾客，店长无法进入后台。

## 方案

1. **身份来源**：`utils/auth.js` 缓存云会话用户（`applyCloudSession`），`getCurrentUser` 优先返回该用户；无云会话时回退 mock。
2. **会话就绪**：`enterAdminPage(page, permission, onGranted)` 在云会话 pending 时挂起，`whenSessionSettled` 后重新判定；未就绪时既不跳转也不放行。
3. **生产端**：`utils/session.js` 的 `storeSession` 推送会话到 auth；`markSessionFailed` 处理失败；`app.js` 区分「云未配置 / 登录失败」，避免会话永久 pending。
4. **页面接入**：9 个管理页 `onShow` 改用 `enterAdminPage`。

## 关键决策

- **权限模型仍按角色推导**（`rolePermissions`），与云函数端映射一致，避免前后端两套权限来源。
- **pending 判定基于全局标志**（`cloudReady` / `cloudSessionReady` / `cloudSessionError`），不依赖一次性状态，行为确定。
- `wx` 引用在 `enterAdminPage` 调用时捕获，避免异步回调阶段全局引用失效。

## 验证

- 单元测试：`tests/auth.test.js` 新增 4 条；`tests/session.test.js` 新增 2 条。
- 页面冒烟：以 stub 驱动 9 个管理页 `onShow`，顾客身份全部重定向无权限页、店长身份全部放行。
- `npm test`（7 文件）全部通过。

## 影响文件

- `utils/auth.js`、`utils/session.js`、`app.js`
- `pages/admin/{home,settings,staff,categories,levels,members,meals,orders}/index.js`
- `pages/staff/home/index.js`
- `tests/auth.test.js`、`tests/session.test.js`
