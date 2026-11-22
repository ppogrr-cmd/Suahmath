/* 과목 선택 + 과목 색 — 모든 화면 맨 위 같은 자리에 같은 모양으로 나온다.
   과목을 늘릴 때는 아래 목록에 한 줄만 추가하면 된다.
   [이름, 주소, 대표색, 진한 색(카드 그라데이션), 밝은 색(버튼 위쪽), 그림자 색] */
(function(){
  var SUBJECTS=[
    ["수학","/",      "#3b5bdb","#1f2a4d","#4f8cff","#2b44a8"],
    ["영어","/voca/", "#0ca678","#0b4f43","#20c997","#087f5b"],
    ["중국어","/chinese/","#e03131","#6b1414","#ff6b6b","#b02525"],
    ["말랑이","/malang/","#f06595","#7a1f45","#ff8cc6","#c2255c"]
    // ["한자","/hanja/",   "#7048e8","#2b1d63","#9775fa","#5435b8"]
  ];
  function cur(){
    var p=location.pathname, best=SUBJECTS[0];
    if(p.indexOf("/reward")===0) return ["보상","/reward/","#e64980","#7a1f45","#ff8cc6","#c2255c"];
    SUBJECTS.forEach(function(s){ if(s[1]!=="/"&&p.indexOf(s[1].replace(/\/$/,""))===0) best=s });
    return best;
  }
  var c=cur(), r=document.documentElement.style;
  r.setProperty("--subj",c[2]); r.setProperty("--subj-d",c[3]); r.setProperty("--subj-l",c[4]); r.setProperty("--subj-s",c[5]);

  var css='.sj{display:inline-flex;gap:2px;background:#fff;border-radius:99px;padding:4px;box-shadow:0 2px 10px rgba(31,42,77,.12);max-width:100%;overflow-x:auto;scrollbar-width:none}'+
    '.sj::-webkit-scrollbar{display:none}'+
    '.sj a{flex:none;display:inline-flex;align-items:center;gap:6px;color:#7a8099;text-decoration:none;font-family:"Pretendard Variable",Pretendard,-apple-system,system-ui,sans-serif;font-size:15px;font-weight:800;line-height:1.2;padding:8px 16px 8px 13px;border-radius:99px;white-space:nowrap}'+
    '.sj a i{width:8px;height:8px;border-radius:50%;flex:none}'+
    '.sj a.on{color:#fff}.sj a.on i{background:#fff !important;opacity:.85}';
  var st=document.createElement("style"); st.textContent=css; (document.head||document.documentElement).appendChild(st);
  function draw(){
    Array.prototype.forEach.call(document.querySelectorAll("[data-subjects]"),function(el){
      el.className="sj";
      el.innerHTML=SUBJECTS.map(function(s){
        var on=s===c;
        return '<a href="'+s[1]+'"'+(on?' class="on" style="background:'+s[2]+'"':'')+'><i style="background:'+s[2]+'"></i>'+s[0]+'</a>';
      }).join("");
    });
  }
  /* ===== 보상 사탕(수아 아명 Candy): 과목 선택 줄 오른쪽 끝에 🍬 개수, 누르면 보상 화면 ===== */
  var COIN_CSS='.coin{flex:none;display:inline-flex;align-items:center;gap:4px;background:#fff;border-radius:99px;padding:8px 12px;'+
    'font:800 15px "Pretendard Variable",Pretendard,-apple-system,system-ui,sans-serif;color:#d6336c;text-decoration:none;box-shadow:0 2px 10px rgba(31,42,77,.12)}'+
    '.coin.pop{animation:coinPop .9s ease}@keyframes coinPop{30%{transform:scale(1.35)}}'+
    '@media (max-width:430px){.sj a{padding:7px 9px;font-size:14px;gap:5px}.sj a i{display:none}.coin{padding:7px 10px;font-size:14px}}';
  var st2=document.createElement("style"); st2.textContent=COIN_CSS; (document.head||document.documentElement).appendChild(st2);
  function lsGet(k){ try{ return JSON.parse(localStorage.getItem(k)) }catch(e){ return null } }
  function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)) }catch(e){} }
  function showCoin(n,pop){
    Array.prototype.forEach.call(document.querySelectorAll("[data-subjects]"),function(nav){
      var bar=nav.parentElement, a=bar.querySelector("a.coin");
      if(!a){ a=document.createElement("a"); a.className="coin"; a.href="/reward/"; bar.appendChild(a); }
      a.textContent="🍬 "+(n==null?"–":n);
      if(pop){ a.classList.remove("pop"); void a.offsetWidth; a.classList.add("pop"); }
    });
  }
  function refreshCoin(){
    fetch("/api/reward",{cache:"no-store"}).then(function(r){ return r.ok?r.json():null }).then(function(j){
      if(j){ lsSet("coinBal",j.bal); showCoin(j.bal) } }).catch(function(){});
  }
  /* 미션을 끝낸 날 한 번 부른다. 같은 과목·같은 날은 서버가 한 번만 준다.
     s: "math" | "eng" | "zh", d: 그날 날짜, hist: 예전에 미션을 한 날들(연속 계산용) */
  var sent={};
  window.rewardEarn=function(s,d,hist){
    var key=s+":"+d; if(sent[key]) return; sent[key]=1;
    var done=lsGet("coinSent")||{}; var first=!done[key];
    fetch("/api/reward",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({op:"earn",s:s,d:d,hist:hist||[]})})
      .then(function(r){ return r.ok?r.json():null }).then(function(j){
        if(!j){ sent[key]=0; return }
        done[key]=1; lsSet("coinSent",done); lsSet("coinBal",j.bal); showCoin(j.bal, first);
        if(first){
          var got=(j.ledger||[]).filter(function(x){ return x.s===s && x.d===d });
          var n=got.reduce(function(a,x){ return a+(x.n||0) },0), bon=got.filter(function(x){ return x.k==="b" })[0];
          candyParty(n||1, j.bal, bon);
        }
      }).catch(function(){ sent[key]=0 });
  };
  /* 미션을 끝내면 사탕이 쏟아지고, 받은 개수를 크게 보여 준다 */
  var PARTY_CSS='.cp{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(255,240,246,.82);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);animation:cpIn .25s ease}'+
    '@keyframes cpIn{from{opacity:0}}'+
    '.cp .rain{position:absolute;top:-60px;font-size:34px;animation:cpFall linear forwards}'+
    '@keyframes cpFall{to{transform:translateY(110vh) rotate(540deg)}}'+
    '.cp .box{position:relative;background:#fff;border-radius:30px;padding:26px 30px 22px;text-align:center;box-shadow:0 14px 40px rgba(194,37,92,.28);animation:cpPop .5s cubic-bezier(.2,1.6,.4,1)}'+
    '@keyframes cpPop{from{transform:scale(.4)}}'+
    '.cp .big{font-size:84px;line-height:1;animation:cpWig 1.2s ease-in-out infinite}'+
    '@keyframes cpWig{25%{transform:rotate(-12deg) scale(1.08)}75%{transform:rotate(12deg) scale(1.08)}}'+
    '.cp h2{margin:10px 0 4px;font:400 30px "Jua","Pretendard Variable",sans-serif;color:#c2255c}'+
    '.cp p{margin:4px 0 0;font:700 15px "Pretendard Variable",Pretendard,sans-serif;color:#4a5170}'+
    '.cp .bn{display:inline-block;margin-top:8px;padding:6px 12px;border-radius:99px;background:#fff0f6;color:#d6336c;font:800 14px "Pretendard Variable",sans-serif}'+
    '.cp .ok{margin-top:16px;border:0;border-radius:16px;padding:12px 26px;background:linear-gradient(180deg,#ff8cc6,#e64980);color:#fff;font:400 19px "Jua",sans-serif;box-shadow:0 4px 0 #c2255c}';
  var st3=document.createElement("style"); st3.textContent=PARTY_CSS; (document.head||document.documentElement).appendChild(st3);
  function candyParty(n,bal,bon){
    var el=document.createElement("div"); el.className="cp";
    var rain="", kinds=["🍬","🍭","🍬","🍬","🍭"];
    for(var i=0;i<26;i++) rain+='<span class="rain" style="left:'+(Math.random()*96)+'%;animation-duration:'+(1.8+Math.random()*1.6).toFixed(2)+'s;animation-delay:'+(Math.random()*1.2).toFixed(2)+'s">'+kinds[i%5]+'</span>';
    el.innerHTML=rain+'<div class="box"><div class="big">🍬</div><h2>사탕 +'+n+'개!</h2>'+
      (bon?'<div class="bn">🔥 '+bon.run+'일 연속 보너스 +'+bon.n+'</div>':'')+
      '<p>지금 모은 사탕 <b>'+bal+'개</b></p><button class="ok">고마워요 🍭</button></div>';
    document.body.appendChild(el);
    var close=function(){ if(el.parentNode) el.parentNode.removeChild(el) };
    el.addEventListener("click",function(e){ if(e.target.closest(".ok")||!e.target.closest(".box")) close() });
    setTimeout(close,6000);
  }
  function boot(){ draw(); showCoin(lsGet("coinBal")); refreshCoin() }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
  document.addEventListener("visibilitychange",function(){ if(!document.hidden) refreshCoin() });
})();
