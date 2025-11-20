import { Worker } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { requeuePendingFromDB } from "../services/queue.js";

// Worker responsável por processar jobs de envio de e-mail.
// - Tenta se conectar ao Redis de forma não bloqueante (lazyConnect)
// - Ao processar um job, atualiza o registro persistido (`persisted_id`) na tabela `email_jobs`
// - No startup, o worker reenfileira jobs pendentes encontrados no DB para garantir processamento
//   quando o Redis volta a ficar disponível.

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

// When using BullMQ the redis client should set maxRetriesPerRequest to null
const connection = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
  connectTimeout: 5000,
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(50 * times, 200);
  },
});

connection.on("error", (err) => {
  console.error("⚠️ Redis worker error:", err && err.message ? err.message : err);
});
// Delegar requeue ao module de queue (centraliza lógica e evita duplicação)
requeuePendingFromDB().catch(() => {});

const worker = new Worker(
  "emailQueue",
  async (job) => {
    const { email, firstName, delayType } = job.data;
    console.log(`⏱️ Processando ${delayType} para ${email}`);

    // Use the official `sendpulse-api` library (CommonJS) to ensure payload
    // format and token handling are correct. Wrap callback API into a Promise.
    const spModule = await import('sendpulse-api');
    const sendpulse = spModule.default || spModule;

    const ensureSendpulseInit = () => new Promise((resolve) => {
      try {
        // token storage directory (file-based cache)
        const storage = process.env.SENDPULSE_TOKEN_STORAGE || './tmp/sendpulse_token';
        sendpulse.init(process.env.SENDPULSE_API_USER_ID, process.env.SENDPULSE_API_SECRET, storage, () => resolve());
      } catch (e) {
        // init shouldn't throw, but resolve anyway so we can attempt send and fail gracefully
        resolve();
      }
    });

    await ensureSendpulseInit();

    const emailData = {
      html: `<h1>Olá, ${firstName}!</h1><p>Este é seu e-mail ${delayType}.</p>`,
      text: `Olá, ${firstName}! Este é seu e-mail ${delayType}.`,
      subject: `Mensagem automática (${delayType})`,
      from: {
        name: process.env.SENDPULSE_SENDER_NAME || "Ebooks IA",
        email: process.env.SENDPULSE_SENDER_EMAIL
      },
      to: [{ email: email, name: firstName || "" }]
    };

    const sendWithSendpulse = () => new Promise((resolve, reject) => {
      try {
        sendpulse.smtpSendMail(function(res){
          if (res && res.is_error) return reject(res);
          resolve(res);
        }, emailData);
      } catch (err) {
        reject(err);
      }
    });

    const sendResult = await sendWithSendpulse();
    console.log(`✅ E-mail ${delayType} enviado para ${email}`, sendResult);
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

// Graceful shutdown for worker process
async function shutdownWorker() {
  try {
    console.log('🛑 Fechando worker (graceful)...');
    await worker.close();
    try { await connection.disconnect(); } catch (e) {}
    console.log('🛑 Worker fechado');
    process.exit(0);
  } catch (e) {
    console.error('Erro ao fechar worker:', e.message);
    process.exit(1);
  }
}

process.on('SIGINT', shutdownWorker);
process.on('SIGTERM', shutdownWorker);
