// win365 - app.js (client-only demo)
// NOTE: This is a demo using localStorage. Not secure for production.

const MIN_BET = 10;
const ROUND_SECONDS = 30;
const COLORS = ['Red','Green','Blue'];

let state = {
  currentUser: null,
  users: {}, // email -> {email,password,coins,transactions:[],withdrawRequests:[]}
  pendingBets: [], // {id, userEmail, color, amount, round}
  history: [], // {round, resultColor, resolves: [{email,color,amount,win}]}
  roundNum: 1,
  timer: ROUND_SECONDS,
};

// --- localStorage helpers
function saveState(){
  localStorage.setItem('win365_state', JSON.stringify(state));
}
function loadState(){
  const raw = localStorage.getItem('win365_state');
  if(raw){
    try{ state = JSON.parse(raw); }catch(e){ console.error(e); }
  } else {
    // initialize admin user
    state.users['dp7814616@gmail.com'] = {
      email: 'dp7814616@gmail.com',
      password: 'adminpass123',
      coins: 0,
      transactions: [],
      isAdmin: true,
      withdrawRequests: []
    };
    saveState();
  }
}
loadState();

// --- UI elements
const pages = { home: document.getElementById('home'), auth: document.getElementById('auth'), game: document.getElementById('game') };
const btnHome = document.getElementById('btn-home'), btnLogin = document.getElementById('btn-login'), btnAdmin = document.getElementById('btn-admin');
const playNow = document.getElementById('play-now');

btnHome.onclick = ()=> showPage('home');
btnLogin.onclick = ()=> showPage('auth');
btnAdmin.onclick = ()=> window.open('admin.html','_self');
playNow.onclick = ()=> {
  if(!state.currentUser) showPage('auth');
  else showPage('game');
}

function showPage(p){
  for(const k of Object.keys(pages)) pages[k].classList.remove('active');
  pages[p].classList.add('active');
}

// --- Auth
const authTitle = document.getElementById('auth-title');
const emailInput = document.getElementById('email'), passInput = document.getElementById('password');
const btnAuth = document.getElementById('btn-auth'), switchAuth = document.getElementById('switch-auth'), authMsg = document.getElementById('auth-msg');
let authState = 'login';

switchAuth.onclick = ()=>{
  if(authState === 'login'){
    authState = 'signup';
    authTitle.innerText = 'Signup';
    btnAuth.innerText = 'Signup';
    switchAuth.innerText = 'Switch to Login';
  } else {
    authState = 'login';
    authTitle.innerText = 'Login';
    btnAuth.innerText = 'Login';
    switchAuth.innerText = 'Switch to Signup';
  }
};

btnAuth.onclick = ()=>{
  const email = emailInput.value.trim().toLowerCase();
  const pass = passInput.value;
  if(!email || !pass){ authMsg.innerText = 'Enter email and password'; return; }
  if(authState === 'signup'){
    if(state.users[email]){ authMsg.innerText = 'User already exists'; return; }
    // create user
    state.users[email] = { email, password: pass, coins: 100, transactions: [], withdrawRequests: [] };
    state.currentUser = email;
    saveState();
    authMsg.innerText = 'Signup successful!';
    renderPlayer();
    showPage('game');
  } else {
    const u = state.users[email];
    if(!u || u.password !== pass){ authMsg.innerText = 'Invalid credentials'; return; }
    state.currentUser = email;
    saveState();
    authMsg.innerText = 'Login successful!';
    renderPlayer();
    showPage('game');
  }
};

// --- Player UI render
function renderPlayer(){
  const emailEl = document.getElementById('player-email');
  const coinsEl = document.getElementById('player-coins');
  if(!state.currentUser){
    emailEl.innerText = 'Not logged in';
    coinsEl.innerText = '0';
  } else {
    const u = state.users[state.currentUser];
    emailEl.innerText = u.email + (u.isAdmin ? ' (Admin)' : '');
    coinsEl.innerText = u.coins;
  }
  renderPendingBets();
  renderHistory();
}
renderPlayer();

// --- Deposit links: (replace links or add UPI deep links)
document.getElementById('upi-gpay').href = "https://pay.google.com/"; // replace with upi deep link if you want
document.getElementById('upi-phonepe').href = "https://www.phonepe.com/";
document.getElementById('upi-paytm').href = "https://paytm.com/";

// --- Withdraw
const withdrawUpi = document.getElementById('withdraw-upi'), withdrawPhone = document.getElementById('withdraw-phone'), withdrawMsg = document.getElementById('withdraw-msg');
document.getElementById('btn-withdraw').onclick = ()=>{
  if(!state.currentUser){ withdrawMsg.innerText = 'Login first'; return; }
  const upi = withdrawUpi.value.trim(), phone = withdrawPhone.value.trim();
  if(!upi || !phone){ withdrawMsg.innerText = 'Provide UPI and phone'; return; }
  const u = state.users[state.currentUser];
  const req = { id: Date.now(), email: u.email, upi, phone, status: 'pending', time: new Date().toISOString() };
  if(!u.withdrawRequests) u.withdrawRequests = [];
  u.withdrawRequests.push(req);
  // Also add to a global place for admin convenience
  if(!state.globalWithdraws) state.globalWithdraws = [];
  state.globalWithdraws.push(req);
  saveState();
  withdrawMsg.innerText = 'Withdraw request sent to admin for manual processing.';
  withdrawUpi.value = withdrawPhone.value = '';
};

// --- Betting
const betAmount = document.getElementById('bet-amount'), btnPlaceBet = document.getElementById('btn-place-bet'), betMsg = document.getElementById('bet-msg');
btnPlaceBet.onclick = ()=>{
  if(!state.currentUser){ betMsg.innerText = 'Login first'; return; }
  const amt = parseInt(betAmount.value);
  if(isNaN(amt) || amt < MIN_BET){ betMsg.innerText = `Min bet ${MIN_BET}`; return; }
  const color = document.querySelector('input[name="color"]:checked').value;
  const user = state.users[state.currentUser];
  if(user.coins < amt){ betMsg.innerText = 'Not enough coins'; return; }
  // lock coins
  user.coins -= amt;
  const bet = { id: Date.now() + Math.random(), userEmail: user.email, color, amount: amt, round: state.roundNum };
  state.pendingBets.push(bet);
  if(!user.transactions) user.transactions = [];
  user.transactions.push({ type:'bet_placed', amount: -amt, color, round: state.roundNum, time: new Date().toISOString() });
  saveState();
  betMsg.innerText = 'Bet placed. Wait for round end.';
  betAmount.value = '';
  renderPlayer();
};

// render pending bets for current user
function renderPendingBets(){
  const ul = document.getElementById('pending-bets');
  ul.innerHTML = '';
  if(!state.currentUser) return;
  const list = state.pendingBets.filter(b => b.userEmail === state.currentUser);
  if(list.length === 0) ul.innerHTML = '<li>No pending bets</li>';
  else list.forEach(b => {
    const li = document.createElement('li');
    li.innerText = `Round ${b.round} — ${b.color} — ${b.amount} coins`;
    ul.appendChild(li);
  });
}

// render history (last 20)
function renderHistory(){
  const ul = document.getElementById('history-list');
  ul.innerHTML = '';
  state.history.slice().reverse().slice(0,20).forEach(h=>{
    const li = document.createElement('li');
    li.innerText = `R${h.round} → ${h.resultColor} — ${h.resolves.map(r => `${r.email} ${r.win?'WIN':'LOSE'} (${r.amount})`).join('; ')}`;
    ul.appendChild(li);
  });
}

// --- Round timer and resolution
const timerEl = document.getElementById('timer'), roundNumEl = document.getElementById('round-num'), lastResultEl = document.getElementById('last-result');

function tick(){
  state.timer--;
  if(state.timer <= 0){
    resolveRound();
    state.roundNum++;
    state.timer = ROUND_SECONDS;
  }
  timerEl.innerText = state.timer;
  roundNumEl.innerText = state.roundNum;
}
setInterval(tick, 1000);

// resolve round
function resolveRound(){
  const round = state.roundNum;
  const betsThisRound = state.pendingBets.filter(b => b.round === round);
  const resolves = [];
  // For each bet, determine win/lose with 20% win probability
  betsThisRound.forEach(b => {
    const user = state.users[b.userEmail];
    const win = Math.random() < 0.20; // 20% chance win
    let resultColor;
    if(win) resultColor = b.color;
    else {
      // pick any other color
      const others = COLORS.filter(c => c !== b.color);
      resultColor = others[Math.floor(Math.random()*others.length)];
    }
    if(win){
      const payout = b.amount * 2; // returns bet + profit same as bet
      user.coins += payout;
      user.transactions.push({ type:'win', amount: payout, round, color: b.color, time: new Date().toISOString() });
    } else {
      user.transactions.push({ type:'lose', amount: 0 - b.amount, round, color: b.color, time: new Date().toISOString() });
    }
    resolves.push({ email: b.userEmail, color: b.color, amount: b.amount, win });
  });

  // remove resolved bets
  state.pendingBets = state.pendingBets.filter(b => b.round !== round);
  // pick a displayed resultColor for round (if any bets exist pick one randomly from resolves wins or picks a color)
  let displayedColor = '-';
  if(resolves.length > 0){
    // If any win exists, show that color with priority else random pick
    const anyWin = resolves.find(r => r.win);
    if(anyWin) displayedColor = anyWin.color;
    else displayedColor = COLORS[Math.floor(Math.random()*COLORS.length)];
  } else {
    // no bets: random color
    displayedColor = COLORS[Math.floor(Math.random()*COLORS.length)];
  }

  state.history.push({ round, resultColor: displayedColor, resolves, time: new Date().toISOString() });
  saveState();
  // update UI
  lastResultEl.innerText = `${displayedColor} (R${round})`;
  renderPlayer();
  renderHistory();
}

// recover UI in case reload
timerEl.innerText = state.timer;
roundNumEl.innerText = state.roundNum;
renderPlayer();
renderHistory();
