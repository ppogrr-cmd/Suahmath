// 말랑 공방 도감 — 기기끼리 같은 도감을 쓰도록 서버에 모아 둔다.
//   GET  → { items:[...], found:[...], del:[...] }
//   POST { items, found, del } → 합친 결과
// 합치는 규칙: 같은 말랑이는 나중에 바뀐 쪽(u), 지운 말랑이(del)는 어느 기기에서든 지움, 비밀 레시피는 모두 모음.
const KEY = "malang-suah";
const BASE = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
async function kv(cmd) {
  const r = await fetch(BASE(), { method: "POST", headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  return r.json();
}
const EMPTY = { items: [], found: [], del: [] };
async function read() {
  const j = await kv(["GET", KEY]);
  try { return { ...EMPTY, ...(j && j.result ? JSON.parse(j.result) : {}) }; } catch { return { ...EMPTY }; }
}
const ver = (x) => x.u || x.t || 0;
function merge(a, b) {
  const del = [...new Set([...(a.del || []), ...(b.del || [])])].slice(-2000);
  const gone = new Set(del), m = new Map();
  for (const it of [...(a.items || []), ...(b.items || [])]) {
    if (!it || !it.id || gone.has(it.id)) continue;
    const o = m.get(it.id);
    if (!o || ver(it) > ver(o)) m.set(it.id, it);
  }
  const items = [...m.values()].sort((x, y) => (y.t || 0) - (x.t || 0)).slice(0, 300);
  const found = [...new Set([...(a.found || []), ...(b.found || [])])];
  return { items, found, del };
}
export default async function handler(req, res) {
  if (!BASE() || !TOKEN()) return res.status(503).json({ error: "storage-not-connected" });
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") return res.status(200).json(await read());
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const out = merge(await read(), b);
      await kv(["SET", KEY, JSON.stringify(out)]);
      return res.status(200).json(out);
    }
    return res.status(405).json({ error: "method-not-allowed" });
  } catch (e) { return res.status(500).json({ error: String(e) }); }
}
