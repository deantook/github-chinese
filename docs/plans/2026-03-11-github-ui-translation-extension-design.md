## GitHub UI 汉化插件（Chrome 扩展）设计文档

### 1. 背景与目标

- **目标**：在桌面浏览器中访问 `github.com` 时，对 GitHub 官方 UI 的英文文本进行中文汉化，覆盖尽可能多的官方界面区域。
- **平台**：Chrome / Edge 等基于 Chromium 的浏览器，使用 **Manifest V3**。
- **翻译数据**：全部内置在扩展中（词典打包在扩展代码里），暂不依赖远程服务。
- **翻译风格**：保留常见专业缩写（如 PR / CI / Actions 等），其他内容进行自然的中文化。
- **实现策略**：混合模式：
  - 固定 UI 元素（导航栏、顶部菜单、按钮等）用 **精准选择器规则** 精确替换；
  - 通用短语（如 Loading、Updated 等）使用 **文本替换规则**，并排除代码区、编辑器等敏感区域。

### 2. 总体架构

从高层可以分为六个层次：

1. **浏览器集成层**（Manifest / 权限 / 入口）
2. **内容脚本层**（Content Scripts）
3. **翻译引擎层**（Translation Engine）
4. **词典层**（Dictionaries）
5. **配置与状态层**（Settings & State）
6. **UI 层（Popup）**

它们的职责与关系如下。

#### 2.1 浏览器集成层

- 文件：`manifest.json`（可由 TS 生成，也可手写）
- 关键内容：
  - 注册 `content_scripts`，仅匹配 `https://github.com/*`。
  - 注册 `background.service_worker`（MV3 的后台脚本），用于管理全局状态与消息通信。
  - 注册 `action`（扩展图标 Popup），用于给用户提供启用/禁用汉化的总开关。
  - 申请必要权限：
    - `scripting`（如需要），`storage`，`activeTab` 等。

#### 2.2 内容脚本层

- 入口文件：`src/content/index.ts`
- 职责：
  - 在 GitHub 页面加载时被注入。
  - 启动时从存储读取「是否启用汉化」的配置（`enabled`）。
  - 若开启：
    - 对当前 `document.body` 执行一次完整翻译。
    - 创建并启动 `MutationObserver`，监听 DOM 变化，对新增节点执行增量翻译。
  - 监听来自后台脚本或 popup 的消息：
    - 当用户切换开关时，同步开启/关闭汉化逻辑。

- 补充模块：
  - `src/content/dom-watcher.ts`：封装对 `MutationObserver` 的注册和销毁逻辑。
  - `src/content/translate-runner.ts`：对某个根节点调用翻译引擎，并进行必要的过滤。

#### 2.3 翻译引擎层

- 核心文件：`src/translation/engine.ts`
- 对外暴露的主要接口：
  - `translateNodeTree(root: Node): void`：对一个 DOM 子树进行翻译。
  - `translateText(text: string, context?: TranslationContext): string`：对单个文本进行翻译（供特殊场景复用）。
- 内部模块：
  - `src/translation/selectors.ts`：
    - 定义一组精准选择器规则（例如导航栏、顶部菜单、侧边栏、常见按钮）。
    - 每条规则通常包含：
      - `selector`：CSS 选择器。
      - `target`：如何取值（如 `textContent` / `innerText` / attribute）。
      - `key`：对应词典中的 key，或直接给出目标中文。
  - `src/translation/text-replacer.ts`：
    - 遍历文本节点，对文本执行替换。
    - 采用词典中定义的「精确匹配」和必要的模式匹配（例如前后缀）。
    - 会跳过敏感区域（见下节）。
  - `src/translation/types.ts`：
    - 定义 `TranslationContext`，规则类型等类型信息。

#### 2.4 词典层

- 目标：将所有英文→中文翻译词条内置在扩展中，同时保持结构清晰、便于维护和扩展。
- 文件组织建议：
  - `src/dictionaries/nav.ts`：顶部与侧边导航栏相关词条。
  - `src/dictionaries/issue_pr.ts`：Issue / PR 列表、详情页面常见文案与状态。
  - `src/dictionaries/common.ts`：全站通用的短语（如 Loading、Updated、View all 等）。
  - `src/dictionaries/index.ts`：聚合导出，提供统一接口：
    - `getExactMap(): Record<string, string>`：基于完整字符串的替换。
    - `getPatternRules(): PatternRule[]`（可选）：针对更复杂场景的模式规则。

- 风格约束：
  - 保留常见缩写，例如：
    - Pull Request → PR（而不是长句中文）。
    - Continuous Integration → CI。
  - 其它内容进行自然中文翻译，保持简洁易懂。

#### 2.5 配置与状态层

- 现阶段只需要一个配置项：
  - `enabled: boolean`：是否启用汉化。
- 存储方式：
  - 使用 `chrome.storage.sync` 或 `chrome.storage.local`（优先 sync 以在多设备间同步）。
- 封装：
  - 在 `src/shared/storage.ts` 中暴露：
    - `getEnabled(): Promise<boolean>`
    - `setEnabled(value: boolean): Promise<void>`
  - 由 background、content、popup 统一通过这些函数访问存储。

- 消息协议：
  - 在 `src/shared/messages.ts` 中约定：
    - 消息类型（例如 `SYNC_STATE`, `TOGGLE_ENABLED`）。
    - 消息 payload 的类型定义。
  - content script 监听来自 background 或 popup 的 `SYNC_STATE` 消息，在收到开启状态后立即触发一次翻译。

#### 2.6 UI 层（Popup）

- 文件：
  - `src/popup/index.html`：简单 HTML 模板。
  - `src/popup/index.ts`：控制逻辑。
- 功能：
  - 展示一个总开关（复选框或 toggle）。
  - 在加载时读取当前 `enabled` 状态并更新 UI。
  - 用户切换开关时：
    - 写入新的 `enabled` 值到 `chrome.storage`。
    - 通过 `chrome.runtime.sendMessage` 或 `chrome.tabs.sendMessage` 通知内容脚本更新状态。
  - 可选地展示：
    - 当前版本号。
    - 项目的 GitHub 链接。

### 3. DOM 处理与性能考虑

#### 3.1 初始翻译

- 在内容脚本启动后：
  1. 调用 `getEnabled()` 读取开关状态。
  2. 若为开启：
     - 对 `document.body` 作为根节点调用 `translateNodeTree`。
     - 这一步将对现有 DOM 进行一次性遍历和汉化。

#### 3.2 动态更新（MutationObserver）

- GitHub 是一个 SPA，许多界面通过 PJAX / Ajax 局部刷新。
- 通过 `MutationObserver` 监听：
  - 新增节点（`childList`）。
  - 可根据需要监听属性变化（影响文本的 attribute）。
- 对新增节点的处理策略：
  - 避免对整个 `document.body` 重复扫描。
  - 只对 `MutationRecord.addedNodes` 中的元素作为根节点调用 `translateNodeTree`。
  - 如需，控制队列与节流，以避免高频变更带来的性能问题。

#### 3.3 敏感区域排除

- 为避免误伤用户内容和代码，翻译过程必须排除以下区域：
  - 代码相关：`<pre>`, `<code>`, 代码高亮容器（例如 `.blob-code`, `.blob-wrapper` 等）。
  - Markdown 渲染区域正文：`.markdown-body` 内的用户内容可以不翻译，或仅进行非常保守的处理。
  - 输入与编辑器：`<input>`, `<textarea>`, 以及富文本编辑器相关 DOM。
- 实现方式：
  - 在遍历节点时，若命中这些元素或类名，则不再深入其子节点处理。

### 4. 技术栈与构建

- 语言：TypeScript。
- 构建工具：使用轻量方案（如 Vite 或 esbuild）：
  - 输出多个入口：
    - `dist/content.js`
    - `dist/background.js`
    - `dist/popup.js`
  - 拷贝静态资源（`manifest.json`, `popup/index.html` 等）到打包目录。
- 不引入前端框架（如 React）：
  - Popup UI 保持简单的原生 DOM 操作即可。
  - 避免不必要的 bundle 体积和复杂度。

### 5. 交互与数据流示意

1. **浏览器启动 / 扩展加载**：
   - `background` 脚本启动，准备监听来自 popup/content 的消息。
2. **用户打开 GitHub 页面**：
   - Chrome 按 manifest 注入 `content/index.js`。
   - 内容脚本读取 `enabled` 状态：
     - 若启用，则立即对页面进行初始翻译，并注册 `MutationObserver`。
3. **用户点击扩展图标，打开 popup**：
   - `popup/index.js` 读取当前 `enabled` 值并更新 UI。
   - 用户切换开关：
     - 写入新状态到 `chrome.storage`。
     - 通过消息机制广播状态变更（例如向当前激活的 GitHub 标签页发送 `SYNC_STATE`）。
4. **内容脚本收到状态变更消息**：
   - 若从关闭 → 开启：
     - 立即对当前页面再执行一次完整翻译。
     - 确保 `MutationObserver` 已经启动。
   - 若从开启 → 关闭：
     - 可以停止对后续 DOM 变化的处理（可选暂时不还原已翻译文本，以简化实现）。

### 6. 可扩展性预留

虽然当前版本只包含一个总开关和内置词典，但在设计上预留以下扩展点：

- 可以在 `storage` 中增加更多配置项（例如分模块开关）。
- 可以新增一个选项页（Options Page），提供更细粒度的控制。
- 词典层通过模块化拆分与统一导出，未来可以接入：
  - 远程词典同步（从某个 GitHub 仓库拉取 JSON）。
  - 用户自定义词条覆盖机制（合并或覆盖内置词典）。

### 7. 当前设计范围与后续步骤

本设计文档明确了：

- 支持平台与目标站点（Chrome MV3 + `github.com`）。
- 分层架构（浏览器集成 / 内容脚本 / 翻译引擎 / 词典 / 配置 / Popup）。
- 内容脚本与翻译引擎的协作流程，以及对 SPA / 动态 DOM 的处理方式。
- 词典的组织形式与翻译风格约束。
- 存储与消息协议的基本方式。

接下来的工作是基于本设计，编写一个具体的实现计划（包括要创建的文件、代码入口、构建配置和最小可运行版本的功能清单），并在此基础上搭建初始可运行框架。

