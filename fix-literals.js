const fs = require('fs');
const path = require('path');

const files = [
  'apps/api/src/infrastructure/outbox.worker.ts',
  'apps/api/src/middleware/rate-limit.middleware.ts',
  'apps/api/src/modules/auth/auth.service.ts',
  'apps/api/src/modules/identity/identity.service.ts',
  'apps/api/src/modules/social/social.service.ts',
  'apps/api/src/modules/wallet/wallet.service.ts',
];

for (const file of files) {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) continue;
  let text = fs.readFileSync(fullPath, 'utf8');
  text = text.replace(/\\`/g, '`');
  text = text.replace(/\\\$/g, '$');
  fs.writeFileSync(fullPath, text);
}
console.log('Fixed template literals');
