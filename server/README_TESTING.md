# Testes e Checklist de Verificação - Backend

Objetivo: garantir que todas as partes do backend (`server/`) funcionem corretamente em produção.

Passos rápidos (sanity checks)

- 1) Instalar dependências e iniciar serviço:

```bash
cd server
npm install
npm start
```

- 2) Verificar health endpoint:

```bash
curl http://localhost:3000/health
```

- 3) Verificar métricas Prometheus:

```bash
curl http://localhost:3000/metrics
```

Checklist detalhado por componente

- Banco de dados (Postgres)
  - [ ] `initDB()` conecta sem erro.
  - [ ] Tabelas mínimas existem: `leads`, `email_jobs`.
  - Testes: executar queries de leitura/escrita e checar índices/constraints.

- Redis / Fila (BullMQ)
  - [ ] `REDIS_URL` configurada em production (ou fallback esperado).
  - [ ] `emailQueue` enfileira jobs; worker consome e processa.
  - Testes: enfileirar job manualmente via rota/test script e observar worker processando; forçar desconexão e verificar fallback/persistência.
  - Monitor: acessar `/metrics` para `ebooks_ia_redis_*` e validar ausência de evictions.

- Workers
  - [ ] `workers/emailWorker.js` inicia apenas quando `REDIS_URL` presente.
  - [ ] Jobs processados atualizam `email_jobs.sent_at` e gravam erros quando falham.

- Integração SendPulse
  - [ ] `SENDPULSE_API_USER_ID` e `SENDPULSE_API_SECRET` válidos.
  - [ ] `addSubscriber` retorna com sucesso e `leads.sendpulse_id` é atualizado.
  - Testes: executar fluxo `POST /api/leads` com lead de teste.

- Webhooks (Kiwify)
  - [ ] Endpoint `/api/kiwify` processa e valida assinatura/secret (se aplicável).

- Monitoramento / Alertas
  - [ ] `ALERT_WEBHOOK_URL` configurado para receber notificações.
  - [ ] Métricas expostas em `/metrics` para Prometheus.

Operações de recuperação

- Requeue manual: a tabela `email_jobs` contém registros para reenfileirar caso o Redis perca jobs.
- Para reinserir manualmente: usar o script admin (ex.: `requeue` endpoint) ou rodar query e chamar `addEmailToQueue`.

Observações

- Em produção, prefira que `maxmemory-policy` do Redis seja `noeviction` quando Redis for usado como armazenamento de filas/estado crítico.
- O projeto já persiste jobs em Postgres para evitar perda silenciosa; ver `services/persistence.js`.

Se quiser, eu implemento scripts de teste automatizados (Mocha/Jest) para as rotas críticas, ou um `make test` com passos para CI.
