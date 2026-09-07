const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/superadmin/SuperAdminDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import ModuleCatalogPanel')) {
  content = content.replace(
    "import TeacherToolsPanel from './TeacherToolsPanel';",
    "import TeacherToolsPanel from './TeacherToolsPanel';\nimport ModuleCatalogPanel from './ModuleCatalogPanel';"
  );
  
  content = content.replace(
    "<button\n          onClick={() => setActiveTab('teacher')}",
    "<button\n          onClick={() => setActiveTab('modules')}\n          className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors flex items-center ${activeTab === 'modules' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}\n        >\n          Module Catalog\n        </button>\n        <button\n          onClick={() => setActiveTab('teacher')}"
  );
  
  content = content.replace(
    "{activeTab === 'teacher' && <TeacherToolsPanel />}",
    "{activeTab === 'teacher' && <TeacherToolsPanel />}\n      {activeTab === 'modules' && <ModuleCatalogPanel />}"
  );
  
  fs.writeFileSync(file, content);
}
