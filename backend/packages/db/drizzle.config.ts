import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL as string || 'postgres://postgres:password@127.0.0.1:5432/web3_social',
  },
  verbose: true,
  strict: true,
});
