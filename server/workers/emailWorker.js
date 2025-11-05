import { Worker } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const connection = new Redis(process.env.REDIS_URL);

const worker = new Worker(
  "emailQueue",
  async (job) => {
    const { email, firstName, delayType } = job.data;
    console.log(`⏱️ Processando ${delayType} para ${email}`);

    const tokenRes = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: process.env.SENDPULSE_API_USER_ID,
        client_secret: process.env.SENDPULSE_API_SECRET
      })
    });

    const { access_token } = await tokenRes.json();

    const emailData = {
      html: `<h1>Olá, ${firstName}!</h1><p>Este é seu e-mail ${delayType}.</p>`,
      text: `Olá, ${firstName}! Este é seu e-mail ${delayType}.`,
      subject: `Mensagem automática (${delayType})`,
      from: {
        name: "Ebooks IA",
        email: process.env.SENDPULSE_SENDER_EMAIL
      },
      to: [{ email }]
    };

    const sendRes = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailData)
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      throw new Error(`Falha ao enviar email: ${errText}`);
    }

    console.log(`✅ E-mail ${delayType} enviado para ${email}`);
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`🎉 Job concluído: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Falha no job ${job.id}: ${err.message}`);
});
