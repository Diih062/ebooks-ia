import { Queue } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
import { sendEmail } from "./sendpulse.js";

dotenv.config();

let connection = null;
let emailQueue = null;
let redisConnected = false;

try {
  connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 5000,
    maxRetriesPerRequest: null,
    retryStrategy: () => null, // Não reconectar após falha
  });

  connection.on("error", (err) => {
    if (!redisConnected) {
      console.warn("⚠️ Redis indisponível. Usando modo fallback (e-mails imediatos).");
      redisConnected = false;
    }
  });

  connection.on("ready", () => {
    console.log("✅ Redis conectado com sucesso");
    redisConnected = true;
  });

  emailQueue = new Queue("emailQueue", { connection });
} catch (err) {
  console.warn("⚠️ Redis não configurado. Servidor rodará em modo fallback.");
}

export { emailQueue };

export async function addEmailToQueue(data) {
  // Se Redis não está disponível, enviar e-mail imediatamente
  if (!redisConnected || !emailQueue) {
    console.warn("⚠️ Redis indisponível. Enviando e-mail imediatamente...");
    try {
      await sendEmail(data.email, data.firstName);
      console.log(`📨 E-mail enviado imediatamente para ${data.email} (modo fallback)`);
    } catch (err) {
      console.error(`❌ Erro ao enviar e-mail para ${data.email}:`, err.message);
    }
    return;
  }

  // Se Redis está disponível, usar fila
  let delay = 0;
  if (data.delayType === "24h") delay = 24 * 60 * 60 * 1000;
  if (data.delayType === "72h") delay = 72 * 60 * 60 * 1000;

  await emailQueue.add("sendEmail", data, {
    delay,
    attempts: 3,
    removeOnComplete: true,
    removeOnFail: false,
  });

  console.log(`📬 E-mail (${data.delayType || "imediato"}) agendado para ${data.email}`);
}
