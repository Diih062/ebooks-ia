import { Queue } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const connection = new Redis(process.env.REDIS_URL);

export const emailQueue = new Queue("emailQueue", { connection });

export async function addEmailToQueue({ email, firstName, delayType }) {
  const delays = {
    imediato: 0,
    "24h": 24 * 60 * 60 * 1000,
    "72h": 72 * 60 * 60 * 1000
  };

  await emailQueue.add(
    "sendEmail",
    { email, firstName, delayType },
    { delay: delays[delayType] }
  );

  console.log(`📬 E-mail ${delayType} agendado para ${email}`);
}
