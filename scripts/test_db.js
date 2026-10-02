import { neon } from '@neondatabase/serverless';

const databaseUrl = 'postgresql://neondb_owner:npg_iZDByh9KMPY5@ep-patient-cherry-b1hjbgjn-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require';

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
