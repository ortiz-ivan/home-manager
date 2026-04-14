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

export const FREQUENCY_LABELS = FREQUENCY_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});