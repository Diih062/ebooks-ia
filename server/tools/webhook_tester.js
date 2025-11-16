#!/usr/bin/env node
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.WEBHOOK_TEST_PORT || 4000;

app.use(bodyParser.json({ limit: '1mb' }));

app.post('/alert', (req, res) => {
  const now = new Date().toISOString();
  console.log('=== Webhook received ===');
  console.log('Time :', now);
  console.log('Headers:');
  console.log(req.headers);
  console.log('Body:');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('========================');
  res.status(200).json({ received: true, time: now });
});

app.get('/', (req, res) => res.send('Webhook tester running'));

app.listen(PORT, () => {
  console.log(`Webhook tester listening on http://localhost:${PORT}/alert`);
  console.log('Set ALERT_WEBHOOK_URL to this URL to receive alerts.');
});
