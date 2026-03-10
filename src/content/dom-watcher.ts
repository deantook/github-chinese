export type OnNodeAdded = (node: Node) => void;

let observer: MutationObserver | null = null;

function isElementOrHasChildren(node: Node): boolean {
  if (node instanceof Element) return true;
  return node.childNodes.length > 0;
}

export function startDomWatcher(callback: OnNodeAdded): void {
  if (observer) return;
  const body = document.body;
  if (!body) return;

  const roots = new Set<Node>();
  observer = new MutationObserver((records) => {
    roots.clear();
    for (const record of records) {
      if (record.type === 'childList') {
        Array.from(record.addedNodes).forEach((node) => {
          if (isElementOrHasChildren(node)) roots.add(node);
        });
      }
      if (record.type === 'characterData') {
        const parent = record.target.parentElement;
        if (parent) roots.add(parent);
      }
    }
    for (const root of roots) callback(root);
  });

  observer.observe(body, { childList: true, subtree: true, characterData: true, characterDataOldValue: true });
}

export function stopDomWatcher(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}
