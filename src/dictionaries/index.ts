import { GLOBAL_MAP } from './global';

export interface PatternRule {
  pattern: RegExp | string;
  replacement: string;
}

export function getExactMap(): Record<string, string> {
  return GLOBAL_MAP;
}

export function getPatternRules(): PatternRule[] {
  return [];
}
