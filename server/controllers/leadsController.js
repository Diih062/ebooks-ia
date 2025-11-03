import { addSubscriber } from "../services/sendpulse.js";
import { addEmailToQueue } from "../services/queue.js";

export async function registerLead(req, res) {
  try {
    const { firstName, email } = req.body;

    if (!firstName || !email) {
      return res.status(400).json({ error: "Nome e e-mail são obrigatórios." });
    }

    // 1️⃣ Adiciona lead na SendPulse
    try {
      await addSubscriber(firstName, email);
    } catch (err) {
      console.error("⚠️ Erro ao adicionar em SendPulse:", err.message);
      // Continuar mesmo se SendPulse falhar
    }

    // 2️⃣ Cria jobs assíncronos de envio de e-mails
    try {
      await addEmailToQueue({ firstName, email, delayType: "imediato" });
      await addEmailToQueue({ firstName, email, delayType: "24h" });
      await addEmailToQueue({ firstName, email, delayType: "72h" });
    } catch (err) {
      console.error("⚠️ Erro ao agendar e-mails:", err.message);
    }

    res.status(200).json({
      success: true,
      message: "Lead registrado e e-mails agendados com sucesso.",
    });
  } catch (err) {
    console.error("Erro ao registrar lead:", err);
    res.status(500).json({ error: "Falha ao processar o lead." });
  }
}
