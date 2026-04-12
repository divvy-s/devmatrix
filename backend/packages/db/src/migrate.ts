import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env') });
config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(__dirname, '../../../apps/api/.env') });

const runMigrate = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  
  const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(migrationClient);

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log('Migrations completed successfully');

  await migrationClient.end();
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('Migration failed');
  console.error(err);
  process.exit(1);
});
