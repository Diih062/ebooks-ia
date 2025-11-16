import { Worker } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { getPendingJobs } from "../services/persistence.js";

dotenv.config();

if (!process.env.REDIS_URL) {
  console.log("⚠️ REDIS_URL não definido — worker de e-mail não será iniciado.");
  process.exit(0);
}

// Normaliza URL do Redis (Upstash -> rediss) e aplica timeouts/retries mais conservadores
const rawUrl = process.env.REDIS_URL;
let redisUrl = rawUrl;
if (rawUrl.includes("upstash.io") && rawUrl.startsWith("redis://")) {
  redisUrl = rawUrl.replace("redis://", "rediss://");
}

const connection = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  connectTimeout: 5000,
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(50 * times, 200);
  },
});

connection.on("error", (err) => {
  console.error("⚠️ Redis worker error:", err && err.message ? err.message : err);
});

// No startup, requeue jobs pendentes do DB (limite conservador)
(async function requeuePending(){
  try{
    await ensureEmailJobsTable?.();
    const pending = await getPendingJobs(100);
    if(pending && pending.length){
      console.log(`🔁 Requeueando ${pending.length} jobs pendentes do DB`);
      for(const j of pending){
        try{
          await emailQueue.add('sendEmail', { email: j.email, firstName: j.first_name, delayType: j.delay_type, persisted_id: j.id });
          await markJobQueued?.(j.id);
        }catch(e){ console.error('Erro requeue:', e.message); }
      }
    }
  }catch(e){ /* ignore */ }
})();

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
    // Se o job veio de persistência, atualiza DB
    if (job.data && job.data.persisted_id) {
      try {
        const { markJobSent } = await import("../services/persistence.js");
        await markJobSent(job.data.persisted_id);
      } catch (e) {
        console.error("Erro ao marcar job como enviado:", e.message);
      }
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`🎉 Job concluído: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Falha no job ${job.id}: ${err.message}`);
  if (job && job.data && job.data.persisted_id) {
    import("../services/persistence.js").then(({ markJobError }) => {
      markJobError(job.data.persisted_id, err.message).catch((e) => console.error(e));
    });
  }
});
