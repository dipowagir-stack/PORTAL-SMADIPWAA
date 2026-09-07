import { IRule } from './types';

export class RuleRegistry {
  private rules: Map<string, IRule> = new Map();

  register(rule: IRule): void {
    if (this.rules.has(rule.id)) {
      console.warn(`Rule with id ${rule.id} already exists. Overwriting.`);
    }
    this.rules.set(rule.id, rule);
  }

  get(ruleId: string): IRule | undefined {
    return this.rules.get(ruleId);
  }

  getAll(): IRule[] {
    return Array.from(this.rules.values());
  }

  remove(ruleId: string): void {
    this.rules.delete(ruleId);
  }
}

export const ruleRegistry = new RuleRegistry();
