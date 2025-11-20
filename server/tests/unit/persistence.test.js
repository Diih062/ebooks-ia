import test from 'node:test';
import assert from 'node:assert/strict';

import * as persistence from '../../../server/services/persistence.js';
import { pool } from '../../../server/db/index.js';

test('persistJob / markJobQueued / markJobSent / markJobError / getPendingJobs', async () => {
  const queries = [];
  // mock pool.query
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    if (sql.startsWith('INSERT INTO email_jobs')) {
      return { rows: [{ id: 42 }], rowCount: 1 };
    }
    if (sql.startsWith('UPDATE email_jobs SET queued')) {
      return { rowCount: 1 };
    }
    if (sql.startsWith('UPDATE email_jobs SET sent_at')) {
      return { rowCount: 1 };
    }
    if (sql.startsWith('UPDATE email_jobs SET error_text')) {
      return { rowCount: 1 };
    }
    if (sql.startsWith('SELECT * FROM email_jobs')) {
      return { rows: [{ id: 1, email: 'a@b.com', first_name: 'A', delay_type: 'imediato' }], rowCount: 1 };
    }
    // default
    return { rows: [], rowCount: 0 };
  };

  // persistJob
  const row = await persistence.persistJob({ email: 'a@b.com', firstName: 'A', delayType: 'imediato' });
  assert.equal(row.id, 42);

  // markJobQueued
  await persistence.markJobQueued(42);
  // markJobSent
  await persistence.markJobSent(42);
  // markJobError
  await persistence.markJobError(42, 'err');

  // getPendingJobs
  const pending = await persistence.getPendingJobs(10);
  assert.equal(Array.isArray(pending), true);
  assert.equal(pending.length, 1);

  // ensureEmailJobsTable should call pool.query with CREATE TABLE
  await persistence.ensureEmailJobsTable();
  const foundCreate = queries.some((q) => q.sql && q.sql.indexOf('CREATE TABLE IF NOT EXISTS email_jobs') !== -1);
  assert.equal(foundCreate, true);
});
