import React, { useState, useEffect } from 'react';
import { ExternalLink, Key } from 'lucide-react';
import { getTeacherToolsResult } from '../../domains/teacher/services';

export default function TeacherToolsView() {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const res = await getTeacherToolsResult();
      if (res.isSuccess) setTools(res.getValue());
    } catch (e) {
      console.error("Error fetching tools:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Memuat alat bantu...</div>;
  }

  if (tools.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <Key className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Belum ada alat bantu cerdas yang tersedia saat ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <Key className="w-5 h-5 mr-2 text-blue-600" /> Alat Bantu Mengajar
        </h3>
        <p className="text-sm text-gray-500 mt-1">Akses cepat ke berbagai alat bantu berbasis AI dan utilitas lainnya.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map(tool => (
          <a
            key={tool.id}
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
          >
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{tool.title}</h4>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
            </div>
            <p className="text-sm text-gray-600 line-clamp-3">{tool.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
