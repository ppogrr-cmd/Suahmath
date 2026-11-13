/* 과목 선택 — 모든 화면 맨 위 같은 자리에 같은 모양으로 나온다.
   과목을 늘릴 때는 아래 목록에 한 줄만 추가하면 된다. 예: ["중국어","/chinese/"], ["한자","/hanja/"] */
(function(){
  var SUBJECTS=[
    ["수학","/"],
    ["영어","/voca/"]
  ];
  var css='.sj{display:inline-flex;gap:2px;background:#fff;border-radius:99px;padding:4px;box-shadow:0 2px 10px rgba(31,42,77,.12);max-width:100%;overflow-x:auto;scrollbar-width:none}'+
    '.sj::-webkit-scrollbar{display:none}'+
    '.sj a{flex:none;color:#7a8099;text-decoration:none;font-family:"Pretendard Variable",Pretendard,-apple-system,system-ui,sans-serif;font-size:15px;font-weight:800;line-height:1.2;padding:8px 18px;border-radius:99px;white-space:nowrap}'+
    '.sj a.on{background:#1f2a4d;color:#fff}';
  var st=document.createElement("style"); st.textContent=css; document.head.appendChild(st);
  function cur(){
    var p=location.pathname, best=SUBJECTS[0][1];
    SUBJECTS.forEach(function(s){ if(s[1]!=="/"&&p.indexOf(s[1].replace(/\/$/,""))===0) best=s[1] });
    return best;
  }
  function draw(){
    var c=cur();
    Array.prototype.forEach.call(document.querySelectorAll("[data-subjects]"),function(el){
      el.className="sj";
      el.innerHTML=SUBJECTS.map(function(s){ return '<a href="'+s[1]+'"'+(s[1]===c?' class="on"':'')+'>'+s[0]+'</a>' }).join("");
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",draw); else draw();
})();
