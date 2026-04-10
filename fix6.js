const fs = require('fs');
let s = fs.readFileSync('packages/db/src/schema.ts', 'utf8');
s = s.replace(/\\nexport const developers/g, '\nexport const developers');
fs.writeFileSync('packages/db/src/schema.ts', s);
console.log('Fixed schema compilation error');
