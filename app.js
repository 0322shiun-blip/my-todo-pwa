const KEY="mytodo.v1";
let tasks=JSON.parse(localStorage.getItem(KEY)||"[]");
const $=id=>document.getElementById(id);
function save(){localStorage.setItem(KEY,JSON.stringify(tasks))}
function pad(n){return String(n).padStart(2,"0")}
function fmt(d){return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`}
function localDateInput(){const d=new Date(Date.now()+60*60*1000);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`}
function cls(t){if(t.status==="done")return"done";const d=new Date(t.due),n=new Date();if(d<n)return"overdue";if(d.toDateString()===n.toDateString())return"today";return""}
function render(){
  $("today").textContent=new Date().toLocaleDateString("zh-TW",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  const active=tasks.filter(t=>t.status!=="done").sort((a,b)=>new Date(a.due)-new Date(b.due));
  const done=tasks.filter(t=>t.status==="done");
  $("summary").innerHTML=`<span>待辦 ${active.length}</span><span>逾期 ${active.filter(t=>new Date(t.due)<new Date()).length}</span><span>已完成 ${done.length}</span>`;
  const list=$("list"); list.innerHTML="";
  if(!active.length){list.innerHTML='<div class="empty">目前沒有待辦事項 🎉</div>';return}
  active.forEach(t=>{
    const node=$("itemTpl").content.cloneNode(true), el=node.querySelector(".task");
    el.classList.add(cls(t)); el.dataset.id=t.id;
    node.querySelector(".task-title").textContent=t.title;
    node.querySelector(".meta").textContent=`期限：${fmt(new Date(t.due))}　｜　${t.priority==="high"?"高優先":t.priority==="low"?"低優先":"一般"}${t.remindAt?`　｜　提醒：${fmt(new Date(t.remindAt))}`:""}`;
    node.querySelector(".note").textContent=t.note||"";
    list.appendChild(node);
  });
}
$("due").value=localDateInput();
$("addBtn").onclick=()=>{
  const title=$("title").value.trim(), due=$("due").value;
  if(!title||!due){alert("請輸入事項與期限");return}
  const dueMs=new Date(due).getTime(), pre=Number($("preReminder").value);
  const t={id:crypto.randomUUID(),title,due:dueMs,priority:$("priority").value,preReminder:pre,note:$("note").value.trim(),status:"active",remindAt:dueMs-pre*60000,lastNotified:null};
  tasks.push(t);save();render(); $("title").value="";$("note").value=""; $("due").value=localDateInput(); scheduleCheck();
};
$("list").onclick=e=>{
  const b=e.target.closest("button"); if(!b)return;
  const el=e.target.closest(".task"), t=tasks.find(x=>x.id===el.dataset.id); if(!t)return;
  const a=b.dataset.action, now=Date.now();
  if(a==="done"){t.status="done";t.completedAt=now}
  if(a==="nextmonth"){const d=new Date(t.due);d.setMonth(d.getMonth()+1);t.due=d.getTime();t.remindAt=d.getTime()-t.preReminder*60000;t.status="active";t.lastNotified=null}
  if(a==="snooze10"){t.remindAt=now+10*60000;t.lastNotified=null}
  if(a==="snooze240"){t.remindAt=now+240*60000;t.lastNotified=null}
  if(a==="snooze480"){t.remindAt=now+480*60000;t.lastNotified=null}
  if(a==="custom"){const v=prompt("請輸入下次提醒時間（例如 2026/08/18 18:30）");if(v){const d=new Date(v.replaceAll("/","-"));if(!isNaN(d)){t.remindAt=d.getTime();t.lastNotified=null}else alert("時間格式無法辨識")}}
  if(a==="delete"){if(confirm("確定永久刪除此事項？"))tasks=tasks.filter(x=>x.id!==t.id)}
  save();render();scheduleCheck();
};
$("notifyBtn").onclick=async()=>{
  if(!("Notification"in window)){alert("此瀏覽器不支援通知");return}
  const p=await Notification.requestPermission();
  alert(p==="granted"?"通知已開啟。iPhone 請將本網頁加入主畫面後使用。":"尚未允許通知");
};
function notify(t){
  if(Notification.permission==="granted"){
    new Notification("待辦提醒",{body:`${t.title}\n期限：${fmt(new Date(t.due))}`});
    t.lastNotified=Date.now();save();
  }
}
function scheduleCheck(){
  const due=tasks.filter(t=>t.status==="active"&&t.remindAt&&!t.lastNotified).sort((a,b)=>a.remindAt-b.remindAt)[0];
  if(!due)return;
  const delay=Math.max(1000,due.remindAt-Date.now());
  clearTimeout(window.todoTimer);
  window.todoTimer=setTimeout(()=>{notify(due);scheduleCheck();render()},delay);
}
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
render(); scheduleCheck();
