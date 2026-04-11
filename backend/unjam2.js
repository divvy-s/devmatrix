const fs = require('fs');
let content = fs.readFileSync(
  'apps/api/src/modules/posts/posts.service.ts',
  'utf8',
);
content = content.replace(/sql\\`/g, 'sql`');
content = content.replace(/\\\${/g, '${');
content = content.replace(/\\`/g, '`');
fs.writeFileSync('apps/api/src/modules/posts/posts.service.ts', content);
