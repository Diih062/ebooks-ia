import { addSubscriber } from "../services/sendpulse.js";
import { addEmailToQueue } from "../services/queue.js";
import { pool } from "../db.js";

export async function registerLead(req, res) {
  try {
    const { firstName, email } = req.body;

    if (!firstName || !email) {
      return res.status(400).json({ error: "Nome e e-mail são obrigatórios." });
    }

    let sendpulseId = null;
    let sendStatus = 'pending';

    // 1️⃣ Adiciona lead na SendPulse
    try {
      const result = await addSubscriber(firstName, email);
      sendpulseId = result?.id || null;
      sendStatus = 'success';
    } catch (err) {
      console.error("⚠️ Erro ao adicionar em SendPulse:", err.message);
      sendStatus = 'failed';
      // Continuar mesmo se SendPulse falhar
    }

    // 2️⃣ Salvar lead no banco de dados com status do SendPulse
    try {
      await pool.query(
        `INSERT INTO leads (first_name, email, sendpulse_id, send_status) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE 
         SET first_name = $1, sendpulse_id = $3, send_status = $4, updated_at = NOW()`,
        [firstName, email, sendpulseId, sendStatus]
      );
    } catch (dbErr) {
      console.error("⚠️ Erro ao salvar lead no banco:", dbErr.message);
      // Se falhar ao salvar no banco, retornar erro
      return res.status(500).json({ error: "Falha ao salvar o lead no banco de dados." });
    }

    // 3️⃣ Cria jobs assíncronos de envio de e-mails (individual try-catch)
    const emailQueueResults = [];
    
    // Imediato
    try {
      await addEmailToQueue({ firstName, email, delayType: "imediato" });
      emailQueueResults.push({ delayType: "imediato", success: true });
    } catch (err) {
      console.error("⚠️ Erro ao agendar e-mail imediato:", err.message);
      emailQueueResults.push({ delayType: "imediato", success: false, error: err.message });
    }
    
    // 24h
    try {
      await addEmailToQueue({ firstName, email, delayType: "24h" });
      emailQueueResults.push({ delayType: "24h", success: true });
    } catch (err) {
      console.error("⚠️ Erro ao agendar e-mail 24h:", err.message);
      emailQueueResults.push({ delayType: "24h", success: false, error: err.message });
    }
    
    // 72h
    try {
      await addEmailToQueue({ firstName, email, delayType: "72h" });
      emailQueueResults.push({ delayType: "72h", success: true });
    } catch (err) {
      console.error("⚠️ Erro ao agendar e-mail 72h:", err.message);
      emailQueueResults.push({ delayType: "72h", success: false, error: err.message });
    }

    // Determine overall success and message
    const failedEmails = emailQueueResults.filter(r => !r.success);
    let message;
    if (failedEmails.length === 0) {
      message = "Lead registrado e e-mails agendados com sucesso.";
    } else if (failedEmails.length === emailQueueResults.length) {
      message = "Lead registrado, mas nenhum e-mail foi agendado.";
    } else {
      message = `Lead registrado. Alguns e-mails não foram agendados: ${failedEmails.map(e => e.delayType).join(", ")}.`;
    }

    res.status(200).json({
      success: true,
      message,
      emailQueueResults,
    });
  } catch (err) {
    console.error("Erro ao registrar lead:", err);
    res.status(500).json({ error: "Falha ao processar o lead." });
  }
}
