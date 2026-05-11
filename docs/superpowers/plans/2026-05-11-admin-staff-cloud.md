# Admin Staff Cloud Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move owner staff management from local mock data to the CloudBase `users` collection through an `adminStaff` cloud function.

**Architecture:** Staff identity and staff management both use `users` as the single source of truth, because `login` already routes users by `users.role`. `adminStaff` is owner-only, lists owner and staff records, creates staff records with empty `openid`, updates staff profile fields, and soft-disables staff accounts instead of deleting documents.

**Tech Stack:** WeChat Mini Program, CloudBase cloud functions, CloudBase document database, Node.js tests.

---

### Task 1: Cloud Contract Tests

**Files:**
- Modify: `tests/cloud.test.js`
- Modify: `utils/cloudApi.js`
- Create: `cloudfunctions/adminStaff/index.js`
- Create: `cloudfunctions/adminStaff/package.json`

- [ ] **Step 1: Write failing tests**

Add tests that prove `utils/cloudApi.adminStaff(payload)` calls the `adminStaff` cloud function, `cloudfunctions/adminStaff` lists/creates/updates/disables staff for owner users, and `login` does not route inactive staff into the staff workspace.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`

Expected: FAIL because `adminStaff` does not exist yet and inactive staff login is not handled.

- [ ] **Step 3: Implement minimal cloud code**

Add `adminStaff` to `utils/cloudApi.js`. Create `cloudfunctions/adminStaff` with owner verification against `users`, list records where `role` is `owner` or `staff`, create new staff records, update staff records, and soft-disable staff records. Update `login` to treat `active:false` staff as disabled.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test`

Expected: PASS.

### Task 2: Admin Staff Page Migration

**Files:**
- Modify: `pages/admin/staff/index.js`
- Modify: `pages/admin/staff/index.wxml`

- [ ] **Step 1: Replace local staff source**

Load staff with `adminStaff({ action: 'list' })` in `onShow`, keep a local draft for editing, and show loading/feedback text.

- [ ] **Step 2: Wire create/save/delete actions**

Call `adminStaff({ action: 'create', staff })`, `adminStaff({ action: 'update', staffId, staff })`, and `adminStaff({ action: 'disable', staffId })`. Refresh the cloud list after each successful mutation.

- [ ] **Step 3: Preserve owner safety**

Disable delete/toggle for owner rows in the UI and keep the cloud function check as the real guard.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

### Task 3: Documentation And Deployment Notes

**Files:**
- Modify: `roadmap.md`
- Modify: `cloud-development.md`

- [ ] **Step 1: Update roadmap**

Mark `adminStaff` migration as completed after implementation and note that staff records live in `users`.

- [ ] **Step 2: Update cloud docs**

Document that `cloudfunctions/adminStaff` must be uploaded with cloud-side dependency install and that staff login requires binding a real employee `openid` to a `users` record.

- [ ] **Step 3: Final verification**

Run: `npm test`

Expected: PASS.
