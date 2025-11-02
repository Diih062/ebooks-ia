import { addSubscriber, sendEmail } from "../services/sendpulse.js";

export async function registerLead(req, res) {
  try {
    const { firstName, email } = req.body;

    if (!firstName || !email) {
      return res.status(400).json({ error: "Nome e e-mail são obrigatórios." });
    }

    await addSubscriber(firstName, email);
    await sendEmail(email, firstName);

    res.status(200).json({ success: true, message: "Lead registrado com sucesso e e-mail enviado." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao registrar lead no SendPulse." });
  }
}
