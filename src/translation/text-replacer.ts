import { getExactMap, getPatternRules, type PatternRule } from '../dictionaries';

/** 将带 {name} 的模板规则编译为正则与占位符名列表，用于匹配并代入译文 */
interface CompiledPatternRule {
  regex: RegExp;
  replacementTemplate: string;
  placeholderNames: string[];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compilePatternRule(rule: PatternRule): CompiledPatternRule {
  const { pattern, replacement } = rule;
  const placeholderNames: string[] = [];
  const re = /\{(\w+)\}/g;
  let regexStr = '';
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pattern)) !== null) {
    regexStr += escapeRegex(pattern.slice(lastIndex, m.index));
    const isLast = re.lastIndex >= pattern.length;
    regexStr += isLast ? '(.+)' : '(.+?)';
    placeholderNames.push(m[1]);
    lastIndex = re.lastIndex;
  }
  regexStr += escapeRegex(pattern.slice(lastIndex));
  return {
    regex: new RegExp(regexStr, 'gi'),
    replacementTemplate: replacement,
    placeholderNames,
  };
}

function applyReplacementTemplate(
  template: string,
  placeholderNames: string[],
  captures: string[],
): string {
  return template.replace(/\{(\w+)\}/g, (_full, name: string) => {
    const i = placeholderNames.indexOf(name);
    return i >= 0 && captures[i] !== undefined ? captures[i] : `{${name}}`;
  });
}

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'INPUT', 'TEXTAREA', 'CODE', 'PRE']);
const SKIP_CLASSES = [
  'blob-code',
  'blob-wrapper',
  'markdown-body',
  'highlight',
  'js-file-line',
  'line',
  'pl-',
  'cm-',
  'CodeMirror',
];

function shouldSkipElement(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName)) return true;
  const cls = el.className;
  if (typeof cls !== 'string') return false;
  for (const skip of SKIP_CLASSES) {
    if (cls.includes(skip)) return true;
  }
  return false;
}

function isSensitive(node: Node, root: Node): boolean {
  let cur: Node | null = node;
  while (cur && cur !== root) {
    if (cur instanceof Element && shouldSkipElement(cur)) return true;
    cur = cur.parentElement;
  }
  return false;
}

export function replaceTextInSubtree(root: Node, exactMap: Record<string, string>): void {
  const doc = root.ownerDocument;
  if (!doc) return;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (isSensitive(node, root)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let n: Node | null = walker.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) nodes.push(n as Text);
    n = walker.nextNode();
  }

  // 长短语优先，避免 "Home" 先于 "Home Feed" 被替换
  const entries = Object.entries(exactMap).sort((a, b) => b[0].length - a[0].length);

  // 带 {placeholder} 的模式规则，按模式键长度降序，长模式优先；不区分大小写 (gi)
  const patternRules = getPatternRules()
    .sort((a, b) => b.pattern.length - a.pattern.length)
    .map(compilePatternRule);

  for (const textNode of nodes) {
    let raw = textNode.textContent ?? '';
    if (!raw.trim()) continue;
    let changed = false;
    for (const [en, zh] of entries) {
      if (zh === en || !raw.includes(en)) continue;
      raw = raw.split(en).join(zh);
      changed = true;
    }
    for (const rule of patternRules) {
      const prev = raw;
      raw = raw.replace(rule.regex, (_match, ...captures: string[]) =>
        applyReplacementTemplate(rule.replacementTemplate, rule.placeholderNames, captures),
      );
      if (raw !== prev) changed = true;
    }
    if (changed) textNode.textContent = raw;
  }
}
