import { RuleContext } from './RuleContext';
import { RuleResult } from './RuleResult';

export interface IRule {
  id: string;
  name: string;
  description?: string;
  evaluate(context: RuleContext): Promise<RuleResult> | RuleResult;
}
