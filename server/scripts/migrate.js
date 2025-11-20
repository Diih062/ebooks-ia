import { pool } from '../db/index.js';

async function run() {
  try {
    await pool.connect();
    console.log('Connected to DB, running migrations...');

    await pool.query(`CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      first_name TEXT,
      email TEXT UNIQUE,
      sendpulse_id TEXT,
      created_at TIMESTAMP DEFAULT now()
    );`);

    await pool.query(`CREATE TABLE IF NOT EXISTS email_jobs (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      first_name TEXT,
      delay_type TEXT,
      queued BOOLEAN DEFAULT false,
      sent_at TIMESTAMP,
      error_text TEXT,
      created_at TIMESTAMP DEFAULT now()
    );`);

    console.log('Migrations applied');
  } catch (e) {
    console.error('Migration error:', e.message);
    process.exit(1);
  } finally {
    try { await pool.end(); } catch (e) {}
  }
}

run();
