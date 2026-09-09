// Candy's Math — 기기 사이 기록 동기화
// Vercel 환경변수(Upstash/Vercel KV 연결 시 자동 생성)를 사용합니다.
//   KV_REST_API_URL / KV_REST_API_TOKEN  (또는 UPSTASH_REDIS_REST_URL / _TOKEN)

export default async function handler(req, res) {
  const base = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!base || !token) {
    return res.status(501).json({ error: "저장소가 연결되지 않았습니다." });
  }

  const raw = (req.query.code || "").toString();
  const code = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  if (!code) return res.status(400).json({ error: "동기화 코드가 없습니다." });

  const key = "candymath:" + code;
  const auth = { Authorization: "Bearer " + token };

  try {
    if (req.method === "GET") {
      const r = await fetch(base + "/get/" + key, { headers: auth });
      const j = await r.json();
      let data = null;
      if (j && j.result) { try { data = JSON.parse(j.result); } catch (e) { data = null; } }
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ data });
    }

    if (req.method === "POST") {
      let body = req.body;
      if (typeof body !== "string") body = JSON.stringify(body || {});
      if (body.length > 400000) return res.status(413).json({ error: "너무 큽니다." });
      const r = await fetch(base + "/set/" + key, {
        method: "POST",
        headers: Object.assign({ "Content-Type": "text/plain" }, auth),
        body
      });
      if (!r.ok) return res.status(502).json({ error: "저장하지 못했습니다." });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "지원하지 않는 방식입니다." });
  } catch (e) {
    return res.status(500).json({ error: "동기화에 실패했습니다." });
  }
}
