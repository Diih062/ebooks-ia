import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
});

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100),
      email VARCHAR(255) UNIQUE NOT NULL,
      source VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ Tabela 'leads' verificada/criada com sucesso.");
}
