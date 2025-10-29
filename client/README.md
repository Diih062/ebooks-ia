## Cliente (frontend) - static site

Este diretório contém os arquivos estáticos do frontend do projeto *ebooks-ia* — uma página simples que coleta leads (nome + e-mail) e envia para a API do servidor.

Principais arquivos
- `index.html` — página principal (formulário de captura).
- `thank-you.html` — página de agradecimento exibida após envio.
- `assets/` — imagens e fontes usadas no site.
- `css/` — estilos (`styles.css`, `thank-you.css`).
- `js/main.js` — script para submissão do formulário e interações.

Stack e comportamento
- Site estático escrito em HTML/CSS/JS puro. Não há build step por padrão.
- O formulário envia dados para o endpoint `/api/subscribe` do servidor (ver `server/index.js`).

Como executar localmente

1. Abrir diretamente no navegador (modo rápido):

	 - Abra `client/index.html` no seu navegador. Algumas funcionalidades (fetch para API) exigem que o servidor esteja rodando para testar integração completa.

2. Servir via servidor estático (recomendado para testar CORS/requests):

	 - Usando o pacote `serve` (Node):

		 ```bash
		 npm install -g serve
		 serve client
		 ```

	 - Ou usando Python (servidor HTTP simples):

		 ```bash
		 cd client
		 python3 -m http.server 8000
		 ```

Deploy
- Pode ser servido por qualquer servidor estático (Netlify, Vercel, GitHub Pages ou um bucket S3).
- Se usar integração com o `server`, certifique-se de ajustar o endereço da API (`/api/subscribe`) caso o frontend e backend fiquem em domínios diferentes (CORS).

Como contribuir
- Edite `index.html`, `css/styles.css` ou `js/main.js` conforme necessário.
- Abra um Pull Request com mudanças claras e uma descrição do que foi alterado.

Contato / notas
- O frontend é propositalmente simples — focado em captura de e-mail para o fluxo de envio via SendPulse implementado no servidor.
