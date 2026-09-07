import re

with open('src/domains/supervision/services/SupervisionService.ts', 'r') as f:
    content = f.read()

content = content.replace('transitionResult.error', '(transitionResult as any).getError()')

with open('src/domains/supervision/services/SupervisionService.ts', 'w') as f:
    f.write(content)
