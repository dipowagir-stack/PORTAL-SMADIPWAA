import re

with open('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'r') as f:
    content = f.read()

# 1. Imports
if 'calculateSupervisionScore' not in content:
    content = content.replace(
        "import { SUPERVISION_ADMINISTRATION_CHECKLIST } from '../../../domains/supervision/models/SupervisionChecklist';", 
        "import { SUPERVISION_ADMINISTRATION_CHECKLIST, calculateSupervisionScore } from '../../../domains/supervision/models/SupervisionChecklist';\nimport { RecommendationStatus } from '../../../domains/supervision/models/SupervisionSession';\nimport { SupervisionService } from '../../../domains/supervision/services/SupervisionService';\nimport { SupervisionRepositoryImpl } from '../../../domains/supervision/repositories/SupervisionRepositoryImpl';"
    )

# 2. State vars
state_vars = """
  const [activeTab, setActiveTab] = useState<'EVIDENCE' | 'SCORING'>('EVIDENCE');
  const [scores, setScores] = useState<Record<string, number>>(supervision?.props?.observation?.scores || {});
  const [finalFeedback, setFinalFeedback] = useState({
    summary: supervision?.props?.finalFeedback?.summary || '',
    strengths: supervision?.props?.finalFeedback?.strengths?.join('\\n') || '',
    weaknesses: supervision?.props?.finalFeedback?.weaknesses?.join('\\n') || '',
    recommendations: supervision?.props?.finalFeedback?.recommendations?.join('\\n') || '',
    recommendationStatus: supervision?.props?.finalFeedback?.recommendationStatus || 'CONTINUE' as RecommendationStatus,
  });
"""
if 'const [activeTab, setActiveTab]' not in content:
    content = content.replace(
        "const [evidences, setEvidences] = useState<any[]>([]);",
        "const [evidences, setEvidences] = useState<any[]>([]);\n" + state_vars
    )

save_scoring_logic = """
  const handleSaveScoring = async () => {
    try {
      setProcessing(true);
      const svc = new SupervisionService(new SupervisionRepositoryImpl());
      
      await svc.submitObservation(supervision.props.id, {
        rubricId: 'ADMIN-01',
        scores,
        notes: ''
      }, currentUser?.uid || 'system');
      
      const calculated = calculateSupervisionScore(scores);
      
      const feedbackData = {
        summary: finalFeedback.summary,
        strengths: finalFeedback.strengths.split('\\n').filter((s: string) => s.trim()),
        weaknesses: finalFeedback.weaknesses.split('\\n').filter((s: string) => s.trim()),
        recommendations: finalFeedback.recommendations.split('\\n').filter((s: string) => s.trim()),
        recommendationStatus: finalFeedback.recommendationStatus
      };
      
      await svc.submitFinalFeedback(supervision.props.id, feedbackData, currentUser?.uid || 'system');
      await svc.submitFinalResult(supervision.props.id, calculated, currentUser?.uid || 'system');
      
      alert('Penilaian berhasil disimpan.');
      onUpdate();
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan penilaian');
    } finally {
      setProcessing(false);
    }
  };

"""
if 'handleSaveScoring = ' not in content:
    content = content.replace(
        "const handleCompleteSupervision = async () => {",
        save_scoring_logic + "  const handleCompleteSupervision = async () => {"
    )

with open('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'w') as f:
    f.write(content)

with open('src/pages/teacher/SupervisiAdministrasiPanel.tsx', 'r') as f:
    content = f.read()

if 'import { SupervisionFollowUp }' not in content:
    content = content.replace(
        "import { SupervisionSession } from '../../domains/supervision/models/SupervisionSession';",
        "import { SupervisionSession } from '../../domains/supervision/models/SupervisionSession';\nimport { SupervisionFollowUp } from '../../domains/supervision/models/SupervisionFollowUp';"
    )

with open('src/pages/teacher/SupervisiAdministrasiPanel.tsx', 'w') as f:
    f.write(content)

with open('src/domains/supervision/services/SupervisionService.ts', 'r') as f:
    content = f.read()

content = content.replace('res.getError()', 'res.error')
with open('src/domains/supervision/services/SupervisionService.ts', 'w') as f:
    f.write(content)

