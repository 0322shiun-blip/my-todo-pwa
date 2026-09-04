const KEY="mytodo.v1";
let tasks=[];
try{tasks=JSON.parse(localStorage.getItem(KEY)||"[]");if(!Array.isArray(tasks))tasks=[]}catch(e){tasks=[]}
const $=id=>document.getElementById(id);
function canonicalStatus(t){if(t.status==="deleted"||t.deletedAt)return"deleted";if(t.status==="done"||t.status==="completed"||t.completedAt)return"done";return"active"}
function normalizeTask(t){return{...t,status:canonicalStatus(t),category:t.category||"其他",updatedAt:t.updatedAt||t.createdAt||Date.now()}}
tasks=tasks.map(normalizeTask);
function save(){localStorage.setItem(KEY,JSON.stringify(tasks))}
function pad(n){return String(n).padStart(2,"0")}
function fmt(d){return isNaN(d.getTime())?"未設定":`${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`}
function localDateInput(){const d=new Date(Date.now()+60*60*1000);return `${d.getFullYear()}-${pad(d.getMonth()+1)}T${pad(d.getHours())}:${pad(d.getMinutes())}`}
function cls(t){const status=canonicalStatus(t);if(status==="done")return"done";if(status==="deleted")return"deleted";const d=new Date(t.due),n=new Date();if(!isNaN(d)&&d<n)return"overdue";if(!isNaN(d)&&d.toDateString()===n.toDateString())return"today";return""}
function normalize(s){return String(s??"").toLowerCase().replace(/[\s　，,。.!！?？、:：;；\-_/\\()（）【】\[\]「」『』]+/g,"")}
function getSearchTerms(){const el=$("search");return el?el.value.trim().split(/[\s　]+/).map(normalize).filter(Boolean):[]}
function matches(t,ignoreStatus=false){
 const terms=getSearchTerms();
 if(terms.length){const text=normalize([t.title,t.content,t.note,t.category,t.priority,canonicalStatus(t),fmt(new Date(t.due)),t.createdAt&&fmt(new Date(t.createdAt)),t.completedAt&&fmt(new Date(t.completedAt)),t.deletedAt&&fmt(new Date(t.deletedAt))].filter(Boolean).join(" "));if(!terms.every(term=>text.includes(term)))return false}
 const s=$("statusFilter")?.value||"all";if(!ignoreStatus&&s!=="all"&&canonicalStatus(t)!==s)return false;
 const c=$("categoryFilter")?.value||"all";if(c!=="all"&&(t.category||"其他")!==c)return false;
 const from=$("fromDate")?.value||"",to=$("toDate")?.value||"";const due=new Date(t.due),validDue=!isNaN(due.getTime());
 if(from&&validDue&&due<new Date(from+"T00:00:00"))return false;
 if(to&&validDue&&due>new Date(to+"T23:59:59.999"))return false;
 return true;
}
function statusRank(t){const s=canonicalStatus(t);return s==="active"?0:s==="done"?1:2}
function render(){
 $("today").textContent=new Date().toLocaleDateString("zh-TW",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
 const active=tasks.filter(t=>canonicalStatus(t)==="active").sort((a,b)=>(Number(a.due)||Infinity)-(Number(b.due)||Infinity));
 const done=tasks.filter(t=>canonicalStatus(t)==="done"),deleted=tasks.filter(t=>canonicalStatus(t)==="deleted");
 $("summary").innerHTML=`<span>待辦 ${active.length}</span><span>逾期 ${active.filter(t=>{const d=new Date(t.due);return !isNaN(d)&&d<new Date()}).length}</span><span>已完成 ${done.length}</span><span>已刪除 ${deleted.length}</span>`;
 const list=$("list");list.innerHTML="";
 const selectedStatus=$("statusFilter")?.value||"all";
 let filtered;
 if(selectedStatus==="active")filtered=active.filter(t=>matches(t,true));
 else if(selectedStatus==="done")filtered=done.filter(t=>matches(t,true));
 else if(selectedStatus==="deleted")filtered=deleted.filter(t=>matches(t,true));
 else filtered=tasks.filter(t=>matches(t,true));
 filtered.sort((a,b)=>{const sr=statusRank(a)-statusRank(b);if(sr!==0)return sr;const sa=canonicalStatus(a);if(sa==="active")return(Number(a.due)||Infinity)-(Number(b.due)||Infinity);return Number(b.updatedAt||b.completedAt||b.deletedAt||b.createdAt||0)-Number(a.updatedAt||a.completedAt||a.deletedAt||a.createdAt||0)});
 if(!filtered.length){list.innerHTML='<div class="empty">沒有符合條件的紀錄</div>';return}
 filtered.forEach(t=>{const node=$("itemTpl").content.cloneNode(true),el=node.querySelector(".task");el.classList.add(cls(t));el.dataset.id=t.id;node.querySelector(".task-title").textContent=t.title||"（未命名待辦）";const status=canonicalStatus(t),statusText=status==="done"?"已完成":status==="deleted"?"已刪除":"待辦";const times=t.remindAt?`　｜　提醒：${fmt(new Date(t.remindAt))}`:"";node.querySelector(".meta").textContent=`期限：${fmt(new Date(t.due))}　｜　${t.category||"其他"}　｜　${t.priority==="high"?"高優先":t.priority==="low"?"低優先":"一般"}　｜　${statusText}${times}`;node.querySelector(".note").textContent=t.note||t.content||"";const doneBtn=node.querySelector('[data-action="done"]'),del=node.querySelector('[data-action="delete"]'),restore=node.querySelector('[data-action="restore"]');if(status!=="active"){doneBtn.style.display="none";node.querySelector('[data-action="nextmonth"]').style.display="none";node.querySelector('[data-action="snooze10"]').style.display="none";node.querySelector('[data-action="snooze240"]').style.display="none";node.querySelector('[data-action="snooze480"]').style.display="none";node.querySelector('[data-action="custom"]').style.display="none"}if(status==="deleted")del.style.display="none";else del.textContent="刪除（保留紀錄）";if(status==="active")restore.style.display="none";if(status==="done")restore.textContent="恢復待辦";if(status==="deleted")restore.textContent="恢復紀錄";list.appendChild(node)})
}
function resetFilters(){if($("search"))$("search").value="";if($("fromDate"))$("fromDate").value="";if($("toDate"))$("toDate").value="";if($("statusFilter"))$("statusFilter").value="all";if($("categoryFilter"))$("categoryFilter").value="all"}
resetFilters();
$("due").value=localDateInput();
$("addBtn").onclick=()=>{const title=$("title").value.trim(),due=$("due").value;if(!title||!due){alert("請輸入事項與期限");return}const dueMs=new Date(due).getTime(),pre=Number($("preReminder").value),now=Date.now();tasks.push({id:crypto.randomUUID(),title,due:dueMs,priority:$("priority").value,category:$("category").value,preReminder:pre,note:$("note").value.trim(),status:"active",remindAt:dueMs-pre*60000,lastNotified:null,createdAt:now,updatedAt:now});save();render();$("title").value="";$("note").value="";$("due").value=localDateInput();scheduleCheck()};
$("list").onclick=e=>{const b=e.target.closest("button");if(!b)return;const el=e.target.closest(".task"),t=tasks.find(x=>x.id===el.dataset.id);if(!t)return;const a=b.dataset.action,now=Date.now();if(a==="done"){t.status="done";t.completedAt=now;t.updatedAt=now}if(a==="nextmonth"){const d=new Date(t.due);d.setMonth(d.getMonth()+1);t.due=d.getTime();t.remindAt=d.getTime()-Number(t.preReminder||0)*60000;t.status="active";t.lastNotified=null;t.updatedAt=now}if(a==="snooze10"){t.remindAt=now+10*60000;t.lastNotified=null;t.updatedAt=now}if(a==="snooze240"){t.remindAt=now+240*60000;t.lastNotified=null;t.updatedAt=now}if(a==="snooze480"){t.remindAt=now+480*60000;t.lastNotified=null;t.updatedAt=now}if(a==="custom"){const v=prompt("請輸入下次提醒時間（例如 2026/09/03 18:30）");if(v){const d=new Date(v.replaceAll("/","-"));if(!isNaN(d)){t.remindAt=d.getTime();t.lastNotified=null;t.updatedAt=now}else alert("時間格式無法辨識")}}if(a==="delete"){if(confirm("確定刪除？紀錄會保留在歷史查詢中。")){t.status="deleted";t.deletedAt=now;t.updatedAt=now;t.lastNotified=null}}if(a==="restore"){t.status="active";t.deletedAt=null;t.completedAt=null;t.updatedAt=now;if(!t.remindAt||t.remindAt<now)t.remindAt=now+10*60000;t.lastNotified=null}save();render();scheduleCheck()};
$("historyBtn").onclick=()=>{$("filters").classList.toggle("hidden");if(!$('filters').classList.contains('hidden')){resetFilters();$('search').focus()}render()};
["search","fromDate","toDate","statusFilter","categoryFilter"].forEach(id=>$(id).addEventListener("input",render));["statusFilter","categoryFilter"].forEach(id=>$(id).addEventListener("change",render));
$("clearFilter").onclick=()=>{resetFilters();render()};
$("notifyBtn").onclick=async()=>{if(!('Notification'in window)){alert("此瀏覽器不支援通知");return}const p=await Notification.requestPermission();alert(p==="granted"?"通知已開啟。iPhone 請將本網頁加入主畫面後使用。":"尚未允許通知")};
function notify(t){if(Notification.permission==="granted"){new Notification("待辦提醒",{body:`${t.title}\n期限：${fmt(new Date(t.due))}`});t.lastNotified=Date.now();save()}}
function scheduleCheck(){const due=tasks.filter(t=>canonicalStatus(t)==="active"&&t.remindAt&&!t.lastNotified).sort((a,b)=>a.remindAt-b.remindAt)[0];if(!due)return;const delay=Math.max(1000,due.remindAt-Date.now());clearTimeout(window.todoTimer);window.todoTimer=setTimeout(()=>{notify(due);scheduleCheck();render()},delay)}
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});render();scheduleCheck();
