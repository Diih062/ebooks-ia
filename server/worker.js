import { Worker } from "bullmq";
import { addSubscriber } from "./sendpulse.js";
import { connection } from "./queue.js";

const worker = new Worker(
  "sendpulseQueue",
  async (job) => {
    const { firstName, email } = job.data;
    console.log(`🚀 Processando envio de ${email}`);
    await addSubscriber(firstName, email);
  },
  { connection }
);

worker.on("completed", (job) => console.log(`✅ Job concluído: ${job.id}`));
worker.on("failed", (job, err) => console.error(`❌ Falha: ${job.id}`, err.message));
