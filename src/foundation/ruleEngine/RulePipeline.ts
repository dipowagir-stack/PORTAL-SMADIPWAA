import { RuleContext } from './RuleContext';
import { RuleResult } from './RuleResult';
import { IRule } from './types';
import { RuleExecutor } from './RuleExecutor';

export class RulePipeline {
  private rules: IRule[] = [];
  private failFast: boolean = true;

  constructor(failFast: boolean = true) {
    this.failFast = failFast;
  }

  addRule(rule: IRule): this {
    this.rules.push(rule);
    return this;
  }

  async execute(context: RuleContext): Promise<{ passed: boolean; results: Record<string, RuleResult> }> {
    const results: Record<string, RuleResult> = {};
    let allPassed = true;

    for (const rule of this.rules) {
      const result = await RuleExecutor.execute(rule, context);
      results[rule.id] = result;

      if (!result.passed) {
        allPassed = false;
        if (this.failFast) {
          break;
        }
      }
    }

    return {
      passed: allPassed,
      results,
    };
  }
}
