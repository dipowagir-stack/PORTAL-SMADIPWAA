const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/admin/AdminDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import TenantModulesPanel')) {
  content = content.replace(
    "import AdmissionAdminPanel from './admission/AdmissionAdminPanel';",
    "import AdmissionAdminPanel from './admission/AdmissionAdminPanel';\nimport TenantModulesPanel from './TenantModulesPanel';"
  );
  
  content = content.replace(
    "<div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">",
    "<TenantModulesPanel />\n      <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">"
  );
  
  fs.writeFileSync(file, content);
}
