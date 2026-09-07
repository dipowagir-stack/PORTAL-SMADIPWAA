import re

with open('src/pages/teacher/SupervisiAdministrasiPanel.tsx', 'r') as f:
    content = f.read()

# Add getFollowUps logic
content = content.replace("import { Result } from '../../foundation/core/Result';", "import { Result } from '../../foundation/core/Result';\nimport { SupervisionFollowUp } from '../../domains/supervision/models/SupervisionFollowUp';")

# Add state
content = content.replace("const [loading, setLoading] = useState(true);", "const [loading, setLoading] = useState(true);\n  const [followUps, setFollowUps] = useState<SupervisionFollowUp[]>([]);")

# Load follow-ups
load_logic = """
      if (session) {
        setSupervision(session);
        const evs = await evService.getEvidencesBySupervision(tenantContext.tenantId, session.props.id!);
        if (evs.isSuccess) {
          setEvidences(evs.getValue());
        }
        const fu = await supService.getFollowUps(tenantContext.tenantId, session.props.id!);
        if (fu.isSuccess) {
          setFollowUps(fu.getValue());
        }
      }
"""
content = content.replace(
"""      if (session) {
        setSupervision(session);
        const evs = await evService.getEvidencesBySupervision(tenantContext.tenantId, session.props.id!);
        if (evs.isSuccess) {
          setEvidences(evs.getValue());
        }
      }""", load_logic
)


# Add UI for final result
final_result_ui = """
      {supervision.props.status.value === 'COMPLETED' && supervision.props.finalResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <ShieldCheck className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-bold text-green-900">Hasil Supervisi Akhir</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
              <p className="text-sm text-gray-500 font-medium">Kategori</p>
              <p className="text-xl font-bold text-green-700">{supervision.props.finalResult.category}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
              <p className="text-sm text-gray-500 font-medium">Persentase</p>
              <p className="text-xl font-bold text-green-700">{supervision.props.finalResult.percentage.toFixed(1)}%</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
              <p className="text-sm text-gray-500 font-medium">Skor</p>
              <p className="text-xl font-bold text-green-700">{supervision.props.finalResult.totalScore} / {supervision.props.finalResult.maxScore}</p>
            </div>
          </div>
          {supervision.props.finalFeedback && (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100 space-y-3">
              <div>
                <p className="font-semibold text-gray-800 text-sm">Kesimpulan:</p>
                <p className="text-gray-600 text-sm">{supervision.props.finalFeedback.summary}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-green-700 text-sm mb-1">Kekuatan:</p>
                  <ul className="list-disc pl-5 text-sm text-gray-600">
                    {supervision.props.finalFeedback.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-yellow-700 text-sm mb-1">Area Perbaikan:</p>
                  <ul className="list-disc pl-5 text-sm text-gray-600">
                    {supervision.props.finalFeedback.weaknesses.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {followUps.length > 0 && (
            <div className="mt-4 bg-white p-4 rounded-lg shadow-sm border border-orange-100">
              <h4 className="font-bold text-gray-900 mb-3">Tindak Lanjut (Follow-up)</h4>
              <div className="space-y-3">
                {followUps.map(fu => (
                  <div key={fu.props.id} className="p-3 border rounded-lg flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm text-gray-800">{fu.props.target}</p>
                      <p className="text-xs text-gray-500">{fu.props.action}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-700">{fu.props.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
"""
content = content.replace(
    '{/* KARTU STATUS UTAMA */}',
    final_result_ui + '\n      {/* KARTU STATUS UTAMA */}'
)


with open('src/pages/teacher/SupervisiAdministrasiPanel.tsx', 'w') as f:
    f.write(content)
