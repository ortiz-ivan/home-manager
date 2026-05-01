import { getCurrentInventorySettings } from "../../constants/inventory.js";

export const HISTORY_WINDOW = 6;

export function getCurrentPeriod() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function getPreviousPeriod() {
  const now = new Date();
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    month: previousMonthDate.getMonth() + 1,
    year: previousMonthDate.getFullYear(),
  };
}

export function formatMonthInputValue(month, year) {
  return `${String(year)}-${String(month).padStart(2, "0")}`;
}

export function parseMonthInputValue(value) {
  const [year, month] = String(value || "").split("-");
  return {
    month: Number(month),
    year: Number(year),
  };
}

export function formatCompactGuarani(value) {
  const settings = getCurrentInventorySettings();
  return new Intl.NumberFormat(settings.currency.locale, {
    style: "currency",
    currency: settings.currency.code,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

export function getMonthLabel(month, year) {
  return new Intl.DateTimeFormat("es-PY", {
    month: "short",
    year: "2-digit",
  }).format(new Date(year, month - 1, 1));
}

export function getRecentMonths(total, referenceMonth, referenceYear) {
  const now = new Date(referenceYear, referenceMonth - 1, 1);
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (total - 1 - index), 1);
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      label: getMonthLabel(date.getMonth() + 1, date.getFullYear()),
    };
  });
}

export function buildPoints(values, width, height, padding) {
  if (!values.length) {
    return "";
  }

  const maxValue = Math.max(...values, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  return values
    .map((value, index) => {
      const x = padding + (values.length === 1 ? innerWidth / 2 : (index * innerWidth) / (values.length - 1));
      const y = height - padding - (value / maxValue) * innerHeight;
      return `${x},${y}`;
    })
    .join(" ");
}

export function buildAreaPath(values, width, height, padding) {
  if (!values.length) {
    return "";
  }

  const maxValue = Math.max(...values, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = values.map((value, index) => {
    const x = padding + (values.length === 1 ? innerWidth / 2 : (index * innerWidth) / (values.length - 1));
    const y = height - padding - (value / maxValue) * innerHeight;
    return [x, y];
  });

  const [firstX, firstY] = points[0];
  const [lastX] = points[points.length - 1];

  return [
    `M ${firstX} ${height - padding}`,
    `L ${firstX} ${firstY}`,
    ...points.slice(1).map(([x, y]) => `L ${x} ${y}`),
    `L ${lastX} ${height - padding}`,
    "Z",
  ].join(" ");
}

export function formatDelta(value) {
  if (value === 0) {
    return "En objetivo";
  }

  return `${value > 0 ? "+" : ""}${formatCompactGuarani(value)}`;
}