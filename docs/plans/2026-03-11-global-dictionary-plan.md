# 全局词典重构 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将按页面分文件的词典（common / nav / issue_pr / settings）合并为单一全局词典文件，运行时仅使用一张 map，保持长短语优先匹配。

**Architecture:** 新建 `src/dictionaries/global.ts` 内含一个 `Record<string, string>`，按「通用 → 导航与仓库 → Issue/PR → 设置」顺序合并所有条目，重复 key 以后出现的为准（与当前 index 合并顺序一致）。`index.ts` 改为从 global 导出；删除四个旧词典文件。

**Tech Stack:** TypeScript，Chrome 扩展 MV3，无新依赖。

---

### Task 1: 新建全局词典 global.ts

**Files:**
- Create: `src/dictionaries/global.ts`

**Step 1: 创建文件并写入合并后的词典**

将 `common.ts`、`nav.ts`、`issue_pr.ts`、`settings.ts` 的全部条目按顺序合并进一个对象，文件内用注释分区：

- `// === 通用`（原 common）
- `// === 导航与仓库`（原 nav）
- `// === Issue/PR`（原 issue_pr）
- `// === 设置与页脚`（原 settings）

重复 key 时保留**后合并**的译文（即与当前 `getExactMap()` 的 `{ ...common, ...nav, ...issuePr, ...settings }` 行为一致）。导出形式：

```ts
export const GLOBAL_MAP: Record<string, string> = {
  // === 通用
  'Loading…': '加载中…',
  // ... 其余条目
};
```

**Step 2: 校验**

- 确认无语法错误；条目总数 = common + nav + issue_pr + settings 去重后的数量（后续 key 覆盖前者）。

---

### Task 2: 修改 index 仅从 global 导出

**Files:**
- Modify: `src/dictionaries/index.ts`

**Step 1: 替换实现**

删除对 `nav`、`issuePr`、`common`、`settings` 的 import。改为从 `./global` 引入 `GLOBAL_MAP`，`getExactMap()` 返回该 map（可直接 `return GLOBAL_MAP` 或 `return { ...GLOBAL_MAP }`，保持 `Record<string, string>`）。保留 `getPatternRules()` 及其返回 `[]` 的实现与 `PatternRule` 类型。

**Step 2: 运行构建**

在项目根目录执行：`npm run build`（或当前项目使用的构建命令）。  
预期：构建成功，无类型错误。

---

### Task 3: 删除旧词典文件

**Files:**
- Delete: `src/dictionaries/common.ts`
- Delete: `src/dictionaries/nav.ts`
- Delete: `src/dictionaries/issue_pr.ts`
- Delete: `src/dictionaries/settings.ts`

**Step 1: 删除四个文件**

**Step 2: 再次构建**

运行：`npm run build`。  
预期：构建成功。若有测试，运行测试并全部通过。

---

### Task 4: 提交与设计文档引用

**Step 1: 提交**

```bash
git add src/dictionaries/global.ts src/dictionaries/index.ts
git add docs/plans/2026-03-11-global-dictionary-design.md docs/plans/2026-03-11-global-dictionary-plan.md
git rm src/dictionaries/common.ts src/dictionaries/nav.ts src/dictionaries/issue_pr.ts src/dictionaries/settings.ts
git commit -m "refactor(dictionaries): merge into single global map, remove per-page files"
```

**Step 2: 可选验证**

在 Chrome 中加载扩展，打开 github.com，确认导航、设置页、Issue/PR 等文案仍按预期汉化，且「Upload files」与「files」等长短语优先匹配正常。
