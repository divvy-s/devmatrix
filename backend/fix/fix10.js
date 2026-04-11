const fs = require('fs');

let c = fs.readFileSync(
  'apps/api/src/modules/storage/storage.controller.ts',
  'utf8',
);
c = c.replace(/request\.body\.value/g, '(request.body as any).value');
fs.writeFileSync('apps/api/src/modules/storage/storage.controller.ts', c);

let s = fs.readFileSync(
  'apps/api/src/modules/storage/storage.service.ts',
  'utf8',
);
s = s.replace(/arr\[0\]\.key/g, 'arr[0]!.key');
s = s.replace(/arr\[0\]\.value/g, 'arr[0]!.value');
s = s.replace(/arr\[0\]\.updatedAt/g, 'arr[0]!.updatedAt');
fs.writeFileSync('apps/api/src/modules/storage/storage.service.ts', s);

console.log('Fixed storage controller generics and undefined arrays');
