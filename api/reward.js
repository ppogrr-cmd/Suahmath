// 보상(코인) — 과목마다 오늘의 미션을 끝내면 1개, 같은 과목을 연속 10일마다 보너스(10일 +1, 20일 +2 …).
// 100개를 모으면 1만원으로 바꿔 달라고 신청할 수 있다.
//   GET                                    → { bal, ledger, req, runs }
//   POST {op:"earn", s, d, hist:[날짜…]}   → 같은 과목·같은 날은 한 번만 준다
//   POST {op:"redeem"}                     → 100개 이상이면 교환 신청
//   POST {op:"paid", id} / {op:"cancel", id}
const KEY = "reward-suah";
const PRICE = 100;
const SUBJ = { math: "수학", eng: "영어", zh: "중국어" };
const BASE = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function kv(cmd) {
  const r = await fetch(BASE(), {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  return r.json();
}
async function read() {
  const j = await kv(["GET", KEY]);
  let o = null;
  try { o = j && j.result ? JSON.parse(j.result) : null; } catch {}
  return { days: {}, ledger: [], req: [], ...(o || {}) };
}
const save = (o) => kv(["SET", KEY, JSON.stringify(o)]);
const isDay = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "");
function prevDay(d) {
  const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() - 1);
  return t.toISOString().slice(0, 10);
}
/* d로 끝나는 연속 일수 */
function runTo(set, d) { let n = 0; while (set.has(d)) { n++; d = prevDay(d); } return n; }
function view(o) {
  const earned = o.ledger.reduce((a, x) => a + (x.n || 0), 0);
  const spent = o.req.reduce((a, x) => a + (x.n || 0), 0);
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // 한국 날짜
  const runs = {};
  for (const s of Object.keys(SUBJ)) {
    const set = new Set(o.days[s] || []);
    runs[s] = runTo(set, set.has(today) ? today : prevDay(today));
  }
  return { bal: earned - spent, earned, price: PRICE, ledger: o.ledger.slice(-200).reverse(), req: [...o.req].reverse(), runs };
}

export default async function handler(req, res) {
  if (!BASE() || !TOKEN()) return res.status(503).json({ error: "storage-not-connected" });
  res.setHeader("Cache-Control", "no-store");
  try {
    const o = await read();
    if (req.method === "GET") return res.status(200).json(view(o));
    if (req.method !== "POST") return res.status(405).json({ error: "method-not-allowed" });
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    if (b.op === "earn") {
      const s = b.s, d = b.d;
      if (!SUBJ[s] || !isDay(d)) return res.status(400).json({ error: "bad-request" });
      const set = new Set(o.days[s] || []);
      // 예전에 미션을 한 날(보상은 없이 연속 계산에만 쓴다)
      for (const h of (b.hist || []).slice(-400)) if (isDay(h) && h < d) set.add(h);
      const got = o.ledger.some((x) => x.s === s && x.d === d && x.k === "m");
      set.add(d);
      o.days[s] = [...set].sort().slice(-400);
      if (!got) {
        o.ledger.push({ d, s, k: "m", n: 1, at: Date.now() });
        const run = runTo(set, d);
        if (run >= 10 && run % 10 === 0) o.ledger.push({ d, s, k: "b", n: run / 10, run, at: Date.now() });
      }
      await save(o);
      return res.status(200).json(view(o));
    }
    if (b.op === "redeem") {
      const v = view(o);
      if (v.bal < PRICE) return res.status(400).json({ error: "not-enough", ...v });
      o.req.push({ id: "r" + Date.now(), at: Date.now(), n: PRICE, won: 10000, st: "신청" });
      await save(o);
      return res.status(200).json(view(o));
    }
    if (b.op === "paid" || b.op === "cancel") {
      const r = o.req.find((x) => x.id === b.id);
      if (!r) return res.status(404).json({ error: "not-found" });
      if (b.op === "paid") { r.st = "지급 완료"; r.paidAt = Date.now(); }
      else if (r.st === "신청") o.req = o.req.filter((x) => x.id !== b.id);
      await save(o);
      return res.status(200).json(view(o));
    }
    return res.status(400).json({ error: "bad-op" });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
