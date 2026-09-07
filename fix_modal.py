import re

with open('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    ') : (\n            {activeTab === \'EVIDENCE\' ? (',
    ') : activeTab === \'EVIDENCE\' ? ('
)

with open('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'w') as f:
    f.write(content)
