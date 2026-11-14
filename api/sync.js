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
      let incoming = req.body;
      if (typeof incoming === "string") { try { incoming = JSON.parse(incoming); } catch (e) { incoming = {}; } }
      incoming = incoming || {};
      // 서버에 있던 기록과 합친다: 문제는 더 최근 것, 미션 묶음(_g)은 진행이 더 된 쪽
      const g0 = await fetch(base + "/get/" + key, { headers: auth }).then(r => r.json()).catch(() => null);
      let stored = {};
      if (g0 && g0.result) { try { stored = JSON.parse(g0.result) || {}; } catch (e) { stored = {}; } }
      const merged = Object.assign({}, stored);
      for (const id in incoming) {
        if (id === "_g") { merged._g = mergeG(stored._g, incoming._g); continue; }
        const a = stored[id], b = incoming[id];
        if (!a || ((b && b.last) || 0) >= ((a && a.last) || 0)) merged[id] = b;
      }
      const body = JSON.stringify(merged);
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

/* 미션·연속·하루 기록 묶음(_g) 합치기 — 앱과 서버가 같은 규칙을 쓴다.
   덮어쓰기 대신 "진행이 더 된 쪽"을 남긴다. */
function mergeG(a,b){
  if(!a) return b; if(!b) return a;
  function dnum(s){ if(!s) return 0; var p=String(s).split("-"); return (+p[0])*10000+(+p[1])*100+(+p[2]) }
  var base=(a.last||0)>=(b.last||0)?a:b, o={}, k;
  for(k in base) o[k]=base[k];
  // 오늘의 미션: 더 최근 날짜 → 같은 날이면 끝낸 쪽 → 더 많이 푼 쪽
  var ma=dnum(a.mDay), mb=dnum(b.mDay), win;
  if(ma!==mb) win=ma>mb?a:b;
  else if(!!a.mDone!==!!b.mDone) win=a.mDone?a:b;
  else win=(a.mI||0)>=(b.mI||0)?a:b;
  o.mDay=win.mDay; o.mIds=win.mIds; o.mI=win.mI; o.mDone=win.mDone;
  // 연속 기록: 더 최근에 미션을 끝낸 쪽
  var la=dnum(a.lastDay), lb=dnum(b.lastDay);
  if(la!==lb){ var w=la>lb?a:b; o.lastDay=w.lastDay; o.streak=w.streak||0 }
  else { o.lastDay=a.lastDay||b.lastDay||""; o.streak=Math.max(a.streak||0,b.streak||0) }
  ["best","mCount","perfect","comeback","coins"].forEach(function(f){ if(a[f]!=null||b[f]!=null) o[f]=Math.max(a[f]||0,b[f]||0) });
  // 하루 기록: 날짜별로 항목마다 큰 값
  if(a.log||b.log){ o.log={}; [a.log||{},b.log||{}].forEach(function(L){ for(var d in L){ var x=o.log[d]||(o.log[d]={}); for(var f in L[d]) x[f]=Math.max(x[f]||0,L[d][f]||0) } }) }
  if(a.bseen||b.bseen){ var s={}; (a.bseen||[]).concat(b.bseen||[]).forEach(function(x){ s[x]=1 }); o.bseen=Object.keys(s) }
  o.last=Math.max(a.last||0,b.last||0);
  return o;
}
