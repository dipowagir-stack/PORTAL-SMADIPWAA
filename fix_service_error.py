import re

with open('src/domains/supervision/services/SupervisionService.ts', 'r') as f:
    content = f.read()

content = content.replace('res.getError()', '(res as any).error || (res as any).getError?.()')

with open('src/domains/supervision/services/SupervisionService.ts', 'w') as f:
    f.write(content)
