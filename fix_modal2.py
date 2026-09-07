import re

with open('src/pages/admin/supervision/SupervisionDetailModal.tsx', 'r') as f:
    content = f.read()

content = content.replace(
"""          </div>
          )}
        </div>

        <div className="p-6 border-t""",
"""          </div>
          )}
        </div>

        <div className="p-6 border-t"""
)
# Wait, let's find the exact string to replace. I'll print the lines around 196
