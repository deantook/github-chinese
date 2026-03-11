export interface TranslationContext {
  node?: Node;
  tagName?: string;
  /** e.g. "nav", "button", "sidebar" */
  hint?: string;
}

export interface SelectorRule {
  selector: string;
  /** If set, replace text with this; otherwise use dictionary lookup on current text */
  text?: string;
  /** If true, replace all dictionary entries in element subtree (e.g. "Fork 0" → "复刻 0") */
  subtreeReplace?: boolean;
}
