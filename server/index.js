// server/index.js (exemplo mínimo)
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); // or native fetch in modern Node
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.post('/api/subscribe', async (req, res) => {
  const { firstName, email, source } = req.body;
  // aqui você pode salvar no DB (Postgres) antes de enviar ao SendPulse

  // SendPulse REST: trocar com token real
  try {
    const SENDPULSE_TOKEN = process.env.SENDPULSE_TOKEN; // obtenha via API do SendPulse
    // Exemplo simplificado: usar o endpoint de adding email to address book
    const addRes = await fetch('https://api.sendpulse.com/smtp/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SENDPULSE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, variables: { firstName }, list_ids: [/*id da lista*/] })
    });
    // tratar resposta...
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(process.env.PORT || 3000, ()=> console.log('server up'));
