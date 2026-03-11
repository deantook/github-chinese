import { GLOBAL_MAP } from './global';

export interface PatternRule {
  /** 模板键，如 "opened by {author}" */
  pattern: string;
  /** 译文模板，如 "由 {author} 创建" */
  replacement: string;
}

function hasPlaceholder(key: string): boolean {
  return /\{\w+\}/.test(key);
}

/** 仅返回不含占位符的精确键值对，供逐字替换使用 */
export function getExactMap(): Record<string, string> {
  const exact: Record<string, string> = {};
  for (const [k, v] of Object.entries(GLOBAL_MAP)) {
    if (!hasPlaceholder(k)) exact[k] = v;
  }
  return exact;
}

/** 返回带 {placeholder} 的模板规则，用于模式匹配与占位符代入 */
export function getPatternRules(): PatternRule[] {
  const rules: PatternRule[] = [];
  for (const [k, v] of Object.entries(GLOBAL_MAP)) {
    if (hasPlaceholder(k)) rules.push({ pattern: k, replacement: v });
  }
  return rules;
}
