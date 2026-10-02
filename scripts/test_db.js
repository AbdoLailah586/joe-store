import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';
if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL environment variable');
  process.exit(1);
}

async function testConnection() {
  try {
    const sql = neon(databaseUrl);
    const result = await sql`SELECT version(), current_database(), now();`;
    console.log('✅ Connection Successful!');
    console.log('Database:', result[0].current_database);
    console.log('Postgres Version:', result[0].version);
    console.log('Server Time:', result[0].now);
  } catch (error) {
    console.error('❌ Connection Failed:', error);
  }
}

testConnection();
