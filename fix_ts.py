import re

with open('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'r') as f:
    content = f.read()

# Replace currentUser with profile!
content = content.replace('currentUser?.uid', 'profile!.uid')

# Import SupervisionService properly
if 'import { SupervisionService }' not in content:
    content = content.replace(
        "import { SupervisionSession } from '../../../domains/supervision/models/SupervisionSession';",
        "import { SupervisionSession } from '../../../domains/supervision/models/SupervisionSession';\nimport { SupervisionService } from '../../../domains/supervision/services/SupervisionService';"
    )

content = content.replace('res.getError()', 'res.error')

with open('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'w') as f:
    f.write(content)
