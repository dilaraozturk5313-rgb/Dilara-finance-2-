const MONTHS=["2026-07","2026-08","2026-09","2026-10","2026-11","2026-12","2027-01"];
const DEFAULT_BUDGET={"Hyra":5625,"El":400,"Apple":40,"Hedvig":80,"Gym":360,"Mobil":600,"SL-kort":325,"Mat":2800,"Snus":640,"Nöje":1200,"Skönhet":800};

const state={
  month:localStorage.getItem("df_month")||"2026-09",
  budget:JSON.parse(localStorage.getItem("df_budget")||"null")||DEFAULT_BUDGET,
  purchases:JSON.parse(localStorage.getItem("df_purchases")||"[]"),
  salaries:JSON.parse(localStorage.getItem("df_salaries")||"[]"),
  csn:Number(localStorage.getItem("df_csn")||13500),
  activeCategory:null
};

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>new Intl.NumberFormat("sv-SE",{style:"currency",currency:"SEK",maximumFractionDigits:0}).format(Number(n)||0);
const label=m=>new Intl.DateTimeFormat("sv-SE",{month:"long",year:"numeric"}).format(new Date(m+"-01T12:00:00"));
const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());

function save(){
  localStorage.setItem("df_month",state.month);
  localStorage.setItem("df_budget",JSON.stringify(state.budget));
  localStorage.setItem("df_purchases",JSON.stringify(state.purchases));
  localStorage.setItem("df_salaries",JSON.stringify(state.salaries));
  localStorage.setItem("df_csn",String(state.csn));
}
function selectedMonthDate(){
  const now=new Date();
  const [year,month]=state.month.split("-").map(Number);
  const lastDay=new Date(year,month,0).getDate();
  const day=String(Math.min(now.getDate(),lastDay)).padStart(2,"0");
  return `${state.month}-${day}`;
}
function monthPurchases(){
  return state.purchases.filter(p=>p.date.slice(0,7)===state.month);
}
function categoryPurchases(category){
  return monthPurchases().filter(p=>p.category===category).sort((a,b)=>b.date.localeCompare(a.date));
}
function spentInCategory(category){
  return categoryPurchases(category).reduce((sum,p)=>sum+Number(p.amount),0);
}
function toast(message){
  $("#toast").textContent=message;
  $("#toast").classList.remove("hidden");
  setTimeout(()=>$("#toast").classList.add("hidden"),1700);
}
function openSheet(id){
  $("#backdrop").classList.remove("hidden");
  $("#"+id).classList.remove("hidden");
  $("#"+id).setAttribute("aria-hidden","false");
}
function closeSheets(){
  $("#backdrop").classList.add("hidden");
  $$(".sheet").forEach(s=>{s.classList.add("hidden");s.setAttribute("aria-hidden","true")});
}

function render(){
  $("#monthLabel").textContent=label(state.month);
  $("#quickHint").textContent=`Köpet sparas i ${label(state.month)}.`;
  $("#csnValue").textContent=fmt(state.csn);

  const spent=monthPurchases().reduce((sum,p)=>sum+Number(p.amount),0);
  const remaining=state.csn-spent;
  $("#spentValue").textContent=fmt(spent);
  $("#spentPct").textContent=`${Math.max(0,Math.round(spent/state.csn*100))} % av CSN`;
  $("#remainingValue").textContent=fmt(remaining);

  const totalSaved=state.salaries.reduce((sum,s)=>sum+Number(s.amount),0);
  const currentSalary=state.salaries.filter(s=>s.month===state.month).reduce((sum,s)=>sum+Number(s.amount),0);
  $("#savedValue").textContent=fmt(totalSaved);
  $("#monthSalary").textContent=fmt(currentSalary);
  $("#salaryTotal").textContent=fmt(totalSaved);

  const planned=Object.values(state.budget).reduce((sum,n)=>sum+Number(n),0);
  $("#plannedLeft").textContent=fmt(state.csn-planned);

  renderBudget();
  renderPurchases();
  renderSalaries();
  renderChips();
  save();
}
function renderBudget(){
  $("#budgetList").innerHTML=Object.entries(state.budget).map(([category,budget])=>{
    const used=spentInCategory(category);
    const left=budget-used;
    const pct=Math.min(100,Math.max(0,used/budget*100));
    return `
      <button class="budget-row" data-category="${category}" aria-label="Öppna ${category}">
        <div class="budget-line">
          <strong>${category}</strong>
          <small>${fmt(used)} av ${fmt(budget)}</small>
        </div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div class="budget-line">
          <small>Kvar</small>
          <strong style="font-family:inherit">${fmt(left)}</strong>
        </div>
      </button>`;
  }).join("");
}
function renderPurchases(){
  const list=$("#purchaseList");
  const rows=[...monthPurchases()].sort((a,b)=>b.date.localeCompare(a.date));
  if(!rows.length){
    const otherCount=state.purchases.length;
    list.innerHTML=`<div class="empty">Inga köp i ${label(state.month)}.${otherCount?` Du har ${otherCount} köp i andra månader.`:""}</div>`;
    return;
  }
  list.innerHTML=rows.map(p=>`
    <div class="item">
      <div>
        <strong>${p.description}</strong><br>
        <small>${p.category} · ${p.date}</small>
      </div>
      <div style="text-align:right">
        <strong>${fmt(p.amount)}</strong>
        <div class="actions">
          <button data-edit-purchase="${p.id}">Ändra</button>
          <button class="delete" data-delete-purchase="${p.id}">Ta bort</button>
        </div>
      </div>
    </div>`).join("");
}
function renderSalaries(){
  const list=$("#salaryList");
  const rows=[...state.salaries].sort((a,b)=>b.month.localeCompare(a.month));
  if(!rows.length){
    list.innerHTML='<div class="empty">Ingen lön registrerad ännu.</div>';
    return;
  }
  list.innerHTML=rows.map(s=>`
    <div class="item">
      <div>
        <strong>${label(s.month)}</strong><br>
        <small>Sparande</small>
      </div>
      <div style="text-align:right">
        <strong>${fmt(s.amount)}</strong>
        <div class="actions">
          <button data-edit-salary="${s.id}">Ändra</button>
          <button class="delete" data-delete-salary="${s.id}">Ta bort</button>
        </div>
      </div>
    </div>`).join("");
}
function renderChips(){
  const categories=Object.keys(state.budget);
  $("#categoryChips").innerHTML=categories.map((category,index)=>`
    <button class="chip ${index===0?"active":""}" data-chip="${category}">${category}</button>
  `).join("");
}
function setActiveChip(category){
  $$(".chip").forEach(chip=>chip.classList.toggle("active",chip.dataset.chip===category));
}
function fillPurchaseCategoryOptions(selected){
  $("#purchaseCategory").innerHTML=Object.keys(state.budget).map(category=>
    `<option ${category===selected?"selected":""}>${category}</option>`
  ).join("");
}
function openNewPurchase(prefillCategory=null){
  $("#purchaseId").value="";
  $("#purchaseSheetTitle").textContent="Nytt köp";
  $("#purchaseAmount").value="";
  $("#purchaseDesc").value="";
  fillPurchaseCategoryOptions(prefillCategory||Object.keys(state.budget)[0]);
  $("#purchaseDate").value=selectedMonthDate();
  openSheet("purchaseSheet");
  setTimeout(()=>$("#purchaseAmount").focus(),220);
}
function openEditPurchase(id){
  const purchase=state.purchases.find(p=>p.id===id);
  if(!purchase)return;
  $("#purchaseId").value=purchase.id;
  $("#purchaseSheetTitle").textContent="Ändra köp";
  $("#purchaseAmount").value=purchase.amount;
  $("#purchaseDesc").value=purchase.description;
  fillPurchaseCategoryOptions(purchase.category);
  $("#purchaseDate").value=purchase.date;
  openSheet("purchaseSheet");
}
function openCategory(category){
  state.activeCategory=category;
  $("#categoryTitle").textContent=category;
  const budget=Number(state.budget[category]||0);
  const spent=spentInCategory(category);
  $("#categoryBudget").textContent=fmt(budget);
  $("#categorySpent").textContent=fmt(spent);
  $("#categoryLeft").textContent=fmt(budget-spent);

  const rows=categoryPurchases(category);
  $("#categoryPurchaseList").innerHTML=rows.length?rows.map(p=>`
    <div class="item">
      <div>
        <strong>${p.description}</strong><br>
        <small>${p.date}</small>
      </div>
      <div style="text-align:right">
        <strong>${fmt(p.amount)}</strong>
        <div class="actions">
          <button data-edit-purchase="${p.id}">Ändra</button>
          <button class="delete" data-delete-purchase="${p.id}">Ta bort</button>
        </div>
      </div>
    </div>`).join(""):'<div class="empty">Inga köp i kategorin ännu.</div>';
  openSheet("categorySheet");
}
function openNewSalary(){
  $("#salaryId").value="";
  $("#salarySheetTitle").textContent="Lägg till lön";
  $("#salaryAmount").value="";
  $("#salaryMonth").value=state.month;
  openSheet("salarySheet");
}
function openEditSalary(id){
  const salary=state.salaries.find(s=>s.id===id);
  if(!salary)return;
  $("#salaryId").value=salary.id;
  $("#salarySheetTitle").textContent="Ändra lön";
  $("#salaryAmount").value=salary.amount;
  $("#salaryMonth").value=salary.month;
  openSheet("salarySheet");
}
function exportCsv(){
  const rows=[["Datum","Beskrivning","Kategori","Belopp"],...state.purchases.map(p=>[p.date,p.description,p.category,p.amount])];
  const csv=rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(";")).join("\n");
  const link=document.createElement("a");
  link.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));
  link.download="dilara-kop.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

$("#quickSave").addEventListener("click",()=>{
  const amount=Number($("#quickAmount").value);
  const description=$("#quickDesc").value.trim();
  const category=$(".chip.active")?.dataset.chip;
  if(!amount||!description||!category){
    toast("Fyll i belopp, beskrivning och kategori");
    return;
  }
  state.purchases.push({
    id:uid(),
    amount,
    description,
    category,
    date:selectedMonthDate()
  });
  $("#quickAmount").value="";
  $("#quickDesc").value="";
  render();
  toast(`Köpet sparades i ${label(state.month)}`);
});

$("#categoryChips").addEventListener("click",event=>{
  const category=event.target.dataset.chip;
  if(category)setActiveChip(category);
});
$("#budgetList").addEventListener("click",event=>{
  const row=event.target.closest("[data-category]");
  if(row)openCategory(row.dataset.category);
});
$("#fab").addEventListener("click",()=>openNewPurchase());
$("#addPurchaseForCategory").addEventListener("click",()=>{
  const category=state.activeCategory;
  closeSheets();
  setTimeout(()=>openNewPurchase(category),80);
});
$("#purchaseForm").addEventListener("submit",event=>{
  event.preventDefault();
  const id=$("#purchaseId").value;
  const data={
    id:id||uid(),
    amount:Number($("#purchaseAmount").value),
    description:$("#purchaseDesc").value.trim(),
    category:$("#purchaseCategory").value,
    date:$("#purchaseDate").value
  };
  if(id)state.purchases=state.purchases.map(p=>p.id===id?data:p);
  else state.purchases.push(data);
  closeSheets();
  render();
  toast(id?"Köpet är ändrat":"Köpet är sparat");
});
function handlePurchaseActions(event){
  const editId=event.target.dataset.editPurchase;
  const deleteId=event.target.dataset.deletePurchase;
  if(editId){
    closeSheets();
    setTimeout(()=>openEditPurchase(editId),80);
  }
  if(deleteId&&confirm("Ta bort köpet?")){
    state.purchases=state.purchases.filter(p=>p.id!==deleteId);
    render();
    if(state.activeCategory)openCategory(state.activeCategory);
  }
}
$("#purchaseList").addEventListener("click",handlePurchaseActions);
$("#categoryPurchaseList").addEventListener("click",handlePurchaseActions);

$("#addSalaryBtn").addEventListener("click",openNewSalary);
$("#salaryForm").addEventListener("submit",event=>{
  event.preventDefault();
  const id=$("#salaryId").value;
  const data={
    id:id||uid(),
    amount:Number($("#salaryAmount").value),
    month:$("#salaryMonth").value
  };
  if(id)state.salaries=state.salaries.map(s=>s.id===id?data:s);
  else state.salaries.push(data);
  closeSheets();
  render();
  toast(id?"Lönen är ändrad":"Lönen är sparad");
});
$("#salaryList").addEventListener("click",event=>{
  const editId=event.target.dataset.editSalary;
  const deleteId=event.target.dataset.deleteSalary;
  if(editId)openEditSalary(editId);
  if(deleteId&&confirm("Ta bort lönen?")){
    state.salaries=state.salaries.filter(s=>s.id!==deleteId);
    render();
  }
});

$("#editBudgetBtn").addEventListener("click",()=>{
  $("#budgetInputs").innerHTML=Object.entries(state.budget).map(([category,value])=>`
    <label class="budget-input">
      <span>${category}</span>
      <input data-budget="${category}" type="number" min="0" step="1" value="${value}">
    </label>`).join("");
  openSheet("budgetSheet");
});
$("#budgetForm").addEventListener("submit",event=>{
  event.preventDefault();
  $$("[data-budget]").forEach(input=>state.budget[input.dataset.budget]=Number(input.value));
  closeSheets();
  render();
  toast("Budgeten är uppdaterad");
});

$("#settingsBtn").addEventListener("click",()=>{
  $("#csnInput").value=state.csn;
  openSheet("settingsSheet");
});
$("#saveSettingsBtn").addEventListener("click",()=>{
  state.csn=Number($("#csnInput").value)||13500;
  closeSheets();
  render();
  toast("Inställningarna är sparade");
});
$("#backupBtn").addEventListener("click",()=>{
  const backup={
    version:3,
    exportedAt:new Date().toISOString(),
    month:state.month,
    budget:state.budget,
    purchases:state.purchases,
    salaries:state.salaries,
    csn:state.csn
  };
  const link=document.createElement("a");
  link.href=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}));
  link.download="dilara-finance-backup.json";
  link.click();
  URL.revokeObjectURL(link.href);
});
$("#importFile").addEventListener("change",async event=>{
  try{
    const file=event.target.files[0];
    if(!file)return;
    const backup=JSON.parse(await file.text());
    if(!backup.budget||!Array.isArray(backup.purchases)||!Array.isArray(backup.salaries))throw new Error("Ogiltig fil");
    state.month=backup.month||state.month;
    state.budget=backup.budget;
    state.purchases=backup.purchases;
    state.salaries=backup.salaries;
    state.csn=Number(backup.csn)||13500;
    closeSheets();
    render();
    toast("Säkerhetskopian är importerad");
  }catch(error){
    toast("Filen kunde inte läsas");
  }
});
$("#resetBtn").addEventListener("click",()=>{
  if(confirm("Rensa alla köp, löner och ändringar?")){
    localStorage.clear();
    location.reload();
  }
});

$("#prevMonth").addEventListener("click",()=>{
  const index=MONTHS.indexOf(state.month);
  state.month=MONTHS[Math.max(0,index-1)];
  render();
});
$("#nextMonth").addEventListener("click",()=>{
  const index=MONTHS.indexOf(state.month);
  state.month=MONTHS[Math.min(MONTHS.length-1,index+1)];
  render();
});
$("#exportBtn").addEventListener("click",exportCsv);

$("#backdrop").addEventListener("click",closeSheets);
$$(".close-sheet").forEach(button=>button.addEventListener("click",closeSheets));
$$("[data-jump]").forEach(button=>button.addEventListener("click",()=>{
  $(button.dataset.jump).scrollIntoView({behavior:"smooth"});
}));

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
render();
