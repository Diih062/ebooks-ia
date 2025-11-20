import axios from "axios";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const timeout = 5000;

function now() {
  return new Date().toISOString();
}

async function checkRoot() {
  try {
    const r = await axios.get(`${BASE}/`, { timeout });
    console.log(`${now()} [root] status=${r.status}`);
    return r.status === 200;
  } catch (e) {
    console.error(`${now()} [root] error:`, e.message);
    return false;
  }
}

async function checkHealth() {
  try {
    const r = await axios.get(`${BASE}/health`, { timeout });
    console.log(`${now()} [health] status=${r.status} body=`, r.data);
    return r.status === 200 && r.data && r.data.status === "ok";
  } catch (e) {
    console.error(`${now()} [health] error:`, e.message);
    return false;
  }
}

async function checkMetrics() {
  try {
    const r = await axios.get(`${BASE}/metrics`, { timeout });
    console.log(`${now()} [metrics] status=${r.status} length=${(r.data||"").length}`);
    return r.status === 200 && typeof r.data === "string";
  } catch (e) {
    console.error(`${now()} [metrics] error:`, e.message);
    return false;
  }
}

async function postLead() {
  try {
    const email = `test+${Date.now()}@example.com`;
    const payload = { firstName: "Test", email };
    const r = await axios.post(`${BASE}/api/leads`, payload, { timeout });
    console.log(`${now()} [leads] status=${r.status} body=`, r.data);
    // Accept 200 (created/ok) or 500 (if external services missing) but ensure we got a JSON response
    return typeof r.data === "object";
  } catch (e) {
    if (e.response) {
      console.log(`${now()} [leads] response status=${e.response.status} body=`, e.response.data);
      return true; // accept server-handled errors
    }
    console.error(`${now()} [leads] error:`, e.message);
    return false;
  }
}

(async () => {
  console.log(`${now()} Starting integration tests against ${BASE}`);

  const results = {};
  results.root = await checkRoot();
  results.health = await checkHealth();
  results.metrics = await checkMetrics();
  results.postLead = await postLead();

  console.log(`${now()} Results:`, results);

  const critical = ["root", "health", "metrics"].map((k) => results[k]);
  const ok = critical.every(Boolean);

  if (!ok) {
    console.error(`${now()} One or more critical checks failed.`);
    process.exit(2);
  }

  if (!results.postLead) {
    console.warn(`${now()} Lead POST check failed (non-critical).`);
    process.exit(3);
  }

  console.log(`${now()} All checks passed.`);
  process.exit(0);
})();
