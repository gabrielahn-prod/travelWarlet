const STORAGE_KEY = "travel-wallet-demo-v2";
const API_ENDPOINT = "/api/state";

const denominations = [
  { value: 500000, label: "50만동" },
  { value: 200000, label: "20만동" },
  { value: 100000, label: "10만동" },
  { value: 50000, label: "5만동" },
  { value: 20000, label: "2만동" },
  { value: 10000, label: "1만동" },
  { value: 5000, label: "5천동" },
  { value: 2000, label: "2천동" },
  { value: 1000, label: "1천동" },
  { value: 500, label: "500동" },
];

const demoState = {
  wallet: Object.fromEntries(denominations.map(({ value }) => [value, 0])),
  expenses: [
    { id: makeId(), title: "반미 아침", amount: 35000, date: todayISO(), memo: "호텔 근처" },
    { id: makeId(), title: "Grab 이동", amount: 52000, date: todayISO(), memo: "공항에서 시내" },
    { id: makeId(), title: "커피", amount: 28000, date: yesterdayISO(), memo: "테이크아웃" },
  ],
};

const els = {
  walletTotal: document.getElementById("walletTotal"),
  walletTotalLarge: document.getElementById("walletTotalLarge"),
  todaySpend: document.getElementById("todaySpend"),
  allSpend: document.getElementById("allSpend"),
  denominationGrid: document.getElementById("denominationGrid"),
  walletBreakdown: document.getElementById("walletBreakdown"),
  expenseForm: document.getElementById("expenseForm"),
  expenseTitle: document.getElementById("expenseTitle"),
  expenseAmount: document.getElementById("expenseAmount"),
  expenseDate: document.getElementById("expenseDate"),
  expenseMemo: document.getElementById("expenseMemo"),
  quickButtons: document.querySelectorAll("[data-quick-amount]"),
  expenseGroups: document.getElementById("expenseGroups"),
  pageTabs: document.querySelectorAll(".nav-tab"),
  pages: document.querySelectorAll(".page"),
  resetDemoBtn: document.getElementById("resetDemoBtn"),
};

let state = cloneState(demoState);
let syncTimer = null;
let apiAvailable = true;

function todayISO() {
  return localISODate(0);
}

function yesterdayISO() {
  return localISODate(-1);
}

function makeId() {
  if (globalThis.crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneState(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function localISODate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function money(value) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value)) + "동";
}

function loadFallbackState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return cloneState(demoState);
    }

    const parsed = JSON.parse(raw);
    return {
      wallet: { ...demoState.wallet, ...(parsed.wallet ?? {}) },
      expenses:
        Array.isArray(parsed.expenses) && parsed.expenses.length
          ? parsed.expenses
          : cloneState(demoState.expenses),
    };
  } catch {
    return cloneState(demoState);
  }
}

function saveFallbackState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

async function loadState() {
  try {
    const response = await fetch(API_ENDPOINT, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`API unavailable: ${response.status}`);
    }

    const data = await response.json();
    apiAvailable = true;
    return {
      wallet: { ...demoState.wallet, ...(data.wallet ?? {}) },
      expenses: Array.isArray(data.expenses) ? data.expenses : cloneState(demoState.expenses),
    };
  } catch {
    apiAvailable = false;
    return loadFallbackState();
  }
}

async function saveState(nextState) {
  if (!apiAvailable) {
    saveFallbackState(nextState);
    return;
  }

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextState),
    });

    if (!response.ok) {
      throw new Error(`Save failed: ${response.status}`);
    }

    const data = await response.json();
    state = {
      wallet: { ...demoState.wallet, ...(data.wallet ?? nextState.wallet) },
      expenses: Array.isArray(data.expenses) ? data.expenses : nextState.expenses,
    };
  } catch {
    apiAvailable = false;
    saveFallbackState(nextState);
  }
}

function scheduleSave() {
  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(() => {
    void saveState(state);
  }, 180);
}

function walletTotal() {
  return denominations.reduce((sum, { value }) => sum + value * (state.wallet[value] ?? 0), 0);
}

function expenseTotal() {
  return state.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
}

function expenseTotalForDate(date) {
  return state.expenses
    .filter((expense) => expense.date === date)
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
}

function renderWallet() {
  const total = walletTotal();
  els.walletTotal.textContent = money(total);
  els.walletTotalLarge.textContent = money(total);

  els.denominationGrid.innerHTML = "";
  const template = document.getElementById("denominationTemplate");

  denominations.forEach(({ value, label }) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".denomination-card");
    const valueLabel = node.querySelector(".denomination-value");
    const countLabel = node.querySelector(".denomination-count");
    const minus = node.querySelector('[data-action="minus"]');
    const plus = node.querySelector('[data-action="plus"]');

    valueLabel.textContent = label;
    countLabel.textContent = state.wallet[value] ?? 0;

    minus.addEventListener("click", () => {
      state.wallet[value] = Math.max(0, (state.wallet[value] ?? 0) - 1);
      renderAll();
      scheduleSave();
    });

    plus.addEventListener("click", () => {
      state.wallet[value] = (state.wallet[value] ?? 0) + 1;
      renderAll();
      scheduleSave();
    });

    card.dataset.denomination = String(value);
    els.denominationGrid.appendChild(node);
  });

  els.walletBreakdown.innerHTML = "";
  denominations
    .filter(({ value }) => (state.wallet[value] ?? 0) > 0)
    .forEach(({ value, label }) => {
      const row = document.createElement("div");
      row.className = "summary-row";
      row.innerHTML = `
        <div>
          <strong>${label}</strong>
          <span>${state.wallet[value]}장</span>
        </div>
        <strong>${money(value * state.wallet[value])}</strong>
      `;
      els.walletBreakdown.appendChild(row);
    });

  if (!els.walletBreakdown.childElementCount) {
    const empty = document.createElement("div");
    empty.className = "summary-row";
    empty.innerHTML = "<span>아직 넣은 지폐가 없습니다.</span><strong>0 ₫</strong>";
    els.walletBreakdown.appendChild(empty);
  }
}

function renderExpenses() {
  const allTotal = expenseTotal();
  const today = todayISO();
  els.todaySpend.textContent = money(expenseTotalForDate(today));
  els.allSpend.textContent = money(allTotal);

  const grouped = state.expenses.reduce((acc, expense) => {
    if (!acc[expense.date]) acc[expense.date] = [];
    acc[expense.date].push(expense);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  els.expenseGroups.innerHTML = "";
  const groupTemplate = document.getElementById("expenseGroupTemplate");
  const itemTemplate = document.getElementById("expenseItemTemplate");

  dates.forEach((date) => {
    const node = groupTemplate.content.cloneNode(true);
    const headDate = node.querySelector(".expense-date");
    const total = node.querySelector(".expense-day-total");
    const count = node.querySelector(".expense-count");
    const list = node.querySelector(".expense-list");

    headDate.textContent = formatDate(date);
    total.textContent = money(expenseTotalForDate(date));
    count.textContent = `${grouped[date].length}건`;

    grouped[date].forEach((expense) => {
      const expenseNode = itemTemplate.content.cloneNode(true);
      expenseNode.querySelector(".expense-title").textContent = expense.title;
      expenseNode.querySelector(".expense-memo").textContent = expense.memo || "메모 없음";
      expenseNode.querySelector(".expense-amount").textContent = money(expense.amount);
      expenseNode.querySelector(".remove-button").addEventListener("click", () => {
        state.expenses = state.expenses.filter((item) => item.id !== expense.id);
        renderAll();
        scheduleSave();
      });
      list.appendChild(expenseNode);
    });

    els.expenseGroups.appendChild(node);
  });

  if (!dates.length) {
    const empty = document.createElement("article");
    empty.className = "expense-group";
    empty.innerHTML = "<p class='expense-date'>지출 없음</p><strong>첫 지출을 입력해 보세요.</strong>";
    els.expenseGroups.appendChild(empty);
  }
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function renderAll() {
  renderWallet();
  renderExpenses();
}

function switchPage(pageId) {
  els.pages.forEach((page) => page.classList.toggle("is-active", page.id === pageId));
  els.pageTabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.page === pageId));
  const nextHash = pageId === "expensePage" ? "#expense" : "#wallet";
  if (location.hash !== nextHash) {
    location.hash = nextHash;
  }
}

function bootstrapNavigation() {
  const target = location.hash === "#expense" ? "expensePage" : "walletPage";
  switchPage(target);

  els.pageTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchPage(tab.dataset.page));
  });

  window.addEventListener("hashchange", () => {
    const page = location.hash === "#expense" ? "expensePage" : "walletPage";
    switchPage(page);
  });
}

function bootstrapForm() {
  els.expenseDate.value = todayISO();

  els.quickButtons.forEach((button) => {
    button.addEventListener("click", () => {
      els.expenseAmount.value = button.dataset.quickAmount;
      els.expenseAmount.focus();
    });
  });

  els.expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = els.expenseTitle.value.trim();
    const amount = Math.floor(Number(els.expenseAmount.value));
    const date = els.expenseDate.value;
    const memo = els.expenseMemo.value.trim();

    if (!title || !Number.isFinite(amount) || amount <= 0 || !date) {
      return;
    }

    state.expenses.unshift({
      id: makeId(),
      title,
      amount,
      date,
      memo,
    });

    els.expenseForm.reset();
    els.expenseDate.value = date;
    renderAll();
    scheduleSave();
    switchPage("expensePage");
  });
}

function bootstrapReset() {
  els.resetDemoBtn.addEventListener("click", () => {
    state = cloneState(demoState);
    els.expenseForm.reset();
    els.expenseDate.value = todayISO();
    renderAll();
    scheduleSave();
  });
}

async function bootstrap() {
  bootstrapNavigation();
  bootstrapForm();
  bootstrapReset();
  state = await loadState();
  renderAll();
}

await bootstrap();
