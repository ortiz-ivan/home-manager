const API_BASE = "http://127.0.0.1:8000/api/inventory/";
const PRODUCTS_PATH = "products/";
const FIXED_EXPENSES_PATH = "fixed-expenses/";

async function request(path = "", options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = data?.detail || "No se pudo completar la operacion";
    throw new Error(detail);
  }

  return data;
}

export function listProducts() {
  return request(PRODUCTS_PATH);
}

export function createProduct(payload) {
  return request(PRODUCTS_PATH, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProduct(id, payload) {
  return request(`${PRODUCTS_PATH}${id}/`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id) {
  return request(`${PRODUCTS_PATH}${id}/`, {
    method: "DELETE",
  });
}

export function consumeProduct(id, quantity = 1) {
  return request(`${PRODUCTS_PATH}${id}/consume/`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });
}

export function buyProduct(id, quantity = 1) {
  return request(`${PRODUCTS_PATH}${id}/buy/`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });
}

export function markOutOfStock(id) {
  return request(`${PRODUCTS_PATH}${id}/out_of_stock/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function listFixedExpenses() {
  return request(FIXED_EXPENSES_PATH);
}

export function createFixedExpense(payload) {
  return request(FIXED_EXPENSES_PATH, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateFixedExpense(id, payload) {
  return request(`${FIXED_EXPENSES_PATH}${id}/`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function payFixedExpense(id, payload = {}) {
  return request(`${FIXED_EXPENSES_PATH}${id}/pay/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listIncomes() {
  return request("incomes/");
}

export function createIncome(payload) {
  return request("incomes/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteIncome(id, payload = {}) {
  return request(`incomes/${id}/`, {
    method: "DELETE",
    body: JSON.stringify(payload),
  });
}

export function updateIncome(id, payload) {
  return request(`incomes/${id}/`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function listVariableExpenses() {
  return request("variable-expenses/");
}

export function createVariableExpense(payload) {
  return request("variable-expenses/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteVariableExpense(id, payload = {}) {
  return request(`variable-expenses/${id}/`, {
    method: "DELETE",
    body: JSON.stringify(payload),
  });
}

export function updateVariableExpense(id, payload) {
  return request(`variable-expenses/${id}/`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getMonthlyFinanceSummary(month, year) {
  const query = new URLSearchParams();

  if (month) {
    query.set("month", String(month));
  }
  if (year) {
    query.set("year", String(year));
  }

  const suffix = query.toString() ? `monthly-finance-summary/?${query.toString()}` : "monthly-finance-summary/";
  return request(suffix);
}

export function listFinancialEvents(month, year, limit = 25) {
  const query = new URLSearchParams();

  if (month) {
    query.set("month", String(month));
  }
  if (year) {
    query.set("year", String(year));
  }
  if (limit) {
    query.set("limit", String(limit));
  }

  const suffix = query.toString() ? `financial-events/?${query.toString()}` : "financial-events/";
  return request(suffix);
}

export function listMonthlyCloses() {
  return request("monthly-closes/");
}

export function createMonthlyClose(payload) {
  return request("monthly-closes/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getInventorySettings() {
  return request("settings/");
}

export function updateInventorySettings(config) {
  return request("settings/", {
    method: "PUT",
    body: JSON.stringify({ config }),
  });
}
