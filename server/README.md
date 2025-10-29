## Servidor (backend) - API e worker

Este diretório contém o backend do projeto *ebooks-ia*. A aplicação fornece um endpoint para receber leads (nome e e-mail), persiste no PostgreSQL e enfileira um job para envio ao SendPulse via uma fila (Redis + BullMQ). Um worker processa a fila e envia os leads ao SendPulse.

Principais arquivos
- `index.js` — servidor Express principal e endpoint `/api/subscribe`.
- `db.js` — inicialização e conexão com PostgreSQL; cria a tabela `leads` automaticamente.
- `queue.js` — definição da fila (BullMQ) e função helper `addSubscriberJob`.
- `worker.js` — worker que processa a fila e chama `sendpulse.js`.
- `sendpulse.js` — integração com a API SendPulse (OAuth + adicionar contatos).
- `package.json` — dependências e script `start`.
- `Dockerfile` e `docker-compose.yaml` — para containerização e orquestração local.

Arquitetura (resumida)
- Cliente (static HTML) faz POST para `/api/subscribe` com { firstName, email }.
- O servidor insere o lead em PostgreSQL (tabela `leads`) e adiciona um job na fila `sendpulseQueue`.
- Um Worker (`worker.js`) consome a fila e invoca `sendpulse.js` para enviar o contato ao SendPulse.

Dependências principais
- Node.js (testado com Node 20+)
- Express
- pg (Postgres client)
- bullmq (fila, usada em `queue.js`/`worker.js`)
- Redis (fila)

Variáveis de ambiente
O projeto usa um arquivo `.env` em `server/.env` (ou variáveis no ambiente). Exemplo mínimo:

```
PORT=3000

# Postgres
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=secret
PGDATABASE=leads
PGPORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# SendPulse
SENDPULSE_CLIENT_ID=seu_client_id
SENDPULSE_CLIENT_SECRET=seu_client_secret
SENDPULSE_BOOK_ID=seu_addressbook_id
```

Como rodar localmente (sem Docker)

1. Instale dependências:

	```bash
	cd server
	npm install
	```

2. Configure um `.env` com as variáveis acima.

3. Inicie o servidor API:

	```bash
	npm start
	```

4. Em outro terminal, inicie o worker (processador da fila):

	```bash
	node worker.js
	```

Observação: ao iniciar `index.js` a função `initDB()` garante que a tabela `leads` exista.

Como rodar com Docker Compose (recomendado para desenvolvimento local)

O projeto inclui `docker-compose.yaml` que cria os serviços `app` (backend), `db` (Postgres), `redis` e `worker`.

1. No diretório raiz do repositório (onde está o `docker-compose.yaml`), execute:

	```bash
	docker-compose up --build
	```

2. O serviço `app` ficará disponível em `http://localhost:3000`.

Como testar o endpoint

- Health check:

  ```bash
  curl http://localhost:3000/health
  # deve retornar: ✅ Render ativo!
  ```

- Enviar um lead (exemplo):

  ```bash
  curl -X POST http://localhost:3000/api/subscribe \
	 -H "Content-Type: application/json" \
	 -d '{"firstName":"João","email":"joao@exemplo.com"}'
  ```

Logs e observabilidade
- O servidor loga ações importantes (inserção de lead, criação de job). O worker loga processamento de jobs, completions e falhas.

Erros comuns e solução rápida
- Erro de conexão com Postgres: verifique `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` e se o container/serviço Postgres está ativo.
- Erro de conexão com Redis: verifique `REDIS_HOST`/`REDIS_PORT` e se o Redis está em execução.
- Erro SendPulse: confira `SENDPULSE_CLIENT_ID`, `SENDPULSE_CLIENT_SECRET` e `SENDPULSE_BOOK_ID`.

Contribuindo
- Abra issues para problemas ou propostas de melhoria.
- Para alterações de código: crie uma branch, faça commits pequenos e abra um Pull Request descrevendo as mudanças.

Licença
- (Adicione aqui a licença do projeto, se houver.)

Contato
- Para dúvidas sobre esta parte do projeto, verifique os comentários nos arquivos `index.js`, `queue.js` e `worker.js` ou contate os mantenedores do repositório.
