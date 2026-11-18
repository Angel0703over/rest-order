#!/usr/bin/env node
/**
 * 生成 CloudBase `users` 集合导入文件（JSON Lines）。
 *
 * 用法：
 *   node scripts/generate-users-seed.js --openid oXXXXXXXXXXXXXXXXXXXXXXXX --name 店长
 *   node scripts/generate-users-seed.js --openid oYYYYYYYYYYYYYYYYYYYYYYYY --role staff --name 陈小妹
 *
 * 说明：
 * - openid 来自小程序端调用 login 云函数后返回的 openid，必须替换为真实值。
 * - 输出默认写入 cloud-database/users.import.json（该文件含真实 openid，已在 .gitignore 中忽略）。
 * - 导入方式：微信开发者工具 → 云开发控制台 → 数据库 → users 集合 → 导入（JSON Lines）。
 */
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_OUT = path.join('cloud-database', 'users.import.json');
const PLACEHOLDER_PATTERN = /REPLACE|你的真实|^o?x{10,}$/i;
const ROLES = ['owner', 'staff', 'customer'];

function parseArgs(argv) {
  const options = {
    openid: '',
    name: '',
    role: 'owner',
    staffId: '',
    memberId: '',
    phone: '',
    title: '',
    out: DEFAULT_OUT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`参数 --${key} 缺少取值`);
    }
    index += 1;
    switch (key) {
      case 'openid':
        options.openid = value.trim();
        break;
      case 'name':
        options.name = value.trim();
        break;
      case 'role':
        options.role = value.trim();
        break;
      case 'staff-id':
        options.staffId = value.trim();
        break;
      case 'member-id':
        options.memberId = value.trim();
        break;
      case 'phone':
        options.phone = value.trim();
        break;
      case 'title':
        options.title = value.trim();
        break;
      case 'out':
        options.out = value.trim();
        break;
      default:
        throw new Error(`未知参数 --${key}`);
    }
  }

  return options;
}

function validate(options) {
  if (!options.openid) {
    throw new Error('缺少 --openid，请填入 login 云函数返回的真实 openid');
  }
  if (PLACEHOLDER_PATTERN.test(options.openid)) {
    throw new Error('openid 仍是占位值，请替换为 login 云函数返回的真实 openid');
  }
  if (/\s/.test(options.openid)) {
    throw new Error('openid 不能包含空白字符');
  }
  if (options.openid.length < 8) {
    throw new Error('openid 长度异常（应至少 8 位），请确认复制完整');
  }
  if (!ROLES.includes(options.role)) {
    throw new Error(`--role 只能是 ${ROLES.join(' / ')}`);
  }
  if (options.role !== 'customer' && !options.name) {
    throw new Error('店长/员工记录必须提供 --name');
  }
  if (options.role === 'customer' && !options.memberId) {
    throw new Error('顾客记录必须提供 --member-id');
  }
}

function formatNow() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    '-',
    pad(now.getMonth() + 1),
    '-',
    pad(now.getDate()),
    ' ',
    pad(now.getHours()),
    ':',
    pad(now.getMinutes()),
    ':',
    pad(now.getSeconds()),
  ].join('');
}

function buildRecord(options) {
  const now = formatNow();
  const record = {
    _id: `${options.role}-${options.openid}`,
    openid: options.openid,
    role: options.role,
    memberId: options.memberId,
    staffId: options.staffId,
    name: options.name,
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  if (options.phone) {
    record.phone = options.phone;
  }
  if (options.title) {
    record.title = options.title;
  }

  return record;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  validate(options);

  const record = buildRecord(options);
  const outPath = path.resolve(process.cwd(), options.out);
  const outDir = path.dirname(outPath);

  if (!fs.existsSync(outDir)) {
    throw new Error(`输出目录不存在：${outDir}`);
  }

  fs.writeFileSync(outPath, `${JSON.stringify(record)}\n`, 'utf8');

  console.log(`已生成 ${options.out}`);
  console.log(JSON.stringify(record, null, 2));
  console.log('');
  console.log('下一步：');
  console.log('1. 微信开发者工具 → 云开发控制台 → 数据库 → 新建 users 集合（若不存在）');
  console.log(`2. 选择 users 集合 → 导入 → 选中 ${options.out} → 冲突处理选 Upsert`);
  console.log('3. 重新编译小程序，该 openid 应进入对应角色的入口页');
}

try {
  main();
} catch (error) {
  console.error(`生成失败：${error.message}`);
  process.exitCode = 1;
}
