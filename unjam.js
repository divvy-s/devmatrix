const fs = require('fs');
let text = fs.readFileSync(
  'apps/api/src/modules/posts/posts.service.ts',
  'utf8',
);
text = text.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('apps/api/src/modules/posts/posts.service.ts', text);
