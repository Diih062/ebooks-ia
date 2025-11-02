// services/sendpulse.js
import dotenv from "dotenv";
import sendpulse from "sendpulse-api";
dotenv.config();

const API_USER_ID = process.env.SENDPULSE_API_USER_ID;
const API_SECRET = process.env.SENDPULSE_API_SECRET;
const TOKEN_STORAGE = process.env.SENDPULSE_TOKEN_STORAGE;

function initSendPulse(callback) {
  sendpulse.init(API_USER_ID, API_SECRET, TOKEN_STORAGE, (token) => {
    if (token && token.is_error) {
      console.error("Erro ao autenticar no SendPulse:", token);
      return;
    }
    callback(sendpulse);
  });
}

// === Adiciona lead na lista de contatos ===
export function addSubscriber(firstName, email) {
  return new Promise((resolve, reject) => {
    initSendPulse((sp) => {
      const answer = (data) => {
        if (data && data.error) {
          console.error("Erro SendPulse:", data);
          reject(data);
        } else {
          console.log(`✅ Lead ${email} adicionado com sucesso.`);
          resolve(data);
        }
      };

      // ID da lista (AddressBook)
      const bookId = process.env.SENDPULSE_BOOK_ID;
      sp.addEmails(answer, bookId, [{ email, variables: { firstName } }]);
    });
  });
}

// === Envia e-mail de confirmação ===
export function sendEmail(toEmail, toName) {
  return new Promise((resolve, reject) => {
    initSendPulse((sp) => {
      const email = {
        html: `<h1>Olá, ${toName}!</h1><p>Seu e-book gratuito está pronto para download.</p>
               <p><a href="${process.env.EBOOK_URL}" target="_blank">Clique aqui para acessar</a></p>`,
        text: `Olá, ${toName}! Acesse seu e-book gratuito em: ${process.env.EBOOK_URL}`,
        subject: "Seu e-book gratuito chegou! 📘",
        from: {
          name: "Equipe Ebooks IA",
          email: process.env.SENDPULSE_SENDER_EMAIL,
        },
        to: [{ name: toName, email: toEmail }],
      };

      const answer = (data) => {
        if (data && data.error) {
          console.error("Erro ao enviar e-mail:", data);
          reject(data);
        } else {
          console.log(`📨 E-mail enviado para ${toEmail}`);
          resolve(data);
        }
      };

      sp.smtpSendMail(answer, email);
    });
  });
}
