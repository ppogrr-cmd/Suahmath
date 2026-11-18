// 중국어 녹음 보관함 — 엄마가 읽어 준 예문(mom)과 수아가 따라 읽은 녹음(kid).
// 소리는 base64로 Upstash에 한 개씩 저장하고, 목록(index)을 따로 둔다.
//   GET  ?list=mom            → { id: {t, ms, at} }
//   GET  ?list=kid            → [ {k, id, d, ms, t, at} ]  (최근 순)
//   GET  ?kind=mom&id=…       → { a, t, ms }
//   GET  ?kind=kid&k=…        → { a, t, ms }
//   POST {kind:"mom", id, a, t, ms}
//   POST {kind:"kid", id, d, a, t, ms}
//   DELETE ?kind=mom&id=…  /  DELETE ?kind=kid&k=…
const KEEP_DAYS = 60;                     // 수아 녹음은 60일 지나면 지운다
const MAX_B64 = 1_400_000;                // 한 녹음 최대 약 1MB
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
async function getJSON(key, dflt) {
  const j = await kv(["GET", key]);
  if (!j || j.result == null) return dflt;
  try { return JSON.parse(j.result); } catch { return dflt; }
}
const setJSON = (key, v) => kv(["SET", key, JSON.stringify(v)]);
const safe = (s) => String(s || "").replace(/[^\w\-:.]/g, "").slice(0, 80);


export default async function handler(req, res) {
  if (!BASE() || !TOKEN()) return res.status(503).json({ error: "storage-not-connected" });
  res.setHeader("Cache-Control", "no-store");
  try {
    const q = req.query || {};
    if (req.method === "GET") {
      if (q.list === "mom") return res.status(200).json(await getJSON("zh-mom-index", {}));
      if (q.list === "kid") return res.status(200).json(await getJSON("zh-kid-index", []));
      const key = q.kind === "mom" ? `zh-mom:${safe(q.id)}` : q.kind === "kid" ? `zh-kid:${safe(q.k)}` : "";
      if (!key) return res.status(400).json({ error: "bad-request" });
      const v = await getJSON(key, null);
      if (!v) return res.status(404).json({ error: "not-found" });
      return res.status(200).json(v);
    }
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      if (!b.a || b.a.length > MAX_B64) return res.status(400).json({ error: "bad-audio" });
      const rec = { a: b.a, t: String(b.t || "audio/mp4").slice(0, 40), ms: +b.ms || 0 };
      const at = Date.now();
      if (b.kind === "mom") {
        const id = safe(b.id);
        await setJSON(`zh-mom:${id}`, rec);
        const idx = await getJSON("zh-mom-index", {});
        idx[id] = { t: rec.t, ms: rec.ms, at };
        await setJSON("zh-mom-index", idx);
        return res.status(200).json({ ok: true, idx });
      }
      if (b.kind === "kid") {
        const id = safe(b.id), d = safe(b.d);
        const k = `${d}:${id}:${at}`;
        await setJSON(`zh-kid:${k}`, rec);
        let idx = await getJSON("zh-kid-index", []);
        idx.unshift({ k, id, d, ms: rec.ms, t: rec.t, at });
        // 오래된 녹음 정리
        const cut = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
        const old = idx.filter((x) => x.d < cut);
        idx = idx.filter((x) => x.d >= cut);
        for (const x of old) await kv(["DEL", `zh-kid:${x.k}`]);
        await setJSON("zh-kid-index", idx);
        return res.status(200).json({ ok: true, k });
      }
      return res.status(400).json({ error: "bad-kind" });
    }
    if (req.method === "DELETE" && q.kind === "mom") {
      const id = safe(q.id);
      await kv(["DEL", `zh-mom:${id}`]);
      const idx = await getJSON("zh-mom-index", {});
      delete idx[id];
      await setJSON("zh-mom-index", idx);
      return res.status(200).json({ ok: true, idx });
    }
    // 같은 문장을 다시 녹음하면 앞의 녹음은 지운다
    if (req.method === "DELETE" && q.kind === "kid") {
      const k = safe(q.k);
      await kv(["DEL", `zh-kid:${k}`]);
      const idx = (await getJSON("zh-kid-index", [])).filter((x) => x.k !== k);
      await setJSON("zh-kid-index", idx);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "method-not-allowed" });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
