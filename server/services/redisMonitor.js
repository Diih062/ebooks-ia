import Redis from 'ioredis';
import fetch from 'node-fetch';
import client from 'prom-client';
import dotenv from 'dotenv';

// Monitor simples para Redis:
// - expõe métricas Prometheus (used memory, evicted keys, up)
// - envia um POST para `ALERT_WEBHOOK_URL` quando detecta evictions
// - usa polling via `INFO memory` para obter valores compatíveis com provedores gerenciados
dotenv.config();

function normalizeRedisUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  if (rawUrl.includes('upstash.io') && rawUrl.startsWith('redis://')) {
    return rawUrl.replace('redis://', 'rediss://');
  }
  return rawUrl;
}

const METRIC_NS = 'ebooks_ia_redis';

const register = client.register;
const usedMemoryGauge = new client.Gauge({ name: `${METRIC_NS}_used_memory_bytes`, help: 'Redis used memory in bytes' });
const evictedCounter = new client.Counter({ name: `${METRIC_NS}_evicted_keys_total`, help: 'Total evicted keys' });
const redisUpGauge = new client.Gauge({ name: `${METRIC_NS}_up`, help: 'Redis up (1) or down (0)' });
const maxmemoryPolicyGauge = new client.Gauge({ name: `${METRIC_NS}_maxmemory_policy`, help: 'Redis maxmemory policy as label', labelNames: ['policy'] });

let lastEvicted = 0;

export async function startRedisMonitor() {
  // Em ambiente de teste não iniciamos o monitor para evitar timers/clients
  if (process.env.NODE_ENV === 'test') {
    console.warn('⚠️ NODE_ENV=test — Redis monitor não será iniciado');
    redisUpGauge.set(0);
    return { stop: async () => {}, register };
  }

  const rawUrl = process.env.REDIS_URL;
  if (!rawUrl) {
    console.warn('⚠️ REDIS_URL não configurado — monitor do Redis não será iniciado');
    redisUpGauge.set(0);
    return { stop: async () => {}, register };
  }

  const redisUrl = normalizeRedisUrl(rawUrl);
  const clientRedis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2, connectTimeout: 3000 });

  clientRedis.on('error', (err) => {
    console.error('⚠️ Redis monitor error:', err && err.message ? err.message : err);
    redisUpGauge.set(0);
  });

  try {
    await clientRedis.connect();
    redisUpGauge.set(1);
  } catch (e) {
    console.error('⚠️ Não foi possível conectar no Redis para monitor:', e && e.message ? e.message : e);
    redisUpGauge.set(0);
  }

  const intervalMs = parseInt(process.env.REDIS_MONITOR_INTERVAL_MS || '15000', 10);

  async function poll() {
    try {
      const info = await clientRedis.info('memory');
      // parse info
      const m = {};
      info.split('\n').forEach((line) => {
        if (!line || line.indexOf(':') === -1) return;
        const [k, v] = line.split(':');
        m[k.trim()] = v.trim();
      });

      if (m.used_memory) usedMemoryGauge.set(Number(m.used_memory));
      if (m.evicted_keys) {
        const ev = Number(m.evicted_keys);
        if (ev >= lastEvicted) {
          evictedCounter.inc(ev - lastEvicted);
        }
        lastEvicted = ev;
      }
      if (m.maxmemory_policy) {
        // set label-based gauge (value always 1 with label)
        maxmemoryPolicyGauge.labels(m.maxmemory_policy).set(1);
      }

      redisUpGauge.set(1);

      // alert if evictions increased
      if (m.evicted_keys && Number(m.evicted_keys) > 0) {
        await maybeAlert(Number(m.evicted_keys));
      }
    } catch (err) {
      console.error('⚠️ Redis monitor poll error:', err && err.message ? err.message : err);
      redisUpGauge.set(0);
    }
  }

  // first poll immediately
  poll();
  const id = setInterval(poll, intervalMs);

  return {
    stop: async () => {
      clearInterval(id);
      try { await clientRedis.disconnect(); } catch (e) {}
    },
    register,
  };
}

async function maybeAlert(evicted) {
  const webhook = process.env.ALERT_WEBHOOK_URL;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'redis-monitor', evicted, time: new Date().toISOString() }),
    });
  } catch (e) {
    console.error('⚠️ Falha ao enviar alerta para webhook:', e && e.message ? e.message : e);
  }
}

export { register };
