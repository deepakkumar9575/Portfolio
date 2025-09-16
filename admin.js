// admin panel JS
let adminState = JSON.parse(localStorage.getItem('win365_state') || '{}');

function saveAdminState(){ localStorage.setItem('win365_state', JSON.stringify(adminState)); }

const loginArea = document.getElementById('login-area');
const panel = document.getElementById('panel');
const adminMsg = document.getElementById('admin-msg');
const adminLoginBtn = document.getElementById('admin-login');
const adminEmailInput = document.getElementById('admin-email'), adminPassInput = document.getElementById('admin-pass');

let currentAdmin = null;
let selectedUserEmail = null;

adminLoginBtn.onclick = ()=>{
  const email = adminEmailInput.value.trim().toLowerCase(), pass = adminPassInput.value;
  if(!adminState.users || !adminState.users[email]){ adminMsg.innerText = 'Invalid admin'; return; }
  const u = adminState.users[email];
  if(u.password !== pass || !u.isAdmin){ adminMsg.innerText = 'Invalid admin credentials'; return; }
  currentAdmin = email;
  loginArea.style.display = 'none';
  panel.style.display = 'block';
  renderAll();
};

function renderAll(){
  adminState = JSON.parse(localStorage.getItem('win365_state') || '{}');
  renderUsers();
  renderWithdraws();
  renderGlobalTrans();
}

function renderUsers(){
  const ul = document.getElementById('users-list');
  ul.innerHTML = '';
  for(const email in adminState.users){
    const u = adminState.users[email];
    const div = document.createElement('div');
    div.style.padding='8px';div.style.borderBottom='1px solid rgba(255,255,255,0.02)';
    div.innerHTML = `<strong>${u.email}</strong> — Coins: ${u.coins} ${u.isAdmin?'<em>(Admin)</em>':''}`;
    div.onclick = ()=> selectUser(u.email);
    ul.appendChild(div);
  }
}

function selectUser(email){
  selectedUserEmail = email;
  const u = adminState.users[email];
  document.getElementById('selected-user').innerHTML = `<div><strong>${u.email}</strong></div><div>Coins: ${u.coins}</div>
    <div style="margin-top:8px"><button onclick="creditUser()" class="btn">Credit 100</button>
    <button onclick="debitUser()" class="btn danger">Debit 100</button></div>
    <h5>Transactions</h5>
    <div style="max-height:200px;overflow:auto">${(u.transactions||[]).slice().reverse().map(t=>`<div>${t.time || ''} - ${t.type} - ${t.amount}</div>`).join('')}</div>`;
}

document.getElementById('admin-adjust').onclick = ()=>{
  const v = parseInt(document.getElementById('admin-adjust-amount').value);
  if(isNaN(v) || !selectedUserEmail){ alert('Select user and valid amount'); return; }
  adminState.users[selectedUserEmail].coins += v;
  if(!adminState.users[selectedUserEmail].transactions) adminState.users[selectedUserEmail].transactions = [];
  adminState.users[selectedUserEmail].transactions.push({ type:'admin_adjust', amount: v, time: new Date().toISOString() });
  saveAdminState();
  renderAll();
};

function creditUser(){ adminState.users[selectedUserEmail].coins += 100; saveAdminState(); renderAll(); }
function debitUser(){ adminState.users[selectedUserEmail].coins -= 100; saveAdminState(); renderAll(); }

function renderWithdraws(){
  const ul = document.getElementById('withdraw-list');
  ul.innerHTML = '';
  const g = adminState.globalWithdraws || [];
  if(g.length === 0) ul.innerHTML = '<div>No withdraws</div>';
  else g.forEach(r => {
    const d = document.createElement('div'); d.style.padding='8px'; d.style.borderBottom='1px solid rgba(255,255,255,0.02)';
    d.innerHTML = `<div><strong>${r.email}</strong> — ${r.upi} — ${r.phone} — ${r.status}</div>
      <div style="margin-top:6px"><button onclick='markDone(${r.id})' class="btn">Mark Processed</button></div>`;
    ul.appendChild(d);
  });
}

function markDone(id){
  adminState.globalWithdraws = (adminState.globalWithdraws || []).map(r => r.id === id ? {...r, status:'processed'} : r);
  saveAdminState(); renderAll();
}

function renderGlobalTrans(){
  const el = document.getElementById('global-trans');
  el.innerHTML = '';
  // show recent transactions across users
  const all = [];
  for(const e in adminState.users){
    const u = adminState.users[e];
    (u.transactions||[]).forEach(t => all.push({email:e, ...t}));
  }
  all.sort((a,b)=> (b.time||0) > (a.time||0) ? 1:-1);
  el.innerHTML = all.slice(0,50).map(t => `<div style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.02)">${t.time||''} — ${t.email} — ${t.type} — ${t.amount}</div>`).join('');
}

function logout(){ currentAdmin = null; panel.style.display='none'; loginArea.style.display='block'; }
function goHome(){ window.open('index.html','_self'); }
