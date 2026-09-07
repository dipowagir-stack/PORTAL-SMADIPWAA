import re

with open('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'r') as f:
    content = f.read()

# Make sure handleFinalize is defined
if 'const handleFinalize = async' not in content:
    replacement = """
  const handleFinalize = async () => {
    try {
      setProcessing(true);
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
      }, profile!.uid);

      await svc.submitFinalFeedback(supervision.props.id, feedbackData, profile!.uid);
      await svc.submitFinalResult(supervision.props.id, calculated, profile!.uid);
      
      await svc.finalizeSupervision(supervision.props.id, profile!.uid);
      
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
"""
    content = content.replace(
        "const handleCompleteSupervision = async () => {",
        replacement + "\n  const handleCompleteSupervision = async () => {"
    )

content = content.replace('res.getError()', 'res.error')
content = content.replace('error TS2339: Property \'error\' does not exist on type', '') # just a joke, won't match
with open('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'w') as f:
    f.write(content)
