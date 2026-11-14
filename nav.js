/* 과목 선택 + 과목 색 — 모든 화면 맨 위 같은 자리에 같은 모양으로 나온다.
   과목을 늘릴 때는 아래 목록에 한 줄만 추가하면 된다.
   [이름, 주소, 대표색, 진한 색(카드 그라데이션), 밝은 색(버튼 위쪽), 그림자 색] */
(function(){
  var SUBJECTS=[
    ["수학","/",      "#3b5bdb","#1f2a4d","#4f8cff","#2b44a8"],
    ["영어","/voca/", "#0ca678","#0b4f43","#20c997","#087f5b"]
    // ["중국어","/chinese/","#e03131","#6b1414","#ff6b6b","#b02525"],
    // ["한자","/hanja/",   "#7048e8","#2b1d63","#9775fa","#5435b8"]
  ];
  function cur(){
    var p=location.pathname, best=SUBJECTS[0];
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
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",draw); else draw();
})();
