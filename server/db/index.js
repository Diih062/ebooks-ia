import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const useSsl = process.env.NODE_ENV === 'production';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

export async function initDB() {
  try {
    await pool.connect();
    console.log("✅ Conectado ao PostgreSQL com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao conectar ao PostgreSQL:", err.message);
  }
}

export default pool;
