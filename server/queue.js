import { Queue } from "bullmq";
import { addSubscriber } from "./sendpulse.js";
import dotenv from "dotenv";
dotenv.config();

export const connection = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
};

export const sendpulseQueue = new Queue("sendpulseQueue", { connection });

// Função para adicionar lead à fila
export async function addSubscriberJob(firstName, email) {
  await sendpulseQueue.add("sendpulse-job", { firstName, email }, {
    attempts: 3,       // Tenta até 3 vezes se falhar
    backoff: 60000,    // Aguarda 1 min entre tentativas
    removeOnComplete: true,
    removeOnFail: false
  });
  console.log(`🌀 Job criado na fila para ${email}`);
}
