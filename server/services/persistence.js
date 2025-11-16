import { pool } from "../db/index.js";

export async function ensureEmailJobsTable() {
  const sql = `
  CREATE TABLE IF NOT EXISTS email_jobs (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT,
    delay_type TEXT,
    queued BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    error_text TEXT,
    created_at TIMESTAMP DEFAULT now()
  );
  `;
  await pool.query(sql);
}

export async function persistJob({ email, firstName, delayType }) {
  const res = await pool.query(
    `INSERT INTO email_jobs (email, first_name, delay_type) VALUES ($1,$2,$3) RETURNING id`,
    [email, firstName, delayType]
  );
  return res.rows[0];
}

export async function markJobQueued(id) {
  await pool.query(`UPDATE email_jobs SET queued = true WHERE id = $1`, [id]);
}

export async function markJobSent(id) {
  await pool.query(`UPDATE email_jobs SET sent_at = now() WHERE id = $1`, [id]);
}

export async function markJobError(id, errorText) {
  await pool.query(`UPDATE email_jobs SET error_text = $2 WHERE id = $1`, [id, errorText]);
}

export async function getPendingJobs(limit = 100) {
  const res = await pool.query(`SELECT * FROM email_jobs WHERE sent_at IS NULL LIMIT $1`, [limit]);
  return res.rows;
}
