function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch(e){
    return fallback;
  }
}
function saveJSON(key, value){
  try{
    localStorage.setItem(key, JSON.stringify(value));
  }catch(e){}
}

// splash
function initSplash(){
  const splash = document.getElementById("xmas-splash");
  if(!splash) return;
  const KEY = "xmas_splash_2025_seen";
  try{
    if(localStorage.getItem(KEY) === "yes"){
      splash.remove();
      return;
    }
  }catch(e){}
  const btn = splash.querySelector("[data-splash-enter]");
  if(btn){
    btn.addEventListener("click", () => {
      try{ localStorage.setItem(KEY, "yes"); }catch(e){}
      splash.classList.add("splash-hide");
      setTimeout(() => splash.remove(), 260);
    });
  }
}

// password gate
function gateInit(id, pass, storeKey){
  const gate = document.getElementById(id);
  if(!gate) return;
  try{
    if(localStorage.getItem(storeKey) === "ok"){
      gate.remove();
      return;
    }
  }catch(e){}
  const input = gate.querySelector('input[type="password"]');
  const btn = gate.querySelector("[data-gate-submit]");
  const msg = gate.querySelector("[data-gate-msg]");
  function fail(){
    if(msg) msg.textContent = "Incorrect password.";
    if(input){
      input.value = "";
      input.focus();
    }
  }
  btn && btn.addEventListener("click", () => {
    const v = (input && input.value || "").trim();
    if(!v) return fail();
    if(v === pass){
      try{ localStorage.setItem(storeKey, "ok"); }catch(e){}
      gate.classList.add("gate-hide");
      setTimeout(() => gate.remove(), 260);
    }else{
      fail();
    }
  });
  input && input.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      e.preventDefault();
      btn && btn.click();
    }
  });
}

// inventories
function initInventories(){
  const forms = document.querySelectorAll("form[data-inventory]");
  forms.forEach(form => {
    const key = form.getAttribute("data-storage-key");
    const name = form.getAttribute("data-inventory");
    if(!key || !name) return;
    const listEl = document.querySelector('[data-list="' + name + '"]');
    const emptyEl = document.querySelector('[data-empty="' + name + '"]');
    function render(){
      const items = loadJSON(key, []);
      if(!listEl) return;
      listEl.innerHTML = "";
      if(!items.length){
        if(emptyEl) emptyEl.style.display = "block";
        return;
      }
      if(emptyEl) emptyEl.style.display = "none";
      items.forEach((item, idx) => {
        const row = document.createElement("div");
        row.className = "item";
        const main = document.createElement("div");
        main.className = "item-main";
        const title = document.createElement("strong");
        title.textContent = item.title || item.name || "Item";
        main.appendChild(title);
        const meta = document.createElement("div");
        meta.className = "item-meta";
        const bits = [];
        if(item.author) bits.push(item.author);
        if(item.pattern) bits.push(item.pattern);
        if(item.status) bits.push(item.status);
        if(item.tag) bits.push(item.tag);
        if(item.pairs) bits.push(String(item.pairs) + " pairs");
        meta.textContent = bits.join(" · ");
        main.appendChild(meta);
        if(item.notes){
          const notes = document.createElement("div");
          notes.className = "item-notes";
          notes.textContent = item.notes;
          main.appendChild(notes);
        }
        const actions = document.createElement("div");
        actions.className = "item-actions";
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn";
        b.textContent = "Remove";
        b.addEventListener("click", () => {
          const arr = loadJSON(key, []);
          arr.splice(idx, 1);
          saveJSON(key, arr);
          render();
        });
        actions.appendChild(b);
        row.appendChild(main);
        row.appendChild(actions);
        listEl.appendChild(row);
      });
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const obj = {};
      fd.forEach((v,k) => { obj[k] = v; });
      obj.id = Date.now();
      const arr = loadJSON(key, []);
      arr.unshift(obj);
      saveJSON(key, arr);
      form.reset();
      render();
    });
    render();
  });
}

// memory game
function initMemoryGame(){
  const grid = document.getElementById("mg-grid");
  if(!grid) return;
  const sizeSel = document.getElementById("mg-size");
  const newBtn = document.getElementById("mg-new");
  const movesEl = document.getElementById("mg-moves");
  const matchesEl = document.getElementById("mg-matches");
  const timeEl = document.getElementById("mg-time");

  const icons = ["🧱","🤖","⚡","🧪","🥋","🧠","🪐","🚀","🧲","🧬","🎮","🦔","💡","🔭","🧩","⭐","🌟","💥","🧊","🎯"];

  let state = {
    deck: [],
    openIndexes: [],
    matched: [],
    moves: 0,
    matches: 0,
    startedAt: 0,
    timer: null
  };

  function stopTimer(){
    if(state.timer){
      clearInterval(state.timer);
      state.timer = null;
    }
  }
  function updateTime(){
    if(!state.startedAt){
      timeEl.textContent = "0s";
      return;
    }
    const sec = Math.floor((Date.now() - state.startedAt)/1000);
    timeEl.textContent = sec + "s";
  }

  function build(){
    stopTimer();
    state.openIndexes = [];
    state.matched = [];
    state.moves = 0;
    state.matches = 0;
    state.startedAt = 0;
    movesEl.textContent = "0";
    matchesEl.textContent = "0";
    timeEl.textContent = "0s";

    const cols = 4;
    const rows = parseInt(sizeSel.value || "4", 10);
    const total = cols * rows;
    const pairs = total / 2;
    const iconsPool = icons.slice(0, pairs);
    let deck = [];
    iconsPool.forEach(ic => {
      deck.push(ic, ic);
    });
    deck.sort(() => Math.random() - 0.5);
    state.deck = deck;

    grid.innerHTML = "";
    grid.style.gridTemplateColumns = "repeat(" + cols + ", minmax(0,1fr))";

    deck.forEach((ic, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mg-card";
      btn.setAttribute("data-idx", String(idx));
      btn.textContent = "";
      btn.addEventListener("click", () => flip(idx));
      grid.appendChild(btn);
    });
  }

  function flip(idx){
    if(state.matched.includes(idx)) return;
    if(state.openIndexes.includes(idx)) return;
    const cards = grid.querySelectorAll(".mg-card");
    const card = cards[idx];
    if(!card) return;

    if(!state.startedAt){
      state.startedAt = Date.now();
      state.timer = setInterval(updateTime, 400);
    }

    if(state.openIndexes.length === 2) return;

    state.openIndexes.push(idx);
    card.classList.add("open");
    card.textContent = state.deck[idx];

    if(state.openIndexes.length === 2){
      state.moves += 1;
      movesEl.textContent = String(state.moves);
      const [a,b] = state.openIndexes;
      if(state.deck[a] === state.deck[b]){
        state.matched.push(a,b);
        state.matches += 1;
        matchesEl.textContent = String(state.matches);
        cards[a].classList.add("matched");
        cards[b].classList.add("matched");
        state.openIndexes = [];
        if(state.matched.length === state.deck.length){
          stopTimer();
        }
      }else{
        setTimeout(() => {
          state.openIndexes.forEach(i => {
            const c = cards[i];
            if(c && !state.matched.includes(i)){
              c.classList.remove("open");
              c.textContent = "";
            }
          });
          state.openIndexes = [];
        }, 650);
      }
    }
  }

  newBtn && newBtn.addEventListener("click", build);
  sizeSel && sizeSel.addEventListener("change", build);

  build();
}

document.addEventListener("DOMContentLoaded", () => {
  initSplash();
  gateInit("gate-emerson","Emme1208","gate_emerson");
  gateInit("gate-kai","Kai0923","gate_kai");
  initInventories();
  initMemoryGame();
});
