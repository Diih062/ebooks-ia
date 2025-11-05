import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import leadsRouter from "./routes/leadsRoutes.js";
import { initDB } from "./db/index.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Conecta ao banco PostgreSQL antes de iniciar
await initDB();

// Health check endpoint (para UptimeRobot e Render)
app.get('/health', async (req, res) => {
  try {
    // opcional: teste leve ao DB
    const { rows } = await pool.query('SELECT 1');
    if (!rows) throw new Error('DB check failed');
    return res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});


// Rotas principais
app.use("/api/leads", leadsRouter);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
