import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  const t0 = Date.now();
  await client.connect();
  console.log(`Connected to DB in ${Date.now() - t0}ms`);

  const resTables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  `);
  console.log('Tables:', resTables.rows.map(r => r.table_name));

  const resIndexes = await client.query(`
    SELECT tablename, indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public';
  `);
  console.log('\n--- Indexes ---');
  for (const idx of resIndexes.rows) {
    console.log(`${idx.tablename}: ${idx.indexname}`);
  }

  for (const table of resTables.rows.map(r => r.table_name)) {
    const countRes = await client.query(`SELECT count(*) FROM "${table}"`);
    console.log(`Table ${table} row count: ${countRes.rows[0].count}`);
  }

  await client.end();
}

check().catch(console.error);
