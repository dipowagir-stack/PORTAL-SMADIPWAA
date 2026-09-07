import { IRule } from './types';
import { ruleRegistry } from './RuleRegistry';

export class RuleLoader {
  static loadRules(rules: IRule[]): void {
    rules.forEach((rule) => {
      ruleRegistry.register(rule);
    });
  }
}
