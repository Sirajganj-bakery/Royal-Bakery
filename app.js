// Royal Bakery – Standalone (no frameworks)
const MATERIALS=[
  {key:"flour",label:"Flour (kg)",threshold:5},
  {key:"sugar",label:"Sugar (kg)",threshold:5},
  {key:"oil",label:"Oil (kg)",threshold:3},
  {key:"eggs",label:"Eggs (pcs)",threshold:24},
  {key:"bakingPowder",label:"Baking Powder (g)",threshold:200},
  {key:"vanilla",label:"Vanilla (ml)",threshold:50},
  {key:"milk",label:"Milk (L)",threshold:2},
  {key:"water",label:"Water (L)",threshold:5},
  {key:"glucose",label:"Glucose (kg)",threshold:1},
];
const PRODUCTS=["Cake","Biscuit"];
const LS={stock:"rb_stock",sales:"rb_sales",expenses:"rb_expenses"};
function readLS(k,f){try{const x=localStorage.getItem(k);return x?JSON.parse(x):f}catch{return f}}
function writeLS(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function fmt(n){return "৳ "+(n||0).toFixed(2)}
function el(h){const t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstElementChild}
function today(){return new Date().toISOString().slice(0,10)}

const state={
  tab:"Dashboard",
  stock:readLS(LS.stock,MATERIALS.reduce((a,m)=>(a[m.key]=0,a),{})),
  sales:readLS(LS.sales,[]),
  expenses:readLS(LS.expenses,[])
};
function save(){writeLS(LS.stock,state.stock);writeLS(LS.sales,state.sales);writeLS(LS.expenses,state.expenses)}

function totals(){const revenue=state.sales.reduce((s,r)=>s+r.qty*r.unitPrice,0);const expense=state.expenses.reduce((s,e)=>s+e.amount,0);return{revenue,expense,profit:revenue-expense}}
function bestSeller(){const map=new Map();state.sales.forEach(s=>map.set(s.product,(map.get(s.product)||0)+s.qty));let top=null;for(const [p,q]of map.entries()){if(!top||q>top.qty)top={product:p,qty:q}}return top}
function lowStock(){return MATERIALS.filter(m=>(state.stock[m.key]??0)<=m.threshold)}
function aiTips(){const tips=[],top=bestSeller(),low=lowStock(),t=totals();if(top)tips.push(`Consider increasing production for ${top.product} (demand: ${top.qty}).`);else tips.push("Log a few sales to unlock demand insights.");if(low.length)tips.push(`Low stock detected: ${low.map(m=>m.label.split(' ')[0]).join(', ')}. Reorder soon.`);if(t.expense>0&&t.revenue===0)tips.push("Expenses recorded without sales. Add sales or review cost controls.");if(t.revenue>0&&t.profit/Math.max(1,t.revenue)<0.1)tips.push("Profit margin under 10%. Review pricing or reduce costs.");return tips}

const content=document.getElementById("content");
document.getElementById("nav").addEventListener("click",e=>{
  if(e.target.matches("button[data-tab]")){
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    e.target.classList.add("active");
    state.tab=e.target.dataset.tab;
    render();
  }
});

let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;const btn=document.getElementById("installBtn");btn.style.display="inline-flex";btn.onclick=async()=>{btn.style.display="none";deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;}});

function card(inner,extra=""){return el(`<div class="card ${extra}">${inner}</div>`)}
function stat(label,value){return el(`<div class="card stat"><div class="badge">📊</div><div><div class="muted">${label}</div><div class="value">${value}</div></div></div>`)}

function renderDashboard(){
  const t=totals(),lows=lowStock(),tips=aiTips();const wrap=el(`<div class="grid"></div>`);
  if(lows.length){wrap.append(card(`<div class="flex"><div class="badge-warn">⚠️ <b>AI Alerts</b></div></div><ul style="margin:8px 0 0 18px">${tips.map(x=>`<li>${x}</li>`).join("")}</ul>`))}
  const stats=el(`<div class="grid grid-3"></div>`);stats.append(stat("Revenue",fmt(t.revenue)));stats.append(stat("Expense",fmt(t.expense)));stats.append(stat("Profit",fmt(t.profit)));wrap.append(stats);
  wrap.append(card(`<div class="muted">Quick tips</div><div style="margin-top:6px">• Add a few sales to see top-selling products.<br/>• Update stock levels to unlock low-stock warnings.</div>`));
  return wrap;
}

function renderSales(){
  const wrap=el(`<div class="grid"></div>`);
  const form=el(`<div class="card"><div class="value" style="font-size:14px">Add Sale</div><div class="row row-5" style="margin-top:8px">
    <input class="input" type="date" id="saleDate" value="${today()}"/><select class="input" id="saleProduct">${PRODUCTS.map(p=>`<option>${p}</option>`).join("")}</select>
    <input class="input" type="number" id="saleQty" placeholder="Qty" value="1"/><input class="input" type="number" id="salePrice" placeholder="Unit Price" value="0"/>
    <button class="btn primary" id="saleAdd">➕ Add</button></div></div>`);
  form.querySelector("#saleAdd").onclick=()=>{const date=form.querySelector("#saleDate").value;const product=form.querySelector("#saleProduct").value;const qty=Number(form.querySelector("#saleQty").value||0);const unitPrice=Number(form.querySelector("#salePrice").value||0);if(!qty||!unitPrice){alert("Please enter quantity and unit price.");return}state.sales=[{id:crypto.randomUUID(),date,product,qty,unitPrice},...state.sales];save();render()};
  wrap.append(form);
  const total=state.sales.reduce((s,r)=>s+r.qty*r.unitPrice,0);
  const table=el(`<div class="card"><div class="flex justify-between"><div class="value" style="font-size:14px">Recent Sales</div><div class="muted">Total: ${fmt(total)}</div></div>
    <div style="overflow:auto;margin-top:8px"><table class="table"><thead><tr class="muted"><th>Date</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th><th>Action</th></tr></thead>
    <tbody id="salesBody"></tbody></table></div></div>`);
  const tbody=table.querySelector("#salesBody");
  if(state.sales.length===0){tbody.append(el(`<tr><td colspan="6" class="center muted" style="padding:24px">No sales recorded yet.</td></tr>`))}
  else{state.sales.forEach(r=>{tbody.append(el(`<tr><td>${r.date}</td><td>${r.product}</td><td>${r.qty}</td><td>${fmt(r.unitPrice)}</td><td>${fmt(r.qty*r.unitPrice)}</td><td><button class="btn" data-del="${r.id}">🗑 Delete</button></td></tr>`))})}
  table.addEventListener("click",e=>{const id=e.target?.closest("button")?.dataset?.del;if(id){state.sales=state.sales.filter(x=>x.id!==id);save();render();}});
  wrap.append(table); return wrap;
}

function renderExpenses(){
  const wrap=el(`<div class="grid"></div>`);
  const form=el(`<div class="card"><div class="value" style="font-size:14px">Add Expense</div><div class="row row-5" style="margin-top:8px">
    <input class="input" type="date" id="expDate" value="${today()}"/><select class="input" id="expCat"><option>Raw Materials</option><option>Gas/Electricity</option><option>Salary</option><option>Rent</option><option>Transport</option><option>Other</option></select>
    <input class="input" type="number" id="expAmt" placeholder="Amount" value="0"/><input class="input" type="text" id="expNote" placeholder="Note (optional)"/><button class="btn primary" id="expAdd">➕ Add</button></div></div>`);
  form.querySelector("#expAdd").onclick=()=>{const date=form.querySelector("#expDate").value;const category=form.querySelector("#expCat").value;const amount=Number(form.querySelector("#expAmt").value||0);const note=form.querySelector("#expNote").value;if(!amount){alert("Please enter an amount.");return}state.expenses=[{id:crypto.randomUUID(),date,category,amount,note},...state.expenses];save();render()};
  wrap.append(form);
  const total=state.expenses.reduce((s,e)=>s+e.amount,0);
  const table=el(`<div class="card"><div class="flex justify-between"><div class="value" style="font-size:14px">Recent Expenses</div><div class="muted">Total: ${fmt(total)}</div></div>
    <div style="overflow:auto;margin-top:8px"><table class="table"><thead><tr class="muted"><th>Date</th><th>Category</th><th>Amount</th><th>Note</th><th>Action</th></tr></thead>
    <tbody id="expBody"></tbody></table></div></div>`);
  const tbody=table.querySelector("#expBody");
  if(state.expenses.length===0){tbody.append(el(`<tr><td colspan="5" class="center muted" style="padding:24px">No expenses recorded yet.</td></tr>`))}
  else{state.expenses.forEach(r=>{tbody.append(el(`<tr><td>${r.date}</td><td>${r.category}</td><td>${fmt(r.amount)}</td><td>${r.note||""}</td><td><button class="btn" data-del="${r.id}">🗑 Delete</button></td></tr>`))})}
  table.addEventListener("click",e=>{const id=e.target?.closest("button")?.dataset?.del;if(id){state.expenses=state.expenses.filter(x=>x.id!==id);save();render();}});
  wrap.append(table); return wrap;
}

function renderStock(){
  const wrap=el(`<div class="grid"></div>`);
  const low=lowStock(); if(low.length){wrap.append(card(`<div class="badge-warn">⚠️ Low Stock: ${low.map(m=>m.label.split(' ')[0]).join(', ')} — please reorder soon.</div>`))}
  const box=el(`<div class="card"><div class="value" style="font-size:14px">Update Stock</div><div class="grid" style="margin-top:8px;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px" id="stockGrid"></div></div>`);
  const grid=box.querySelector("#stockGrid");
  MATERIALS.forEach(m=>{
    grid.append(el(`<div class="flex" style="justify-content:space-between"><div>${m.label}</div>
      <div class="flex"><input class="input" style="width:100px" type="number" value="${state.stock[m.key]??0}" id="inp-${m.key}"/>
      <button class="btn primary" data-save="${m.key}">Save</button></div></div>`))
  });
  box.addEventListener("click",e=>{const key=e.target?.dataset?.save;if(key){const val=Number(box.querySelector(`#inp-${key}`).value||0);state.stock[key]=val;save();render();}});
  wrap.append(box); return wrap;
}

function renderReports(){
  const t=totals(); const byProduct=PRODUCTS.map(p=>{
    const qty=state.sales.filter(s=>s.product===p).reduce((n,s)=>n+s.qty,0);
    const rev=state.sales.filter(s=>s.product===p).reduce((n,s)=>n+s.qty*s.unitPrice,0);
    return {product:p,qty,revenue:rev};
  });
  const wrap=el(`<div class="grid"></div>`);
  const stats=el(`<div class="grid grid-3"></div>`);stats.append(stat("Revenue",fmt(t.revenue)));stats.append(stat("Expense",fmt(t.expense)));stats.append(stat("Profit",fmt(t.profit)));wrap.append(stats);
  const table=el(`<div class="card"><div class="flex justify-between"><div class="value" style="font-size:14px">Sales by Product</div><button class="btn" id="exportBtn">⬇️ Export JSON</button></div>
    <div style="overflow:auto;margin-top:8px"><table class="table"><thead><tr class="muted"><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead>
    <tbody>${byProduct.map(r=>`<tr><td>${r.product}</td><td>${r.qty}</td><td>${fmt(r.revenue)}</td></tr>`).join("")}</tbody></table></div></div>`);
  table.querySelector("#exportBtn").onclick=()=>{
    const payload={sales:state.sales,expenses:state.expenses,totals:t,exportedAt:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`royal-bakery-report-${today()}.json`; a.click(); URL.revokeObjectURL(url);
  };
  wrap.append(table);
  wrap.append(card(`<div class="value" style="font-size:14px">How to read this</div><ul style="margin-left:18px">
    <li>Profit = Revenue − Expense.</li><li>Use Stock tab to maintain ingredient levels and get low-stock alerts.</li><li>Export JSON to share raw data (you can convert to Excel/Google Sheets later).</li></ul>`));
  return wrap;
}

function renderSettings(){
  const wrap=el(`<div class="grid"></div>`);
  const box=card(`<div class="value" style="font-size:14px">Account & Data</div><div class="flex" style="margin-top:8px"><button class="btn" id="clear">🧹 Clear all local data</button></div>
    <p class="muted" style="margin-top:8px">This standalone app runs entirely on your device. Sign-in and cloud sync can be added in a hosted version.</p>`);
  box.querySelector("#clear").onclick=()=>{if(confirm("This will clear all local data. Continue?")){localStorage.clear();location.reload();}};
  const next=card(`<div class="value" style="font-size:14px">Next Up (when you want)</div><ul style="margin-left:18px"><li>Google Sign-In (real auth) & cloud backup</li><li>PDF reports and Google Sheets export</li><li>Smarter AI: demand forecasting, purchase recommendations</li></ul>`);
  wrap.append(box); wrap.append(next); return wrap;
}

function render(){
  content.innerHTML="";
  let view=null;
  switch(state.tab){
    case "Dashboard": view=renderDashboard(); break;
    case "Sales": view=renderSales(); break;
    case "Expenses": view=renderExpenses(); break;
    case "Stock": view=renderStock(); break;
    case "Reports": view=renderReports(); break;
    case "Settings": view=renderSettings(); break;
  }
  content.append(view);
}
render();
