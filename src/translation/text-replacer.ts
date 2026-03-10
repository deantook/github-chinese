import { getExactMap } from '../dictionaries';

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

  for (const textNode of nodes) {
    let raw = textNode.textContent ?? '';
    if (!raw.trim()) continue;
    let changed = false;
    for (const [en, zh] of entries) {
      if (zh === en || !raw.includes(en)) continue;
      raw = raw.split(en).join(zh);
      changed = true;
    }
    if (changed) textNode.textContent = raw;
  }
}
