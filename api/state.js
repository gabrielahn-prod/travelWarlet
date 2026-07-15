const { getAdminClient } = require("./_supabase");

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function sanitizeWallet(wallet) {
  const denominations = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000, 500];
  return denominations.reduce((acc, denomination) => {
    const count = Number(wallet?.[denomination] ?? 0);
    acc[denomination] = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
    return acc;
  }, {});
}

function sanitizeExpenses(expenses) {
  if (!Array.isArray(expenses)) return [];

  return expenses
    .map((expense) => {
      const title = String(expense?.title ?? "").trim().slice(0, 80);
      const amount = Math.max(0, Math.floor(Number(expense?.amount ?? 0)));
      const date = String(expense?.date ?? "");
      const memo = String(expense?.memo ?? "").trim().slice(0, 140);
      const id = typeof expense?.id === "string" && expense.id ? expense.id : null;

      if (!title || !amount || !isIsoDate(date)) {
        return null;
      }

      return {
        id,
        title,
        amount,
        date,
        memo,
      };
    })
    .filter(Boolean);
}

async function readState(client) {
  const [walletResult, expenseResult] = await Promise.all([
    client.from("wallet_denominations").select("denomination,count"),
    client.from("expenses").select("id,title,amount,expense_date,memo,created_at").order("expense_date", {
      ascending: false,
    }).order("created_at", { ascending: false }),
  ]);

  if (walletResult.error) throw walletResult.error;
  if (expenseResult.error) throw expenseResult.error;

  const wallet = {
    500000: 0,
    200000: 0,
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0,
  };

  for (const row of walletResult.data ?? []) {
    if (Object.prototype.hasOwnProperty.call(wallet, row.denomination)) {
      wallet[row.denomination] = Math.max(0, Math.floor(Number(row.count ?? 0)));
    }
  }

  const expenses = (expenseResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    amount: row.amount,
    date: row.expense_date,
    memo: row.memo ?? "",
  }));

  return { wallet, expenses };
}

async function writeState(client, payload) {
  const wallet = sanitizeWallet(payload?.wallet);
  const expenses = sanitizeExpenses(payload?.expenses);

  const walletRows = Object.entries(wallet)
    .filter(([, count]) => count > 0)
    .map(([denomination, count]) => ({
      denomination: Number(denomination),
      count,
    }));

  const clearWallet = await client.from("wallet_denominations").delete();
  if (clearWallet.error) throw clearWallet.error;

  const clearExpenses = await client.from("expenses").delete();
  if (clearExpenses.error) throw clearExpenses.error;

  if (walletRows.length) {
    const insertWallet = await client.from("wallet_denominations").insert(walletRows);
    if (insertWallet.error) throw insertWallet.error;
  }

  if (expenses.length) {
    const insertExpenses = await client.from("expenses").insert(
      expenses.map((expense) => ({
        id: expense.id || undefined,
        title: expense.title,
        amount: expense.amount,
        expense_date: expense.date,
        memo: expense.memo || null,
      })),
    );
    if (insertExpenses.error) throw insertExpenses.error;
  }

  return { wallet, expenses };
}

module.exports = async (req, res) => {
  try {
    const client = getAdminClient();

    if (req.method === "GET") {
      const state = await readState(client);
      return json(res, 200, state);
    }

    if (req.method === "PUT") {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString("utf8") || "{}";
      const body = JSON.parse(rawBody);
      const state = await writeState(client, body);
      return json(res, 200, state);
    }

    res.setHeader("Allow", "GET, PUT");
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return json(res, 500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
