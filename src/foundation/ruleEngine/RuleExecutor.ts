import { RuleContext } from './RuleContext';
import { RuleResult } from './RuleResult';
import { IRule } from './types';
import { ruleRegistry } from './RuleRegistry';

export class RuleExecutor {
  static async execute(rule: IRule, context: RuleContext): Promise<RuleResult> {
    try {
      return await rule.evaluate(context);
    } catch (error: any) {
      return {
        passed: false,
        message: `Rule execution failed: ${error.message}`,
        details: error,
      };
    }
  }

  static async executeById(ruleId: string, context: RuleContext): Promise<RuleResult> {
    const rule = ruleRegistry.get(ruleId);
    if (!rule) {
      return {
        passed: false,
        message: `Rule with id ${ruleId} not found in registry.`,
      };
    }
    return this.execute(rule, context);
  }
}
