import re

with open('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'r') as f:
    content = f.read()

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
        "const [evidences, setEvidences] = useState<SupervisionEvidence[]>([]);",
        "const [evidences, setEvidences] = useState<SupervisionEvidence[]>([]);\n" + state_vars
    )

save_scoring_logic = """
  const handleFinalize = async () => {
    try {
      setProcessing(true);
      const { SupervisionService } = await import('../../../domains/supervision/services/SupervisionService');
      const svc = new SupervisionService(new SupervisionRepositoryImpl());
      
      const calculated = calculateSupervisionScore(scores);
      
      const feedbackData = {
        summary: finalFeedback.summary,
        strengths: finalFeedback.strengths.split('\\n').filter((s: string) => s.trim()),
        weaknesses: finalFeedback.weaknesses.split('\\n').filter((s: string) => s.trim()),
        recommendations: finalFeedback.recommendations.split('\\n').filter((s: string) => s.trim()),
        recommendationStatus: finalFeedback.recommendationStatus
      };
      
      await svc.submitObservation(supervision.props.id, {
        rubricId: 'ADMIN-01',
        scores,
        notes: ''
      }, currentUser?.uid || 'system');

      await svc.submitFinalFeedback(supervision.props.id, feedbackData, currentUser?.uid || 'system');
      await svc.submitFinalResult(supervision.props.id, calculated, currentUser?.uid || 'system');
      
      await svc.finalizeSupervision(supervision.props.id, currentUser?.uid || 'system');
      
      alert('Supervisi berhasil difinalisasi.');
      onUpdate();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Gagal finalisasi');
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveScoring = async () => {
    try {
      setProcessing(true);
      const { SupervisionService } = await import('../../../domains/supervision/services/SupervisionService');
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

content = content.replace('res.getError()', 'res.error')

with open('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'w') as f:
    f.write(content)
