const KEY="mytodo.v1";
let tasks=JSON.parse(localStorage.getItem(KEY)||"[]");
const $=id=>document.getElementById(id);
tasks=tasks.map(t=>({...t,status:t.status||"active",category:t.category||"其他",updatedAt:t.updatedAt||t.createdAt||Date.now()}));
function save(){localStorage.setItem(KEY,JSON.stringify(tasks))}
function pad(n){return String(n).padStart(2,"0")}
function fmt(d){return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`}
function localDateInput(){const d=new Date(Date.now()+60*60*1000);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`}
function cls(t){if(t.status==="done")return"done";if(t.status==="deleted")return"deleted";const d=new Date(t.due),n=new Date();if(d<n)return"overdue";if(d.toDateString()===n.toDateString())return"today";return""}
function normalize(s){return String(s??"").toLowerCase().replace(/[\s　，,。.!！?？、:：;；\-_/\\()（）【】\[\]「」『』]+/g,"")}
function getSearchTerms(){return $("search").value.trim().split(/[\s　]+/).map(normalize).filter(Boolean)}
function matches(t){
  const terms=getSearchTerms();
  if(terms.length){
    const text=normalize([t.title,t.content,t.note,t.category,t.priority,t.status,fmt(new Date(t.due)),t.createdAt&&fmt(new Date(t.createdAt)),t.completedAt&&fmt(new Date(t.completedAt)),t.deletedAt&&fmt(new Date(t.deletedAt))].filter(Boolean).join(" "));
    if(!terms.every(term=>text.includes(term)))return false;
  }
  const s=$("statusFilter").value;if(s!=="all"&&t.status!==s)return false;
  const c=$("categoryFilter").value;if(c!=="all"&&(t.category||"其他")!==c)return false;
  const due=new Date(t.due);
  const from=$("fromDate").value;const to=$("toDate").value;
  if(from){const d=new Date(from+"T00:00:00");if(due<d)return false}
  if(to){const d=new Date(to+"T23:59:59.999");if(due>d)return false}
  return true;
}
function statusRank(t){return t.status==="active"?0:t.status==="done"?1:2}
function render(){
  $("today").textContent=new Date().toLocaleDateString("zh-TW",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  const active=tasks.filter(t=>t.status==="active").sort((a,b)=>new Date(a.due)-new Date(b.due));
  const done=tasks.filter(t=>t.status==="done");const deleted=tasks.filter(t=>t.status==="deleted");
  $("summary").innerHTML=`<span>待辦 ${active.length}</span><span>逾期 ${active.filter(t=>new Date(t.due)<new Date()).length}</span><span>已完成 ${done.length}</span><span>已刪除 ${deleted.length}</span>`;
  const list=$("list");list.innerHTML="";
  const filtered=tasks.filter(matches).sort((a,b)=>{
    const sr=statusRank(a)-statusRank(b);
    if(sr!==0)return sr;
    if(a.status==="active")return new Date(a.due)-new Date(b.due);
    return new Date(b.updatedAt||b.completedAt||b.deletedAt||b.createdAt||b.due)-new Date(a.updatedAt||a.completedAt||a.deletedAt||a.createdAt||a.due);
  });
  if(!filtered.length){list.innerHTML='<div class="empty">沒有符合條件的紀錄</div>';return}
  filtered.forEach(t=>{
    const node=$("itemTpl").content.cloneNode(true),el=node.querySelector(".task");el.classList.add(cls(t));el.dataset.id=t.id;
    node.querySelector(".task-title").textContent=t.title;
    const status=t.status==="done"?"已完成":t.status==="deleted"?"已刪除":"待辦";
    const times=t.remindAt?`　｜　提醒：${fmt(new Date(t.remindAt))}`:"";
    node.querySelector(".meta").textContent=`期限：${fmt(new Date(t.due))}　｜　${t.category||"其他"}　｜　${t.priority==="high"?"高優先":t.priority==="low"?"低優先":"一般"}　｜　${status}${times}`;
    node.querySelector(".note").textContent=t.note||t.content||"";
    const done=node.querySelector('[data-action="done"]'),del=node.querySelector('[data-action="delete"]'),restore=node.querySelector('[data-action="restore"]');
    if(t.status!=="active"){done.style.display="none";node.querySelector('[data-action="nextmonth"]').style.display="none";node.querySelector('[data-action="snooze10"]').style.display="none";node.querySelector('[data-action="snooze240"]').style.display="none";node.querySelector('[data-action="snooze480"]').style.display="none";node.querySelector('[data-action="custom"]').style.display="none"}
    if(t.status==="deleted")del.style.display="none";else del.textContent="刪除（保留紀錄）";
    if(t.status==="active")restore.style.display="none";
    if(t.status==="done")restore.textContent="恢復待辦";
    if(t.status==="deleted")restore.textContent="恢復紀錄";
    list.appendChild(node);
  });
}
$("due").value=localDateInput();
$("addBtn").onclick=()=>{
  const title=$("title").value.trim(),due=$("due").value;if(!title||!due){alert("請輸入事項與期限");return}
  const dueMs=new Date(due).getTime(),pre=Number($("preReminder").value),now=Date.now();
  tasks.push({id:crypto.randomUUID(),title,due:dueMs,priority:$("priority").value,category:$("category").value,preReminder:pre,note:$("note").value.trim(),status:"active",remindAt:dueMs-pre*60000,lastNotified:null,createdAt:now,updatedAt:now});
  save();render();$("title").value="";$("note").value="";$("due").value=localDateInput();scheduleCheck();
};
$("list").onclick=e=>{
  const b=e.target.closest("button");if(!b)return;const el=e.target.closest(".task"),t=tasks.find(x=>x.id===el.dataset.id);if(!t)return;
  const a=b.dataset.action,now=Date.now();
  if(a==="done"){t.status="done";t.completedAt=now;t.updatedAt=now}
  if(a==="nextmonth"){const d=new Date(t.due);d.setMonth(d.getMonth()+1);t.due=d.getTime();t.remindAt=d.getTime()-t.preReminder*60000;t.status="active";t.lastNotified=null;t.updatedAt=now}
  if(a==="snooze10"){t.remindAt=now+10*60000;t.lastNotified=null;t.updatedAt=now}
  if(a==="snooze240"){t.remindAt=now+240*60000;t.lastNotified=null;t.updatedAt=now}
  if(a==="snooze480"){t.remindAt=now+480*60000;t.lastNotified=null;t.updatedAt=now}
  if(a==="custom"){const v=prompt("請輸入下次提醒時間（例如 2026/09/03 18:30）");if(v){const d=new Date(v.replaceAll("/","-"));if(!isNaN(d)){t.remindAt=d.getTime();t.lastNotified=null;t.updatedAt=now}else alert("時間格式無法辨識")}}
  if(a==="delete"){if(confirm("確定刪除？紀錄會保留在歷史查詢中。")){t.status="deleted";t.deletedAt=now;t.updatedAt=now;t.lastNotified=null}}
  if(a==="restore"){t.status="active";t.deletedAt=null;t.completedAt=null;t.updatedAt=now;if(!t.remindAt||t.remindAt<now)t.remindAt=now+10*60000;t.lastNotified=null}
  save();render();scheduleCheck();
};
$("historyBtn").onclick=()=>{$("filters").classList.toggle("hidden");if(!$('filters').classList.contains('hidden'))$('search').focus();render()};
["search","fromDate","toDate","statusFilter","categoryFilter"].forEach(id=>$(id).addEventListener("input",render));
["statusFilter","categoryFilter"].forEach(id=>$(id).addEventListener("change",render));
$("clearFilter").onclick=()=>{$("search").value="";$('fromDate').value="";$('toDate').value="";$('statusFilter').value="all";$('categoryFilter').value="all";render()};
$("notifyBtn").onclick=async()=>{if(!('Notification'in window)){alert("此瀏覽器不支援通知");return}const p=await Notification.requestPermission();alert(p==="granted"?"通知已開啟。iPhone 請將本網頁加入主畫面後使用。":"尚未允許通知")};
function notify(t){if(Notification.permission==="granted"){new Notification("待辦提醒",{body:`${t.title}\n期限：${fmt(new Date(t.due))}`});t.lastNotified=Date.now();save()}}
function scheduleCheck(){const due=tasks.filter(t=>t.status==="active"&&t.remindAt&&!t.lastNotified).sort((a,b)=>a.remindAt-b.remindAt)[0];if(!due)return;const delay=Math.max(1000,due.remindAt-Date.now());clearTimeout(window.todoTimer);window.todoTimer=setTimeout(()=>{notify(due);scheduleCheck();render()},delay)}
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
render();scheduleCheck();
