/* 과목 선택 + 과목 색 — 모든 화면 맨 위 같은 자리에 같은 모양으로 나온다.
   과목을 늘릴 때는 아래 목록에 한 줄만 추가하면 된다.
   [이름, 주소, 대표색, 진한 색(카드 그라데이션), 밝은 색(버튼 위쪽), 그림자 색] */
(function(){
  var SUBJECTS=[
    ["수학","/",      "#3b5bdb","#1f2a4d","#4f8cff","#2b44a8"],
    ["영어","/voca/", "#0ca678","#0b4f43","#20c997","#087f5b"],
    ["중국어","/chinese/","#e03131","#6b1414","#ff6b6b","#b02525"]
    // ["한자","/hanja/",   "#7048e8","#2b1d63","#9775fa","#5435b8"]
  ];
  function cur(){
    var p=location.pathname, best=SUBJECTS[0];
    if(p.indexOf("/reward")===0) return ["보상","/reward/","#f59f00","#7a4a00","#ffc078","#d9480f"];
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
  /* ===== 보상 코인: 과목 선택 줄 오른쪽 끝에 🪙 개수, 누르면 보상 화면 ===== */
  var COIN_CSS='.coin{flex:none;display:inline-flex;align-items:center;gap:4px;background:#fff;border-radius:99px;padding:8px 12px;'+
    'font:800 15px "Pretendard Variable",Pretendard,-apple-system,system-ui,sans-serif;color:#e67700;text-decoration:none;box-shadow:0 2px 10px rgba(31,42,77,.12)}'+
    '.coin.pop{animation:coinPop .9s ease}@keyframes coinPop{30%{transform:scale(1.35)}}'+
    '@media (max-width:430px){.sj a{padding:7px 10px 7px 9px;font-size:14px;gap:5px}.coin{padding:7px 10px;font-size:14px}}';
  var st2=document.createElement("style"); st2.textContent=COIN_CSS; (document.head||document.documentElement).appendChild(st2);
  function lsGet(k){ try{ return JSON.parse(localStorage.getItem(k)) }catch(e){ return null } }
  function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)) }catch(e){} }
  function showCoin(n,pop){
    Array.prototype.forEach.call(document.querySelectorAll("[data-subjects]"),function(nav){
      var bar=nav.parentElement, a=bar.querySelector("a.coin");
      if(!a){ a=document.createElement("a"); a.className="coin"; a.href="/reward/"; bar.appendChild(a); }
      a.textContent="🪙 "+(n==null?"–":n);
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
      }).catch(function(){ sent[key]=0 });
  };
  function boot(){ draw(); showCoin(lsGet("coinBal")); refreshCoin() }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
  document.addEventListener("visibilitychange",function(){ if(!document.hidden) refreshCoin() });
})();
