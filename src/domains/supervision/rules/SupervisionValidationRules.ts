import { RuleContext } from '../../../foundation/ruleEngine/RuleContext';
import { RuleResult } from '../../../foundation/ruleEngine/RuleResult';
import { SupervisionSession } from '../models/SupervisionSession';
import { SupervisionEvidence } from '../models/SupervisionEvidence';
import { SUPERVISION_ADMINISTRATION_CHECKLIST } from '../models/SupervisionChecklist';

export const validateSupervisionSchedule = (session: SupervisionSession): RuleResult => {
  if (session.props.scheduledDate < Date.now()) {
    return {
      passed: false,
      message: 'Scheduled date cannot be in the past'
    };
  }
  return { passed: true };
};

export const validateSupervisionFinalization = (session: SupervisionSession, evidences: SupervisionEvidence[]): RuleResult => {
  if (session.props.status.value === 'REVISION_REQUIRED') {
    return { passed: false, message: 'Cannot finalize while revision is open.' };
  }

  // Check required items scored and evidence approved
  const requiredChecklists = SUPERVISION_ADMINISTRATION_CHECKLIST.filter(item => item.required);
  const scores = session.props.observation?.scores || {};

  for (const item of requiredChecklists) {
    if (scores[item.code] === undefined) {
      return { passed: false, message: `Required item ${item.code} has not been scored.` };
    }

    const itemEvidence = evidences.find(e => e.props.itemCode === item.code);
    if (!itemEvidence || itemEvidence.props.status !== 'APPROVED') {
      return { passed: false, message: `Required evidence for ${item.code} is missing or not approved.` };
    }
  }

  if (!session.props.finalResult) {
    return { passed: false, message: 'Final score has not been calculated.' };
  }

  if (!session.props.finalFeedback) {
    return { passed: false, message: 'Final feedback is required.' };
  }

  return { passed: true };
};
