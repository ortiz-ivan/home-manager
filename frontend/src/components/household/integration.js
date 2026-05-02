export const HOUSEHOLD_INTEGRATION_OPTIONS = [
  { value: "", label: "Sin integracion" },
  { value: "fixed_expense", label: "Vincular a gasto fijo" },
  { value: "product_restock", label: "Vincular a reposicion" },
  { value: "product_expiry", label: "Vincular a vencimiento" },
];

export function getHouseholdIntegrationLabel(kind) {
  return HOUSEHOLD_INTEGRATION_OPTIONS.find((option) => option.value === kind)?.label || "Sin integracion";
}

export function getHouseholdIntegrationToneClass(tone) {
  if (tone === "danger") {
    return "danger";
  }
  if (tone === "warning") {
    return "warning";
  }
  if (tone === "success") {
    return "success";
  }
  return "info";
}