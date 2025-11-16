import { Queue } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";
import { persistJob, markJobQueued, ensureEmailJobsTable } from "./persistence.js";

dotenv.config();

let emailQueue;
// Em production exigimos REDIS_URL — falhar rápido para expor problema de infra
if (process.env.NODE_ENV === "production" && !process.env.REDIS_URL) {
  console.error("✖️ NODE_ENV=production mas REDIS_URL não está definida — abortando.");
  process.exit(1);
}

if (process.env.REDIS_URL) {
  // Normaliza URLs do Upstash para usar TLS (rediss) quando necessário
  const rawUrl = process.env.REDIS_URL;
  let redisUrl = rawUrl;
  if (rawUrl.includes("upstash.io") && rawUrl.startsWith("redis://")) {
    redisUrl = rawUrl.replace("redis://", "rediss://");
  }

  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    connectTimeout: 5000,
    // retryStrategy determina quando tentar reconectar (null = parar)
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(50 * times, 200);
    },
  });

  // Evitar uncaught exceptions vindas do socket
  connection.on("error", (err) => {
    console.error("⚠️ Redis connection error:", err && err.message ? err.message : err);
  });

  connection.on("end", () => {
    console.warn("⚠️ Redis connection ended");
  });

  // Inicializa a fila com a conexão (bullmq lidará com a conexão quando necessário)
  emailQueue = new Queue("emailQueue", { connection });
} else {
  emailQueue = {
    add: async (...args) => {
      console.log("⚠️ REDIS_URL não definido — fila simulada, add chamado com:", ...args);
      return Promise.resolve();
    },
  };
}

export async function addEmailToQueue({ email, firstName, delayType }) {
  const delays = {
    imediato: 0,
    "24h": 24 * 60 * 60 * 1000,
    "72h": 72 * 60 * 60 * 1000,
  };

  try {
    // Persistir job antes de enfileirar
    const row = await persistJob({ email, firstName, delayType });
    await emailQueue.add(
      "sendEmail",
      { email, firstName, delayType, persisted_id: row.id },
      { delay: delays[delayType] }
    );
    await markJobQueued(row.id);
    console.log(`📬 E-mail ${delayType} agendado para ${email} (job id: ${row.id})`);
  } catch (err) {
    console.error("⚠️ Não foi possível agendar e-mail na fila:", err.message);
  }
}
