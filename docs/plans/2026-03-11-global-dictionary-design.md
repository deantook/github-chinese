# 全局词典重构设计

## 1. 目标

- 取消「按页面单独设置词典」的源码设计，改为**单一全局词典**。
- 运行时仅使用一张全局 map，不按 URL/路径选择词典。
- 保持「长短语优先」匹配：如 `Upload files` 与 `files` 分别建条、分别匹配，避免误替换。

## 2. 架构与目录

- **词典**：新建唯一词典文件 `src/dictionaries/global.ts`，内含一个 `Record<string, string>`，将原 common / nav / issue_pr / settings 全部合并进该对象。文件内用注释分区（如 `// === 通用`、`// === 导航与仓库`、`// === 设置`、`// === Issue/PR`），仅作阅读与维护用，不参与运行时逻辑。
- **入口**：`src/dictionaries/index.ts` 仅从 `global.ts` 引入该 map，通过 `getExactMap()` 返回；保留 `getPatternRules()` 的签名与实现（当前返回空数组），避免调用方改动。
- **删除**：移除 `common.ts`、`nav.ts`、`issue_pr.ts`、`settings.ts` 四个文件。翻译引擎、text-replacer、selectors 仍只依赖 `getExactMap()`，不依赖具体词典文件。

## 3. 数据与匹配语义

- **数据**：`global.ts` 中每条 key 唯一。若同一英文在不同场景需不同译法，只保留一条（以最常用或最长的为准）。例如同时保留 `'Upload files': '上传文件'` 与 `'files': '文件'`。
- **匹配**：不修改现有逻辑。`text-replacer.ts` 已按 key 长度降序排序，对每个文本节点用 `split(en).join(zh)` 依次替换，先匹配长短语再匹配短词，保证「Upload files」与「files」分开匹配。
- **选择器**：`selectors.ts` 仍使用同一张 `getExactMap()`，行为不变。

## 4. 实现要点

- 合并时注意去重：若多文件中出现相同 key，以最终期望的译文为准保留一条。
- 不新增按 URL 或 pathname 选择词典的逻辑；不改变翻译引擎、dom-watcher、content 入口的调用方式。
