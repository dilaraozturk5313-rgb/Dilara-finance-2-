const MONTHS=["2026-09","2026-10","2026-11","2026-12","2027-01"];
const DEFAULT_BUDGET={"Hyra":5625,"El":400,"Apple":40,"Hedvig":80,"Gym":360,"Mobil":600,"SL-kort":325,"Mat":2800,"Snus":640,"Nöje":1200,"Skönhet":800};
const state={
 month:localStorage.getItem("df_month")||"2026-09",
 budget:JSON.parse(localStorage.getItem("df_budget")||"null")||DEFAULT_BUDGET,
 purchases:JSON.parse(localStorage.getItem("df_purchases")||"[]"),
 salaries:JSON.parse(localStorage.getItem("df_salaries")||"[]"),
 csn:Number(localStorage.getItem("df_csn")||13500)
};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>new Intl.NumberFormat("sv-SE",{style:"currency",currency:"SEK",maximumFractionDigits:0}).format(Number(n)||0);
const label=m=>new Intl.DateTimeFormat("sv-SE",{month:"long",year:"numeric"}).format(new Date(m+"-01T12:00:00"));
const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());
function save(){localStorage.setItem("df_month",state.month);localStorage.setItem("df_budget",JSON.stringify(state.budget));localStorage.setItem("df_purchases",JSON.stringify(state.purchases));localStorage.setItem("df_salaries",JSON.stringify(state.salaries));localStorage.setItem("df_csn",state.csn)}
function purchases(){return state.purchases.filter(x=>x.date.slice(0,7)===state.month)}
function spent(cat){return purchases().filter(x=>x.category===cat).reduce((a,b)=>a+Number(b.amount),0)}
function toast(t){$("#toast").textContent=t;$("#toast").classList.remove("hidden");setTimeout(()=>$("#toast").classList.add("hidden"),1600)}
function openSheet(id){$("#sheetBackdrop").classList.remove("hidden");$("#"+id).classList.remove("hidden");$("#"+id).setAttribute("aria-hidden","false")}
function closeSheets(){$("#sheetBackdrop").classList.add("hidden");$$(".sheet").forEach(x=>{x.classList.add("hidden");x.setAttribute("aria-hidden","true")})}
function render(){
 $("#monthLabel").textContent=label(state.month);$("#csnValue").textContent=fmt(state.csn);
 const total=purchases().reduce((a,b)=>a+Number(b.amount),0), left=state.csn-total;
 $("#spentValue").textContent=fmt(total);$("#spentPct").textContent=Math.round(total/state.csn*100)+" % av CSN";
 $("#remainingValue").textContent=fmt(left);
 const allSaved=state.salaries.reduce((a,b)=>a+Number(b.amount),0);
 $("#savedValue").textContent=fmt(allSaved);$("#salaryTotal").textContent=fmt(allSaved);
 $("#monthSalary").textContent=fmt(state.salaries.filter(x=>x.month===state.month).reduce((a,b)=>a+Number(b.amount),0));
 $("#plannedLeft").textContent=fmt(state.csn-Object.values(state.budget).reduce((a,b)=>a+Number(b),0));
 renderBudget();renderPurchases();renderSalaries();renderChips();save()
}
function renderBudget(){
 $("#budgetList").innerHTML=Object.entries(state.budget).map(([cat,b])=>{const u=spent(cat),l=b-u,p=Math.min(100,Math.max(0,u/b*100));return `<div class="budget-row"><div class="budget-line"><strong>${cat}</strong><small>${fmt(u)} av ${fmt(b)}</small></div><div class="bar"><i style="width:${p}%"></i></div><div class="budget-line"><small>Kvar</small><strong style="font-family:inherit">${fmt(l)}</strong></div></div>`}).join("")
}
function renderPurchases(){
 const list=$("#purchaseList"), rows=[...purchases()].sort((a,b)=>b.date.localeCompare(a.date));
 if(!rows.length){list.innerHTML='<div class="empty">Inga köp registrerade ännu.</div>';return}
 list.innerHTML=rows.map(x=>`<div class="item"><div><strong>${x.description}</strong><br><small>${x.category} · ${x.date}</small></div><div style="text-align:right"><strong>${fmt(x.amount)}</strong><div class="actions"><button data-edit-purchase="${x.id}">Ändra</button><button class="delete" data-delete-purchase="${x.id}">Ta bort</button></div></div></div>`).join("")
}
function renderSalaries(){
 const list=$("#salaryList"), rows=[...state.salaries].sort((a,b)=>b.month.localeCompare(a.month));
 if(!rows.length){list.innerHTML='<div class="empty">Ingen lön registrerad ännu.</div>';return}
 list.innerHTML=rows.map(x=>`<div class="item"><div><strong>${label(x.month)}</strong><br><small>Sparande</small></div><div style="text-align:right"><strong>${fmt(x.amount)}</strong><div class="actions"><button data-edit-salary="${x.id}">Ändra</button><button class="delete" data-delete-salary="${x.id}">Ta bort</button></div></div></div>`).join("")
}
function renderChips(){
 const cats=Object.keys(state.budget);$("#categoryChips").innerHTML=cats.map((x,i)=>`<button class="chip ${i===0?"active":""}" data-cat="${x}">${x}</button>`).join("")
}
function setQuickCat(cat){$$(".chip").forEach(x=>x.classList.toggle("active",x.dataset.cat===cat))}
function newPurchase(){
 $("#purchaseId").value="";$("#purchaseSheetTitle").textContent="Nytt köp";$("#purchaseAmount").value="";$("#purchaseDesc").value="";
 $("#purchaseCategory").innerHTML=Object.keys(state.budget).map(x=>`<option>${x}</option>`).join("");
 $("#purchaseDate").value=new Date().toISOString().slice(0,10);openSheet("purchaseSheet");setTimeout(()=>$("#purchaseAmount").focus(),250)
}
function editPurchase(id){const x=state.purchases.find(y=>y.id===id);if(!x)return;$("#purchaseId").value=x.id;$("#purchaseSheetTitle").textContent="Ändra köp";$("#purchaseAmount").value=x.amount;$("#purchaseDesc").value=x.description;$("#purchaseCategory").innerHTML=Object.keys(state.budget).map(c=>`<option ${c===x.category?"selected":""}>${c}</option>`).join("");$("#purchaseDate").value=x.date;openSheet("purchaseSheet")}
function editSalary(id){const x=state.salaries.find(y=>y.id===id);if(!x)return;$("#salaryId").value=x.id;$("#salarySheetTitle").textContent="Ändra lön";$("#salaryAmount").value=x.amount;$("#salaryMonth").value=x.month;openSheet("salarySheet")}
function exportCsv(){const rows=[["Datum","Beskrivning","Kategori","Belopp"],...state.purchases.map(x=>[x.date,x.description,x.category,x.amount])];const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download="dilara-kop.csv";a.click();URL.revokeObjectURL(a.href)}
$("#quickSave").onclick=()=>{const a=Number($("#quickAmount").value),d=$("#quickDesc").value.trim(),cat=$(".chip.active")?.dataset.cat;if(!a||!d||!cat)return toast("Fyll i belopp, köp och kategori");state.purchases.push({id:uid(),amount:a,description:d,category:cat,date:new Date().toISOString().slice(0,10)});$("#quickAmount").value="";$("#quickDesc").value="";render();toast("Köpet är sparat")}
$("#categoryChips").onclick=e=>{if(e.target.dataset.cat)setQuickCat(e.target.dataset.cat)}
$("#fab").onclick=newPurchase;$("#editBudget").onclick=()=>{$("#budgetInputs").innerHTML=Object.entries(state.budget).map(([k,v])=>`<label class="budget-input"><span>${k}</span><input data-budget="${k}" type="number" min="0" step="1" value="${v}"></label>`).join("");openSheet("budgetSheet")}
$("#addSalary").onclick=()=>{$("#salaryId").value="";$("#salarySheetTitle").textContent="Lägg till lön";$("#salaryAmount").value="";$("#salaryMonth").value=state.month;openSheet("salarySheet")}
$("#settingsBtn").onclick=()=>openSheet("settingsSheet");$(".closeSheet").onclick=closeSheets;$$(".closeSheet").forEach(x=>x.onclick=closeSheets);$("#sheetBackdrop").onclick=closeSheets;
$("#purchaseForm").onsubmit=e=>{e.preventDefault();const id=$("#purchaseId").value,data={id:id||uid(),amount:Number($("#purchaseAmount").value),description:$("#purchaseDesc").value.trim(),category:$("#purchaseCategory").value,date:$("#purchaseDate").value};if(id)state.purchases=state.purchases.map(x=>x.id===id?data:x);else state.purchases.push(data);closeSheets();render();toast(id?"Köpet är ändrat":"Köpet är sparat")}
$("#salaryForm").onsubmit=e=>{e.preventDefault();const id=$("#salaryId").value,data={id:id||uid(),amount:Number($("#salaryAmount").value),month:$("#salaryMonth").value};if(id)state.salaries=state.salaries.map(x=>x.id===id?data:x);else state.salaries.push(data);closeSheets();render();toast(id?"Lönen är ändrad":"Lönen är sparad")}
$("#budgetForm").onsubmit=e=>{e.preventDefault();$$("[data-budget]").forEach(x=>state.budget[x.dataset.budget]=Number(x.value));closeSheets();render();toast("Budgeten är uppdaterad")}
$("#purchaseList").onclick=e=>{if(e.target.dataset.editPurchase)editPurchase(e.target.dataset.editPurchase);if(e.target.dataset.deletePurchase&&confirm("Ta bort köpet?")){state.purchases=state.purchases.filter(x=>x.id!==e.target.dataset.deletePurchase);render()}}
$("#salaryList").onclick=e=>{if(e.target.dataset.editSalary)editSalary(e.target.dataset.editSalary);if(e.target.dataset.deleteSalary&&confirm("Ta bort lönen?")){state.salaries=state.salaries.filter(x=>x.id!==e.target.dataset.deleteSalary);render()}}
$("#prevMonth").onclick=()=>{let i=MONTHS.indexOf(state.month);state.month=MONTHS[Math.max(0,i-1)];render()}
$("#nextMonth").onclick=()=>{let i=MONTHS.indexOf(state.month);state.month=MONTHS[Math.min(MONTHS.length-1,i+1)];render()}
$("#exportBtn").onclick=exportCsv;
$("#backupBtn").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));a.download="dilara-finance-backup.json";a.click();URL.revokeObjectURL(a.href)}
$("#importFile").onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());Object.assign(state,data);closeSheets();render();toast("Säkerhetskopian är importerad")}catch{toast("Filen kunde inte läsas")}}
$("#resetBtn").onclick=()=>{if(confirm("Rensa alla köp, löner och ändringar?")){localStorage.clear();location.reload()}}
$$("[data-jump]").forEach(b=>b.onclick=()=>{const m={top:".hero",budget:"#budgetList",purchases:"#purchaseList",salary:"#salaryList"};$(m[b.dataset.jump]).scrollIntoView({behavior:"smooth"})})
if("serviceWorker"in navigator){navigator.serviceWorker.register("./sw.js").catch(()=>{})}
render();