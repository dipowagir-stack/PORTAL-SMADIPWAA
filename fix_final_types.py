import re

with open('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'r') as f:
    content = f.read()

# Fix res.error on lines 77, 131, 360 which are Result/Failure
# Actually `res` from some services returns `Result` object. In `EduOS`, maybe it's `res.getError()` but in `SupervisionDetailModal.tsx` it's using `res.error`. Let's check `res` usages.
content = content.replace('res.error', '(res as any).error || (res as any).getError?.()')

with open('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'w') as f:
    f.write(content)
