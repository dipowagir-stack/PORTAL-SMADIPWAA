export interface RuleContext {
  params: Record<string, any>;
  state: Record<string, any>;
  env?: Record<string, any>;
}
