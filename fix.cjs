const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

rules = rules.replace(/match \/student_enrollments\/\{docId\} \{\s+allow read: if request\.auth != null;\s+allow write: if request\.auth != null && hasAnyRole\(\['super_admin', 'admin', 'tu'\]\);\s+\/\//, `match /student_enrollments/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && hasAnyRole(['super_admin', 'admin', 'tu']);
    }
    //`);

fs.writeFileSync('firestore.rules', rules);
