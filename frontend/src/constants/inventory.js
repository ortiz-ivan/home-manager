export const CATEGORY_OPTIONS = [
  { value: "food", label: "Alimentos" },
  { value: "cleaning", label: "Limpieza" },
  { value: "hygiene", label: "Higiene" },
  { value: "home", label: "Hogar" },
  { value: "mobility", label: "Movilidad" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "subscription", label: "Suscripciones" },
  { value: "services", label: "Servicios" },
  { value: "assets", label: "Activos" },
  { value: "leisure", label: "Ocio" },
];

export const HOME_INVENTORY_CATEGORY_VALUES = ["food", "cleaning", "hygiene", "assets"];

export function isHomeInventoryCategory(category) {
  return HOME_INVENTORY_CATEGORY_VALUES.includes(category);
}

export const HOME_INVENTORY_CATEGORY_OPTIONS = CATEGORY_OPTIONS.filter((option) =>
  isHomeInventoryCategory(option.value)
);

export const EXPENSE_CATEGORY_OPTIONS = CATEGORY_OPTIONS.filter(
  (option) => !isHomeInventoryCategory(option.value)
);

export const FIXED_EXPENSE_CATEGORY_VALUES = ["services", "subscription", "home"];
export const VARIABLE_EXPENSE_CATEGORY_VALUES = ["mobility", "maintenance"];

export const FIXED_EXPENSE_CATEGORY_OPTIONS = CATEGORY_OPTIONS.filter((option) =>
  FIXED_EXPENSE_CATEGORY_VALUES.includes(option.value)
);

export const VARIABLE_EXPENSE_CATEGORY_OPTIONS = CATEGORY_OPTIONS.filter((option) =>
  VARIABLE_EXPENSE_CATEGORY_VALUES.includes(option.value)
);

export const CATEGORY_TYPE_MAP = {
  mobility: "service",
  maintenance: "service",
  home: "service",
  leisure: "service",
  services: "service",
  subscription: "subscription",
  assets: "asset",
};

export const CATEGORY_BUDGET_BUCKET_MAP = {
  food: "needs",
  cleaning: "needs",
  hygiene: "needs",
  home: "needs",
  mobility: "needs",
  maintenance: "needs",
  subscription: "wants",
  services: "needs",
  assets: "needs",
  leisure: "wants",
};

export function getTypeForCategory(category) {
  return CATEGORY_TYPE_MAP[category] || "consumable";
}

export function getBudgetBucketForCategory(category) {
  return CATEGORY_BUDGET_BUCKET_MAP[category] || "needs";
}

export const GROUPED_CATEGORY_OPTIONS = {
  consumable: HOME_INVENTORY_CATEGORY_OPTIONS.filter(
    (option) => getTypeForCategory(option.value) === "consumable"
  ),
  nonConsumable: HOME_INVENTORY_CATEGORY_OPTIONS.filter(
    (option) => getTypeForCategory(option.value) !== "consumable"
  ),
};

export const CATEGORY_VALUES = CATEGORY_OPTIONS.map((option) => option.value);

export const CATEGORY_LABELS = CATEGORY_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

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

export const BUDGET_BUCKET_OPTIONS = [
  { value: "needs", label: "Necesidades (50%)" },
  { value: "wants", label: "Deseos (30%)" },
  { value: "savings", label: "Ahorro / deuda (20%)" },
];

export const BUDGET_BUCKET_LABELS = BUDGET_BUCKET_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

export const FREQUENCY_LABELS = FREQUENCY_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});