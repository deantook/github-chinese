import { translateNodeTree } from '../translation/engine';

export function runTranslationOn(root: Node): void {
  translateNodeTree(root);
}
