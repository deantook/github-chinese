import type { SelectorRule } from './types';
import { getExactMap } from '../dictionaries';

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
  // 仓库设置页：重命名仓库的 label（React 常先插入节点再填文本，选择器兜底）
  { selector: 'label[for="rename-field"]' },
  // 仓库设置页 options_bucket 内标题（如 Default branch 等，选择器兜底）
  { selector: '#options_bucket h2.Subhead-heading' },
  // 仓库设置页 tool-tip（如 Rename branch 等，自定义元素后渲染兜底）
  { selector: '#options_bucket tool-tip' },
];

export function applySelectorRules(root: Node): void {
  if (!(root instanceof Element)) return;
  const doc = root.ownerDocument;
  if (!doc) return;

  for (const rule of SELECTOR_RULES) {
    const nodes = root.querySelectorAll(rule.selector);
    for (const el of nodes) {
      if (rule.text !== undefined) {
        el.textContent = rule.text;
        continue;
      }
      const raw = el.textContent?.trim() ?? '';
      if (!raw) continue;
      const translated = translateByMap(raw);
      if (translated !== raw) el.textContent = translated;
    }
  }
}
