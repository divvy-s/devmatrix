const fs = require('fs');

let app = fs.readFileSync('apps/api/src/app.ts', 'utf8');
app = app.split("\\nimport { appsRoutes").join("\nimport { appsRoutes");
app = app.split("\\n  app.register(appsRoutes").join("\n  app.register(appsRoutes");
fs.writeFileSync('apps/api/src/app.ts', app);

let schema = fs.readFileSync('packages/db/src/schema.ts', 'utf8');
schema = schema.split("\\n\nexport const developers").join("\nexport const developers");
fs.writeFileSync('packages/db/src/schema.ts', schema);

console.log("Syntax logic stripped of literals!");
