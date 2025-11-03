import { Worker } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
import { sendEmail } from "../services/sendpulse.js";

dotenv.config();

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const emailWorker = new Worker(
  "emailQueue",
  async (job) => {
    const { firstName, email, delayType } = job.data;

    console.log(`🚀 Processando job: ${delayType || "imediato"} → ${email}`);

    // Aqui você pode personalizar o conteúdo por tipo
    await sendEmail(email, firstName);

    console.log(`✅ E-mail ${delayType || "imediato"} enviado com sucesso!`);
  },
  { connection }
);

emailWorker.on("failed", (job, err) => {
  console.error(`❌ Falha no envio para ${job.data.email}:`, err);
});
