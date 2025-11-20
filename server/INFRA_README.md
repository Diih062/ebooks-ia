# Infraestrutura — Ajustes necessários e checklist de implementação

Este documento descreve o que deve ser implementado/validado na infraestrutura para que o backend (`server/`) esteja em conformidade e resiliente em produção.

Resumo das prioridades
- Alta: garantir que o Redis não cause perda de jobs (policy / TLS / backups)
- Alta: assegurar segredos e variáveis de ambiente (secrets manager)
- Alta: monitoramento + alertas (evictions, memória, disponibilidade)
- Média: readiness/liveness probes e deployment health checks
- Média: processos de recuperação (requeue, reprocessamento, runbooks)

1) Redis — configuração e disponibilidade
- Objetivo: evitar perda silenciosa de jobs e garantir conexões seguras.
- Ações:
  - Confirmar `maxmemory-policy` do Redis. Preferível: `noeviction` quando Redis guarda filas/estado crítico.
    - Se o provedor permitir, aplicar: `CONFIG SET maxmemory-policy noeviction` ou via painel.
    - Se o provedor não permitir (Upstash, etc.), abrir ticket / mover para plano que permita ou usar instância gerenciada que suporte a configuração.
  - Garantir TLS (usar `rediss://`) para conexões; atualizar `REDIS_URL` para `rediss://` quando necessário.
  - Habilitar backups periódicos (snapshot RDB / AOF) e retention mínima (7 dias recomendado).
  - Limitar maxmemory com cuidado e dimensionar instância para que memória nunca atinja limite que cause evictions inesperadas.

2) Secrets & variáveis (segurança)
- Objetivo: não manter segredos em arquivos ou repositório.
- Ações:
  - Armazenar `DATABASE_URL`, `REDIS_URL`, `SENDPULSE_API_SECRET` e outros em um secrets manager (AWS Secrets Manager, Render / Vercel secrets, GitHub Secrets + deploy env, etc.).
  - Garantir que os containers/pods leiam segredos via variáveis de ambiente no runtime.

3) Monitoramento e alertas (Prometheus + alert manager / provider)
- Objetivo: detectar evictions, uso de memória alto e indisponibilidade do Redis rapidamente.
- Ações técnicas a aplicar:
  - Configurar Prometheus para coletar `/metrics` do backend (scrape job):
    ```yaml
    scrape_configs:
      - job_name: 'ebooks-ia-backend'
        static_configs:
          - targets: ['<backend-host>:3000']
    ```
  - Criar regra de alerta para evictions (exemplo PrometheusRule):
    ```yaml
    groups:
    - name: redis.rules
      rules:
      - alert: RedisEvictions
        expr: increase(ebooks_ia_redis_evicted_keys_total[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis evictions detected"
          description: "Redis evicted keys in the last 5 minutes. Check maxmemory-policy and memory usage."
    ```
  - Alertas adicionais: `ebooks_ia_redis_used_memory_bytes` > threshold (ex.: 80% of instance memory).
  - Configurar destino de alerta (Slack, PagerDuty, webhook) — `ALERT_WEBHOOK_URL` será usado pelo monitor interno.

4) Observabilidade e logs
- Objetivo: facilitar root-cause analysis rapidamente.
- Ações:
  - Garantir que logs do backend (startup, health, redis monitor) sejam preservados em um central (Stackdriver, Datadog, LogDNA).
  - No boot, logar `REDIS_URL` (mas não o segredo completo), `maxmemory-policy` quando possível, e status das conexões.

5) Deploy / K8s / Readiness
- Objetivo: permitir orchestrator sinalizar quando app pronto.
- Ações:
  - Em K8s, adicionar probes:
    ```yaml
    readinessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 10
    livenessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 30
    ```
  - Configurar restartPolicy e estratégias de rollout (maxUnavailable = 1, rolloutDelay).

6) Recovery / Runbook
- Objetivo: procedimentos claros quando o Redis reporta evictions ou fica inacessível.
- Runbook resumido:
  1. Checar dashboard do provider: uso de memória, evictions, logs de infra.
  2. Se `maxmemory-policy` != `noeviction` e isso for crítico, escalar/alterar configuração ou migrar instância.
  3. Requeue: usar a tabela `email_jobs` para reenfileirar registros pendentes (`sent_at IS NULL`). Worker já faz requeue no startup; também ter endpoint admin para requeue manual.
  4. Restaurar backup se houver perda de dados no Redis (pouco provável se jobs persistidos no Postgres).

7) Arquitetura recomendada (opções)
- Opção A (prod mais seguro): Redis dedicado (ElastiCache / Redis Cloud) com `noeviction`, TLS, backups habilitados, e instância dimensionada.
- Opção B (se provider é limitado): usar Postgres como fonte de verdade para jobs (já implementado) e usar Redis apenas como transporte/cache; aceitar implicações de performance.

8) Arquivos / artefatos que podemos adicionar ao repositório (posso gerar)
- `deploy/prometheus-scrape.yaml` — snippet para Prometheus.
- `deploy/prometheus-rules.yaml` — exemplo de regra de alerta (evictions, memory usage).
- `k8s/deployment.yaml` — com readiness/liveness e envFrom secrets.
- `infra/terraform-redis.tf` — exemplo de recurso Redis (AWS ElastiCache / DigitalOcean Managed). (opcional)
- `tools/requeue_pending.js` — script CLI para reenfileirar jobs pendentes manualmente.

9) Passos que eu recomendo que eu implemente agora (você pode autorizar):
- (recomendado) Adicionar `tools/requeue_pending.js` para requeue controlado manualmente.
- Gerar `deploy/prometheus-rules.yaml` e `deploy/prometheus-scrape.yaml` para inclusão no repositório.
- Gerar `k8s/deployment.yaml` exemplo com probes e uso de secrets.

Se quiser que eu implemente os artefatos listados (requeue script + Prometheus rules + k8s manifest), diga quais e eu adiciono os arquivos e commit no repo.
