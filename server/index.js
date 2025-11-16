// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import leadsRouter from "./routes/leadsRoutes.js";
import kiwifyWebhook from "./routes/kiwifyWebhook.js";

import { initDB, pool } from "./db/index.js";
import Redis from "ioredis";
import { ensureEmailJobsTable } from "./services/persistence.js";
import { startRedisMonitor, register as metricsRegister } from "./services/redisMonitor.js";

dotenv.config();

const app = express();

// Middlewares essenciais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Kiwify webhooks às vezes usam x-www-form-urlencoded

// NOTE: este arquivo é o ponto de entrada do backend.
// Comentários e checagens abaixo ajudam manutenção e debugging rápido.

// 🔌 Conexão com PostgreSQL
await initDB();
// Garantir tabela de jobs para persistência
try{
  await ensureEmailJobsTable();
  console.log('✅ email_jobs table ensured');
}catch(e){
  console.error('⚠️ Falha ao garantir tabela email_jobs:', e.message);
}

// 🩺 Health Check — para Render + UptimeRobot
app.get("/health", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT 1 as ok;");

    // Checagem simples do Redis (se configurado) com timeout curto
    let redisStatus = "not-configured";
    if (process.env.REDIS_URL) {
      // Normaliza URL do Redis (Upstash pode precisar de rediss://)
      const rawUrl = process.env.REDIS_URL;
      let redisUrl = rawUrl;
      if (rawUrl.includes("upstash.io") && rawUrl.startsWith("redis://")) {
        redisUrl = rawUrl.replace("redis://", "rediss://");
      }

      const client = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 2000 });
      try {
        const connectPromise = client.connect();
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000));
        await Promise.race([connectPromise, timeout]);
        await client.ping();
        redisStatus = "connected";
      } catch (err) {
        redisStatus = `error: ${err && err.message ? err.message : err}`;
      } finally {
        try {
          await client.disconnect();
        } catch (e) {}
      }
    }

    return res.status(200).json({
      status: "ok",
      db: "connected",
      redis: redisStatus,
      time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Health check failure:", err.message);
    return res.status(500).json({
      status: "error",
      db: "disconnected",
      error: err.message,
    });
  }
});

// Expor métricas Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metricsRegister.contentType);
    const m = await metricsRegister.metrics();
    res.send(m);
  } catch (e) {
    res.status(500).send('error');
  }
});

// Iniciar monitor do Redis (não bloqueante)
startRedisMonitor().then(() => console.log('🔍 Redis monitor iniciado')).catch((e) => console.error('⚠️ Falha ao iniciar redis monitor:', e.message));

// 🧩 Webhook da Kiwify
app.use("/api", kiwifyWebhook);

// ✉️ Rotas de Leads (Brevo + fila)
app.use("/api/leads", leadsRouter);

// Rota base opcional
app.get("/", (req, res) => {
  res.json({ message: "Backend da Landing Page funcionando ✨" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 API rodando na porta ${PORT}`)
);
