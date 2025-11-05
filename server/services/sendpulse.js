import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const res = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.SENDPULSE_API_USER_ID,
      client_secret: process.env.SENDPULSE_API_SECRET
    })
  });

  const data = await res.json();
  if (!data.access_token) throw new Error("Falha ao autenticar com SendPulse");

  cachedToken = data.access_token;
  tokenExpiry = now + data.expires_in * 1000;
  return cachedToken;
}

export async function addSubscriber(firstName, email) {
  const token = await getAccessToken();

  const res = await fetch(
    `https://api.sendpulse.com/addressbooks/${process.env.SENDPULSE_BOOK_ID}/emails`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        emails: [
          {
            email,
            variables: {
              firstName,
              source: "landing-page",
              createdAt: new Date().toISOString()
            }
          }
        ]
      })
    }
  );

  const data = await res.json();
  if (!res.ok) {
    console.error("Erro SendPulse:", data);
    throw new Error("Falha ao adicionar contato ao SendPulse");
  }

  console.log(`✅ Lead ${email} enviado ao SendPulse`);
  return data;
}
