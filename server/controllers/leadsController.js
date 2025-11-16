import pool from "../db/index.js";
import { addSubscriber } from "../services/sendpulse.js";
import { addEmailToQueue } from "../services/queue.js";

// Controller que orquestra o fluxo de registro de leads:
// 1) grava no banco local (`leads`)
// 2) replica no SendPulse
// 3) enfileira envios imediatos e futuros (imediato, 24h, 72h)

export async function registerLead(req, res) {
  const { firstName, email } = req.body;

  try {
    // 1️⃣ Inserção no banco
    const result = await pool.query(
      "INSERT INTO leads (first_name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING *",
      [firstName, email]
    );

    if (!result.rowCount) {
      return res.status(200).json({ message: "E-mail já cadastrado." });
    }

    // 2️⃣ Replica no SendPulse
    const spResponse = await addSubscriber(firstName, email);
    if (spResponse.id) {
      await pool.query("UPDATE leads SET sendpulse_id=$1 WHERE email=$2", [
        spResponse.id,
        email
      ]);
    }

    // 3️⃣ Enfileira os envios automáticos
    await addEmailToQueue({ firstName, email, delayType: "imediato" });
    await addEmailToQueue({ firstName, email, delayType: "24h" });
    await addEmailToQueue({ firstName, email, delayType: "72h" });

    res
      .status(200)
      .json({ success: true, message: "Lead registrado e e-mails agendados." });
  } catch (err) {
    console.error("❌ Erro ao registrar lead:", err);
    res.status(500).json({ error: "Falha ao registrar lead." });
  }
}
