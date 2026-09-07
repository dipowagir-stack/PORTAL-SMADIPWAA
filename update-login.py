import sys
content = open('src/pages/Login.tsx').read()
content = content.replace("export default function Login() {", "import { TenantPublicProfile } from '../domains/website/types';\n\nexport default function Login({ tenantProfile }: { tenantProfile?: TenantPublicProfile }) {")
open('src/pages/Login.tsx', 'w').write(content)
