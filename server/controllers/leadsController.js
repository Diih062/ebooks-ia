import pool from "../db/index.js";
import { addSubscriber } from "../services/sendpulse.js";
import { addEmailToQueue } from "../services/queue.js";

// Controller que orquestra o fluxo de registro de leads.
// Para facilitar testes, exportamos uma fábrica `makeRegisterLead` que aceita
// dependências injetadas (pool, addSubscriber, addEmailToQueue). Em runtime
// usamos as implementações reais.

export function makeRegisterLead({ pool: dbPool, addSubscriber: spAdd, addEmailToQueue: queueAdd }) {
  return async function registerLead(req, res) {
    const { firstName, email } = req.body;

    try {
      // 1️⃣ Inserção no banco
      const result = await dbPool.query(
        "INSERT INTO leads (first_name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING *",
        [firstName, email]
      );

      if (!result.rowCount) {
        return res.status(200).json({ message: "E-mail já cadastrado." });
      }

      // 2️⃣ Replica no SendPulse
      const spResponse = await spAdd(firstName, email);
      if (spResponse && spResponse.id) {
        await dbPool.query("UPDATE leads SET sendpulse_id=$1 WHERE email=$2", [
          spResponse.id,
          email,
        ]);
      }

      // 3️⃣ Enfileira os envios automáticos
      await queueAdd({ firstName, email, delayType: "imediato" });
      await queueAdd({ firstName, email, delayType: "24h" });
      await queueAdd({ firstName, email, delayType: "72h" });

      res.status(200).json({ success: true, message: "Lead registrado e e-mails agendados." });
    } catch (err) {
      console.error("❌ Erro ao registrar lead:", err);
      res.status(500).json({ error: "Falha ao registrar lead." });
    }
  };
}

// Export padrão para uso em runtime
export const registerLead = makeRegisterLead({ pool, addSubscriber, addEmailToQueue });
