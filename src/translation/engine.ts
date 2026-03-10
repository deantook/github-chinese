import type { TranslationContext } from './types';
import { applySelectorRules } from './selectors';
import { replaceTextInSubtree } from './text-replacer';
import { getExactMap } from '../dictionaries';

export function translateNodeTree(root: Node): void {
  if (!root.ownerDocument) return;
  applySelectorRules(root);
  replaceTextInSubtree(root, getExactMap());
}

export function translateText(text: string, _context?: TranslationContext): string {
  const map = getExactMap();
  const trimmed = text.trim();
  return map[trimmed] ?? text;
}
