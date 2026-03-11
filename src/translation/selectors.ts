import type { SelectorRule } from './types';
import { getExactMap } from '../dictionaries';
import { replaceTextInSubtree } from './text-replacer';

const exactMap = getExactMap();

function translateByMap(text: string): string {
  const t = text.trim();
  return exactMap[t] ?? text;
}

/**
 * 精准选择器规则：只替换匹配到的元素的直接文本（或首个子文本节点），避免误伤。
 * GitHub 的 DOM 会变，这里先放少量通用规则，后续按需扩展。
 */
export const SELECTOR_RULES: SelectorRule[] = [
  // 仓库顶部 Tab：Code, Issues, Pull requests 等
  { selector: '[data-tab-item="code"]' },
  { selector: '[data-tab-item="issues"]' },
  { selector: '[data-tab-item="pull-requests"]' },
  { selector: '[data-tab-item="actions"]' },
  { selector: '[data-tab-item="projects"]' },
  { selector: '[data-tab-item="security"]' },
  { selector: '[data-tab-item="pulse"]' },
  { selector: '[data-tab-item="contributors"]' },
  { selector: '[data-tab-item="insights"]' },
  { selector: '[data-tab-item="settings"]' },
  // 仓库顶栏导航内所有 Tab 文案（含无 data-tab-item 的项，按 span 兜底）
  { selector: 'nav[class*="LocalNavigation"] span[data-component="text"]' },
  // 仓库设置页：重命名仓库的 label（React 常先插入节点再填文本，选择器兜底）
  { selector: 'label[for="rename-field"]' },
  // 仓库设置页 options_bucket 内标题（如 Default branch 等，选择器兜底）
  { selector: '#options_bucket h2.Subhead-heading' },
  // 仓库设置页 tool-tip（如 Rename branch 等，自定义元素后渲染兜底）
  { selector: '#options_bucket tool-tip' },
  // 仓库顶栏操作按钮：Pin / Fork / Watch / Star（子树内按词典替换，支持 "Fork 0" → "复刻 0"）
  // 优先通过 aria-label 匹配 Star / Unstar 按钮，避免依赖具体 DOM 结构
  { selector: 'button[aria-label*="Star"], button[aria-label*="Unstar"]', subtreeReplace: true },
  // 兼容旧的 pagehead-actions 容器结构（有时文本包在 span.d-inline 里）
  { selector: 'ul[class*="pagehead-actions"] button', subtreeReplace: true },
  { selector: '#repository-container-header ul.pagehead-actions button span.d-inline', subtreeReplace: true },
  // 仓库右侧边栏 BorderGrid 内链接（Releases、About 等）
  { selector: 'div.BorderGrid a' },
  // 仓库文件列表顶部按钮：Code / Add file（新 React 布局）
  { selector: 'span.react-directory-add-file-button' },
  { selector: 'button span.prc-Button-Label-FWkx3[data-component="text"]' },
];

export function applySelectorRules(root: Node): void {
  if (!(root instanceof Element)) return;
  const doc = root.ownerDocument;
  if (!doc) return;

  for (const rule of SELECTOR_RULES) {
    const nodes = root.querySelectorAll(rule.selector);
    for (const el of nodes) {
      if (rule.subtreeReplace) {
        replaceTextInSubtree(el, exactMap);
        continue;
      }
      if (rule.text !== undefined) {
        const raw = el.textContent?.trim() ?? '';
        if (raw) replaceTextInSubtree(el, { [raw]: rule.text });
        continue;
      }
      const raw = el.textContent?.trim() ?? '';
      if (!raw) continue;
      const translated = translateByMap(raw);
      if (translated !== raw) {
        // 只替换文本节点，保留子元素（如 Tab 前的图标 SVG），避免 el.textContent 清空整颗子树
        replaceTextInSubtree(el, { [raw]: translated });
      }
    }
  }
}
