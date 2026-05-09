function normalizeBaseUrl(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

const API_BASE = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/inventory/",
);
const PRODUCTS_PATH = "products/";
const FIXED_EXPENSES_PATH = "fixed-expenses/";
const RECURRING_TASKS_PATH = "recurring-tasks/";

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

export function listFixedExpenses(month, year) {
  const query = new URLSearchParams();

  if (month) {
    query.set("month", String(month));
  }
  if (year) {
    query.set("year", String(year));
  }

  const suffix = query.toString() ? `${FIXED_EXPENSES_PATH}?${query.toString()}` : FIXED_EXPENSES_PATH;
  return request(suffix);
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

export function listIncomes(month, year) {
  const query = new URLSearchParams();

  if (month) {
    query.set("month", String(month));
  }
  if (year) {
    query.set("year", String(year));
  }

  const suffix = query.toString() ? `incomes/?${query.toString()}` : "incomes/";
  return request(suffix);
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

export function listVariableExpenses(month, year) {
  const query = new URLSearchParams();

  if (month) {
    query.set("month", String(month));
  }
  if (year) {
    query.set("year", String(year));
  }

  const suffix = query.toString() ? `variable-expenses/?${query.toString()}` : "variable-expenses/";
  return request(suffix);
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

export function listRecurringTasks(filters = {}) {
  const query = new URLSearchParams();
  if (filters.category) {
    query.set("category", String(filters.category));
  }
  if (filters.area) {
    query.set("area", String(filters.area));
  }
  if (filters.priority) {
    query.set("priority", String(filters.priority));
  }

  const suffix = query.toString() ? `${RECURRING_TASKS_PATH}?${query.toString()}` : RECURRING_TASKS_PATH;
  return request(suffix);
}

export function createRecurringTask(payload) {
  return request(RECURRING_TASKS_PATH, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRecurringTask(id, payload) {
  return request(`${RECURRING_TASKS_PATH}${id}/`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteRecurringTask(id) {
  return request(`${RECURRING_TASKS_PATH}${id}/`, {
    method: "DELETE",
  });
}

export function listTaskOccurrences(dateFrom, dateTo, status, filters = {}) {
  const query = new URLSearchParams();

  if (dateFrom) {
    query.set("from", String(dateFrom));
  }
  if (dateTo) {
    query.set("to", String(dateTo));
  }
  if (status) {
    query.set("status", String(status));
  }
  if (filters.category) {
    query.set("category", String(filters.category));
  }
  if (filters.area) {
    query.set("area", String(filters.area));
  }
  if (filters.priority) {
    query.set("priority", String(filters.priority));
  }

  const suffix = query.toString() ? `task-occurrences/?${query.toString()}` : "task-occurrences/";
  return request(suffix);
}

export function completeTaskOccurrence(id, payload = {}) {
  return request(`task-occurrences/${id}/complete/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function skipTaskOccurrence(id, payload = {}) {
  return request(`task-occurrences/${id}/skip/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function reopenTaskOccurrence(id) {
  return request(`task-occurrences/${id}/reopen/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

const SAVINGS_GOALS_PATH = "savings-goals/";

export function listSavingsGoals(filters = {}) {
  const query = new URLSearchParams();
  if (filters.goal_type) {
    query.set("goal_type", String(filters.goal_type));
  }
  if (filters.is_active !== undefined) {
    query.set("is_active", String(filters.is_active));
  }
  const suffix = query.toString() ? `${SAVINGS_GOALS_PATH}?${query.toString()}` : SAVINGS_GOALS_PATH;
  return request(suffix);
}

export function createSavingsGoal(payload) {
  return request(SAVINGS_GOALS_PATH, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSavingsGoal(id, payload) {
  return request(`${SAVINGS_GOALS_PATH}${id}/`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteSavingsGoal(id) {
  return request(`${SAVINGS_GOALS_PATH}${id}/`, {
    method: "DELETE",
  });
}

export function contributeToGoal(id, amount) {
  return request(`${SAVINGS_GOALS_PATH}${id}/contribute/`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

export function getHouseholdInsights(dateFrom, dateTo, filters = {}) {
  const query = new URLSearchParams();

  if (dateFrom) {
    query.set("from", String(dateFrom));
  }
  if (dateTo) {
    query.set("to", String(dateTo));
  }
  if (filters.category) {
    query.set("category", String(filters.category));
  }
  if (filters.area) {
    query.set("area", String(filters.area));
  }
  if (filters.priority) {
    query.set("priority", String(filters.priority));
  }

  const suffix = query.toString() ? `household-insights/?${query.toString()}` : "household-insights/";
  return request(suffix);
}
