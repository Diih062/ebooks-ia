import express from "express";
import dotenv from "dotenv";
import { pool, initDB } from "./db.js";
import { addSubscriberJob } from "./queue.js";

dotenv.config();
const app = express();
app.use(express.json());

await initDB();

//Bloco para manter o servidor desperto;
app.get("/health", (req, res) => {
  res.status(200).send("✅ Render ativo!");
});

//Bloco de aplicação das requisições de entrada dos dados do lead
app.post("/api/subscribe", async (req, res) => {
  try {
    const { firstName, email } = req.body;
    if (!email) return res.status(400).json({ error: "E-mail obrigatório" });

    await pool.query(
      "INSERT INTO leads (first_name, email, source) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING",
      [firstName || null, email, "ebook-ia"]
    );

    await addSubscriberJob(firstName, email);

    res.status(202).json({ message: "Lead salvo e enviado para processamento." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao registrar lead." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 Servidor rodando na porta ${PORT}`));
