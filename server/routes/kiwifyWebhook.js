import express from "express";
import axios from "axios";
const router = express.Router();

const SENDPULSE_TOKEN = process.env.SENDPULSE_TOKEN;
const SENDPULSE_LIST_ID = process.env.SENDPULSE_LIST_ID;

// Endpoint chamado pela Kiwify após a compra
router.post("/webhook/kiwify", async (req, res) => {
  try {
    const { email } = req.body.customer || {};

    if (!email) {
      return res.status(400).json({ message: "E-mail não encontrado no payload" });
    }

    // Atualiza status no SendPulse para "cliente"
    await axios.patch(
      `https://api.sendpulse.com/addressbooks/${SENDPULSE_LIST_ID}/emails/${email}`,
      {
        variables: { status: "cliente" },
      },
      {
        headers: {
          Authorization: `Bearer ${SENDPULSE_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Status atualizado para cliente: ${email}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Erro ao processar webhook Kiwify:", error.message);
    res.status(500).json({ error: "Erro interno ao processar webhook" });
  }
});

export default router;
