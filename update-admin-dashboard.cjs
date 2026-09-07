const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/admin/AdminDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { useTenant }')) {
  content = content.replace(
    "import { useAuth } from '../../contexts/AuthContext';",
    "import { useAuth } from '../../contexts/AuthContext';\nimport { useTenant } from '../../foundation/tenant/TenantContext';"
  );
  content = content.replace(
    "import { Users, BookOpen, Activity, LayoutDashboard, Megaphone, DollarSign, FileText, CheckCircle2 } from 'lucide-react';",
    "import { Users, BookOpen, Activity, LayoutDashboard, Megaphone, DollarSign, FileText, CheckCircle2, ShieldAlert, ShieldCheck, Clock } from 'lucide-react';"
  );
}

const componentStart = "export default function AdminDashboard() {";
const hooksInject = `
  const { entitlement } = useTenant();
`;

if (!content.includes('const { entitlement } = useTenant();')) {
  content = content.replace(componentStart, componentStart + hooksInject);
}

const renderStart = "return (\n    <div className=\"space-y-6\">";
const renderInject = `
      {entitlement && (
        <div className={\`p-4 rounded-xl border \${entitlement.isReadOnly ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} mb-6\`}>
          <div className="flex items-center space-x-3">
            {entitlement.isReadOnly ? <ShieldAlert className="w-6 h-6 text-red-600" /> : <ShieldCheck className="w-6 h-6 text-blue-600" />}
            <div>
              <h3 className={\`font-bold \${entitlement.isReadOnly ? 'text-red-900' : 'text-blue-900'}\`}>
                Status Langganan: {entitlement.isLegacy ? 'Grandfathered (Full Access)' : entitlement.subscription?.status || 'Active'}
              </h3>
              <p className={\`text-sm \${entitlement.isReadOnly ? 'text-red-700' : 'text-blue-700'} mt-1\`}>
                {entitlement.isReadOnly 
                  ? 'Langganan Anda telah berakhir. Sistem dalam mode Read-Only.'
                  : (entitlement.subscription?.endDate ? \`Berlaku sampai: \${new Date(entitlement.subscription.endDate).toLocaleDateString('id-ID')}\` : 'Akses penuh ke semua fitur dasar.')}
              </p>
              <div className="mt-2 text-xs flex flex-wrap gap-1">
                {entitlement.activeModules.map(m => (
                  <span key={m} className="bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200 text-gray-700">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
`;

if (!content.includes('Status Langganan:')) {
  content = content.replace(renderStart, renderStart + renderInject);
}

fs.writeFileSync(file, content);
