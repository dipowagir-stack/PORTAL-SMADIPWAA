const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/DashboardRouter.tsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { ModuleGuard }')) {
  content = content.replace(
    "import { PermissionGuard } from '../components/PermissionGuard';",
    "import { PermissionGuard } from '../components/PermissionGuard';\nimport { ModuleGuard } from '../components/ModuleGuard';"
  );
  
  content = content.replace(
    "<StudentDashboard />",
    "<ModuleGuard moduleCode=\"student\"><StudentDashboard /></ModuleGuard>"
  );
  
  content = content.replace(
    "<TeacherDashboard />",
    "<ModuleGuard moduleCode=\"teacher\"><TeacherDashboard /></ModuleGuard>"
  );
  
  content = content.replace(
    "<CurriculumDashboard />",
    "<ModuleGuard moduleCode=\"academic\"><CurriculumDashboard /></ModuleGuard>"
  );
  
  content = content.replace(
    "<ParentDashboard />",
    "<ModuleGuard moduleCode=\"parent\"><ParentDashboard /></ModuleGuard>"
  );
  
  content = content.replace(
    "<BendaharaDashboard />",
    "<ModuleGuard moduleCode=\"finance\"><BendaharaDashboard /></ModuleGuard>"
  );
  
  content = content.replace(
    "<ApplicantDashboard />",
    "<ModuleGuard moduleCode=\"admission\"><ApplicantDashboard /></ModuleGuard>"
  );
  
  fs.writeFileSync(file, content);
}
