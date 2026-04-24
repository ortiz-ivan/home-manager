import { getBudgetBucketForCategory } from "../../constants/inventory.js";

export function formatGuarani(value) {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatMonthYear(month, year) {
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("es-PY", { month: "long", year: "numeric" }).format(date);
}

export function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createIncomeFormState(date) {
  return {
    amount: "",
    source: "",
    notes: "",
    date,
  };
}

export function createVariableExpenseFormState(date) {
  return {
    amount: "",
    category: "mobility",
    budget_bucket: getBudgetBucketForCategory("mobility"),
    description: "",
    notes: "",
    date,
  };
}