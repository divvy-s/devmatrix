const fs = require('fs');
let srv = fs.readFileSync('apps/api/src/modules/posts/posts.service.ts', 'utf8');
srv = srv.replace('id: authorArr[0].id', 'id: authorArr[0]!.id');
srv = srv.replace('username: authorArr[0].username', 'username: authorArr[0]!.username');
srv = srv.replace('displayName: authorArr[0].displayName', 'displayName: authorArr[0]!.displayName');
fs.writeFileSync('apps/api/src/modules/posts/posts.service.ts', srv);
console.log('Fixed TS undefined issues');
