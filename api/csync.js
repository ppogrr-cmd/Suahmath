// 중국어 읽기 — 기기끼리 기록을 맞추는 저장소 (suahstudy/chinese).
// rd: 문장별 읽은 횟수, dy: 오늘의 미션, sk: 연속 기록
const KEY = "chinese-suah";
const BASE = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function kv(path, opts = {}) {
  const r = await fetch(`${BASE()}/${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN()}`, ...(opts.headers || {}) },
  });
  return r.json();
}
const EMPTY = { rd: {}, dy: null, sk: { n: 0, best: 0, last: "", days: [] } };
async function read() {
  const j = await kv(`get/${KEY}`);
  if (!j || !j.result) return { ...EMPTY };
  try { return { ...EMPTY, ...JSON.parse(j.result) }; } catch { return { ...EMPTY }; }
}
function mergeMax(a = {}, b = {}) {
  const o = { ...a };
  for (const [k, v] of Object.entries(b)) if ((o[k] || 0) < v) o[k] = v;
  return o;
}
/* 오늘의 미션: 더 최근 날짜 → 같은 날이면 더 많이 읽은 쪽 */
function mergeDaily(a, b) {
  if (!a || !a.d) return b || null;
  if (!b || !b.d) return a;
  if (a.d !== b.d) return b.d > a.d ? b : a;
  const w = (b.n || 0) > (a.n || 0) ? b : a;
  return { d: a.d, n: Math.max(a.n || 0, b.n || 0), ids: (w.ids && w.ids.length ? w.ids : a.ids || b.ids || []), stamp: !!(a.stamp || b.stamp) };
}
function mergeStreak(a = {}, b = {}) {
  const days = [...new Set([...(a.days || []), ...(b.days || [])])].sort().slice(-120);
  const later = (b.last || "") > (a.last || "") ? b : a;
  return { n: later.n || 0, last: later.last || "", best: Math.max(a.best || 0, b.best || 0), days };
}

export default async function handler(req, res) {
  if (!BASE() || !TOKEN()) return res.status(503).json({ error: "storage-not-connected" });
  try {
    if (req.method === "GET") return res.status(200).json(await read());
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const cur = await read();
      const replace = body.mode === "replace";
      const merged = {
        rd: replace ? body.rd || {} : mergeMax(cur.rd, body.rd),
        dy: replace ? body.dy || null : mergeDaily(cur.dy, body.dy),
        sk: replace ? body.sk || EMPTY.sk : mergeStreak(cur.sk, body.sk),
      };
      await kv(`set/${KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(merged) });
      return res.status(200).json(merged);
    }
    return res.status(405).json({ error: "method-not-allowed" });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
