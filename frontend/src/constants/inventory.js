export const TYPE_OPTIONS = [
  { value: "consumable", label: "Consumible" },
  { value: "service", label: "Servicio" },
  { value: "subscription", label: "Suscripcion" },
  { value: "asset", label: "Activo" },
];

export const TYPE_LABELS = TYPE_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

export const FREQUENCY_OPTIONS = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

export const FREQUENCY_LABELS = FREQUENCY_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const EXACT_QUANTITY_UNITS = new Set(["kg", "g", "l", "ml"]);

export const DEFAULT_INVENTORY_SETTINGS = {
  categories: [
    { value: "food", label: "Alimentos", scope: "inventory", type: "consumable", budget_bucket: "needs", fallback_unit_cost: 4.8 },
    { value: "cleaning", label: "Limpieza", scope: "inventory", type: "consumable", budget_bucket: "needs", fallback_unit_cost: 6.2 },
    { value: "hygiene", label: "Higiene", scope: "inventory", type: "consumable", budget_bucket: "needs", fallback_unit_cost: 5.1 },
    { value: "assets", label: "Activos", scope: "inventory", type: "asset", budget_bucket: "needs", fallback_unit_cost: 11.6 },
    { value: "home", label: "Hogar", scope: "fixed_expense", type: "service", budget_bucket: "needs", fallback_unit_cost: 7.4 },
    { value: "services", label: "Servicios", scope: "fixed_expense", type: "service", budget_bucket: "needs", fallback_unit_cost: 12 },
    { value: "subscription", label: "Suscripciones", scope: "fixed_expense", type: "subscription", budget_bucket: "wants", fallback_unit_cost: 9.5 },
    { value: "mobility", label: "Movilidad", scope: "variable_expense", type: "service", budget_bucket: "needs", fallback_unit_cost: 8.1 },
    { value: "maintenance", label: "Mantenimiento", scope: "variable_expense", type: "service", budget_bucket: "needs", fallback_unit_cost: 10.5 },
    { value: "leisure", label: "Ocio", scope: "variable_expense", type: "service", budget_bucket: "wants", fallback_unit_cost: 7.9 },
  ],
  units: [
    { value: "unidad", label: "Unidad" },
    { value: "kg", label: "Kilogramo" },
    { value: "g", label: "Gramo" },
    { value: "l", label: "Litro" },
    { value: "ml", label: "Mililitro" },
    { value: "paquete", label: "Paquete" },
    { value: "caja", label: "Caja" },
    { value: "botella", label: "Botella" },
  ],
  budget_buckets: [
    { value: "needs", label: "Necesidades", target_ratio: 0.5 },
    { value: "wants", label: "Deseos", target_ratio: 0.3 },
    { value: "savings", label: "Ahorro / deuda", target_ratio: 0.2 },
  ],
  usage_frequency_weights: {
    high: 1.5,
    medium: 1,
    low: 0.65,
  },
  thresholds: {
    default_stock_min: 1,
    low_stock_ratio: 1,
    critical_stock_ratio: 1,
    purchase_suggestion_stock_ratio: 1,
  },
  currency: {
    code: "PYG",
    locale: "es-PY",
    maximum_fraction_digits: 0,
  },
  monthly_close_day: 25,
  alerts: {
    expiring_soon_days: 14,
    purchase_stale_days: 21,
    critical_frequencies: ["high"],
  },
  household_task_categories: [
    { value: "cleaning", label: "Limpieza" },
    { value: "maintenance", label: "Mantenimiento" },
    { value: "payments", label: "Pagos y vencimientos" },
    { value: "shopping", label: "Compras" },
    { value: "routine", label: "Rutina general" },
  ],
  household_task_areas: [
    { value: "kitchen", label: "Cocina" },
    { value: "bathroom", label: "Bano" },
    { value: "laundry", label: "Lavanderia" },
    { value: "bedroom", label: "Dormitorio" },
    { value: "living_room", label: "Sala / espacios comunes" },
    { value: "home_admin", label: "Administracion del hogar" },
  ],
  household_task_priorities: [
    { value: "low", label: "Baja" },
    { value: "medium", label: "Media" },
    { value: "high", label: "Alta" },
    { value: "critical", label: "Critica" },
  ],
};

// Fallback singleton for utility functions called outside React (e.g. form defaults
// before the first settings load). Kept in sync by AppContext via setCurrentInventorySettings.
// Prefer useInventorySettings() inside components instead of calling getCurrentInventorySettings().
let currentInventorySettings = DEFAULT_INVENTORY_SETTINGS;

export function normalizeInventorySettings(payload) {
  const source = payload?.config || payload || {};
  return {
    ...DEFAULT_INVENTORY_SETTINGS,
    ...source,
    usage_frequency_weights: {
      ...DEFAULT_INVENTORY_SETTINGS.usage_frequency_weights,
      ...(source.usage_frequency_weights || {}),
    },
    thresholds: {
      ...DEFAULT_INVENTORY_SETTINGS.thresholds,
      ...(source.thresholds || {}),
    },
    currency: {
      ...DEFAULT_INVENTORY_SETTINGS.currency,
      ...(source.currency || {}),
    },
    alerts: {
      ...DEFAULT_INVENTORY_SETTINGS.alerts,
      ...(source.alerts || {}),
    },
    household_task_categories: source.household_task_categories || DEFAULT_INVENTORY_SETTINGS.household_task_categories,
    household_task_areas: source.household_task_areas || DEFAULT_INVENTORY_SETTINGS.household_task_areas,
    household_task_priorities: source.household_task_priorities || DEFAULT_INVENTORY_SETTINGS.household_task_priorities,
    categories: source.categories || DEFAULT_INVENTORY_SETTINGS.categories,
    units: source.units || DEFAULT_INVENTORY_SETTINGS.units,
    budget_buckets: source.budget_buckets || DEFAULT_INVENTORY_SETTINGS.budget_buckets,
  };
}

export function setCurrentInventorySettings(settings) {
  currentInventorySettings = normalizeInventorySettings(settings);
}

export function getCurrentInventorySettings() {
  return currentInventorySettings;
}

export function getCategoryOptions(scope, settings = getCurrentInventorySettings()) {
  return settings.categories.filter((item) => item.scope === scope);
}

export function getCategoryLabel(category, settings = getCurrentInventorySettings()) {
  return settings.categories.find((item) => item.value === category)?.label || category;
}

export function isHomeInventoryCategory(category, settings = getCurrentInventorySettings()) {
  return getCategoryOptions("inventory", settings).some((item) => item.value === category);
}

export function getTypeForCategory(category, settings = getCurrentInventorySettings()) {
  return settings.categories.find((item) => item.value === category)?.type || "consumable";
}

export function getTypeLabel(type) {
  return TYPE_LABELS[type] || type;
}

export function getBudgetBucketForCategory(category, settings = getCurrentInventorySettings()) {
  return settings.categories.find((item) => item.value === category)?.budget_bucket || "needs";
}

export function getBudgetBucketOptions(settings = getCurrentInventorySettings()) {
  return settings.budget_buckets.map((item) => ({
    value: item.value,
    label: `${item.label} (${Math.round(Number(item.target_ratio || 0) * 100)}%)`,
  }));
}

export function getBudgetBucketLabels(settings = getCurrentInventorySettings()) {
  return settings.budget_buckets.reduce((acc, item) => {
    acc[item.value] = item.label;
    return acc;
  }, {});
}

export function getUnitOptions(settings = getCurrentInventorySettings()) {
  return settings.units;
}

export function requiresExactQuantity(unit) {
  return EXACT_QUANTITY_UNITS.has(unit);
}

export function getCategoryFallbackUnitCost(category, settings = getCurrentInventorySettings()) {
  return Number(settings.categories.find((item) => item.value === category)?.fallback_unit_cost || 4);
}

export function getUsageFrequencyWeight(frequency, settings = getCurrentInventorySettings()) {
  return Number(settings.usage_frequency_weights?.[frequency] || 1);
}

export function formatCurrency(value, settings = getCurrentInventorySettings(), extraOptions = {}) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat(settings.currency.locale, {
    style: "currency",
    currency: settings.currency.code,
    maximumFractionDigits: settings.currency.maximum_fraction_digits,
    ...extraOptions,
  }).format(Number.isNaN(amount) ? 0 : amount);
}

export function getHouseholdTaskCategoryOptions(settings = getCurrentInventorySettings()) {
  return settings.household_task_categories || [];
}

export function getHouseholdTaskAreaOptions(settings = getCurrentInventorySettings()) {
  return settings.household_task_areas || [];
}

export function getHouseholdTaskPriorityOptions(settings = getCurrentInventorySettings()) {
  return settings.household_task_priorities || [];
}

export function getHouseholdTaskCategoryLabel(value, settings = getCurrentInventorySettings()) {
  return getHouseholdTaskCategoryOptions(settings).find((item) => item.value === value)?.label || value;
}

export function getHouseholdTaskAreaLabel(value, settings = getCurrentInventorySettings()) {
  return getHouseholdTaskAreaOptions(settings).find((item) => item.value === value)?.label || value;
}

export function getHouseholdTaskPriorityLabel(value, settings = getCurrentInventorySettings()) {
  return getHouseholdTaskPriorityOptions(settings).find((item) => item.value === value)?.label || value;
}