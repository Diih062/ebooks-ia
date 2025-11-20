import test from 'node:test';
import assert from 'node:assert/strict';

import { requeuePendingFromDB, addEmailToQueue, emailQueue } from '../../../server/services/queue.js';
import { pool } from '../../../server/db/index.js';

test('requeuePendingFromDB moves pending jobs to queue', async () => {
  const pendingRows = [
    { id: 11, email: 'x@example.com', first_name: 'X', delay_type: 'imediato' },
    { id: 12, email: 'y@example.com', first_name: 'Y', delay_type: '24h' },
  ];

  // capture pool.query calls
  const queries = [];
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    if (sql.startsWith('SELECT * FROM email_jobs')) {
      return { rows: pendingRows };
    }
    // mark queued/update
    return { rowCount: 1 };
  };

  const added = [];
  // override emailQueue.add to capture jobs
  emailQueue.add = async (name, data) => { added.push({ name, data }); };

  await requeuePendingFromDB(100);

  assert.equal(added.length, pendingRows.length);
  assert.equal(queries.some(q => q.sql && q.sql.startsWith('SELECT * FROM email_jobs')), true);
});

test('addEmailToQueue persists job then enqueues and marks queued', async () => {
  const queries = [];
  // Simulate persistJob INSERT returning id
  let insertCalled = false;
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    if (sql.startsWith('INSERT INTO email_jobs')) {
      insertCalled = true;
      return { rows: [{ id: 99 }], rowCount: 1 };
    }
    return { rowCount: 1 };
  };

  const added = [];
  emailQueue.add = async (name, data, opts) => { added.push({ name, data, opts }); };

  await addEmailToQueue({ email: 'z@example.com', firstName: 'Z', delayType: 'imediato' });

  assert.equal(insertCalled, true);
  assert.equal(added.length, 1);
  // verify mark queued executed via pool.query update call present
  const upd = queries.some(q => q.sql && q.sql.startsWith('UPDATE email_jobs SET queued'));
  assert.equal(upd, true);
});
