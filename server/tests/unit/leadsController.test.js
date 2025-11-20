import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRegisterLead } from '../../controllers/leadsController.js';

test('registerLead - successful new lead', async (t) => {
  let queries = [];
  // mock pool
  const mockPool = {
    async query(sql, params) {
      queries.push({ sql, params });
      // First call: insert returns rowCount 1
      if (sql.startsWith('INSERT INTO leads')) {
        return { rowCount: 1, rows: [{ id: 1 }] };
      }
      // Update sendpulse id
      return { rowCount: 1 };
    },
  };

  let spCalled = false;
  const mockAddSubscriber = async (firstName, email) => {
    spCalled = true;
    return { id: 'sp_123' };
  };

  const queued = [];
  const mockAddEmailToQueue = async (job) => {
    queued.push(job);
  };

  const handler = makeRegisterLead({ pool: mockPool, addSubscriber: mockAddSubscriber, addEmailToQueue: mockAddEmailToQueue });

  // mock req/res
  const req = { body: { firstName: 'Unit', email: 'unit@example.com' } };
  let statusCode = null;
  let body = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(b) { body = b; }
  };

  await handler(req, res);

  assert.equal(statusCode, 200);
  assert.deepEqual(body, { success: true, message: 'Lead registrado e e-mails agendados.' });
  assert.equal(spCalled, true);
  assert.equal(queued.length, 3);
  assert(queries.length >= 2);
});

test('registerLead - existing email returns ok message', async () => {
  const mockPool = {
    async query(sql, params) {
      // Simulate conflict/duplicate - rowCount 0
      if (sql.startsWith('INSERT INTO leads')) return { rowCount: 0 };
      return { rowCount: 1 };
    }
  };

  const handler = makeRegisterLead({ pool: mockPool, addSubscriber: async () => ({}), addEmailToQueue: async () => {} });
  const req = { body: { firstName: 'Unit', email: 'dup@example.com' } };
  let statusCode = null;
  let body = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(b) { body = b; }
  };

  await handler(req, res);

  assert.equal(statusCode, 200);
  assert.deepEqual(body, { message: 'E-mail já cadastrado.' });
});

test('registerLead - db throws returns 500', async () => {
  const mockPool = {
    async query() { throw new Error('boom'); }
  };

  const handler = makeRegisterLead({ pool: mockPool, addSubscriber: async () => ({}), addEmailToQueue: async () => {} });
  const req = { body: { firstName: 'Unit', email: 'err@example.com' } };
  let statusCode = null;
  let body = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(b) { body = b; }
  };

  await handler(req, res);

  assert.equal(statusCode, 500);
  assert.deepEqual(body, { error: 'Falha ao registrar lead.' });
});
