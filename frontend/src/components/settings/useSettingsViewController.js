import { useEffect, useMemo, useState } from "react";

const CATEGORY_SCOPE_OPTIONS = [
  { value: "inventory", label: "Inventario" },
  { value: "fixed_expense", label: "Gasto fijo" },
  { value: "variable_expense", label: "Gasto variable" },
];

const TYPE_OPTIONS = [
  { value: "consumable", label: "Consumible" },
  { value: "service", label: "Servicio" },
  { value: "subscription", label: "Suscripcion" },
  { value: "asset", label: "Activo" },
];

const CRITICAL_FREQUENCY_OPTIONS = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

function cloneSettings(settings) {
  return JSON.parse(JSON.stringify(settings));
}

function createCategoryDraft(bucketValue) {
  return {
    value: "",
    label: "",
    scope: "inventory",
    type: "consumable",
    budget_bucket: bucketValue,
    fallback_unit_cost: 0,
  };
}

function createUnitDraft() {
  return {
    value: "",
    label: "",
  };
}

export function useSettingsViewController({ settings, onSave }) {
  const [formState, setFormState] = useState(() => cloneSettings(settings));
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormState(cloneSettings(settings));
  }, [settings]);

  const bucketOptions = useMemo(
    () => formState.budget_buckets.map((item) => ({ value: item.value, label: item.label })),
    [formState.budget_buckets],
  );

  const updateCategory = (index, key, value) => {
    setFormState((prev) => {
      const next = cloneSettings(prev);
      next.categories[index][key] = key === "fallback_unit_cost" ? Number(value) : value;
      return next;
    });
  };

  const addCategory = () => {
    setFormState((prev) => ({
      ...prev,
      categories: [...prev.categories, createCategoryDraft(prev.budget_buckets[0]?.value || "needs")],
    }));
  };

  const removeCategory = (index) => {
    setFormState((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateUnit = (index, key, value) => {
    setFormState((prev) => {
      const next = cloneSettings(prev);
      next.units[index][key] = value;
      return next;
    });
  };

  const addUnit = () => {
    setFormState((prev) => ({
      ...prev,
      units: [...prev.units, createUnitDraft()],
    }));
  };

  const removeUnit = (index) => {
    setFormState((prev) => ({
      ...prev,
      units: prev.units.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateBucket = (index, key, value) => {
    setFormState((prev) => {
      const next = cloneSettings(prev);
      next.budget_buckets[index][key] = key === "target_ratio" ? Number(value) : value;
      return next;
    });
  };

  const updateThreshold = (key, value) => {
    setFormState((prev) => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [key]: Number(value),
      },
    }));
  };

  const updateCurrency = (key, value) => {
    setFormState((prev) => ({
      ...prev,
      currency: {
        ...prev.currency,
        [key]: key === "maximum_fraction_digits" ? Number(value) : value,
      },
    }));
  };

  const updateMonthlyCloseDay = (value) => {
    setFormState((prev) => ({ ...prev, monthly_close_day: Number(value) }));
  };

  const updateAlert = (key, value) => {
    setFormState((prev) => ({
      ...prev,
      alerts: {
        ...prev.alerts,
        [key]: Number(value),
      },
    }));
  };

  const toggleCriticalFrequency = (frequencyValue) => {
    setFormState((prev) => {
      const currentValues = prev.alerts.critical_frequencies || [];
      const exists = currentValues.includes(frequencyValue);
      const nextValues = exists
        ? currentValues.filter((item) => item !== frequencyValue)
        : [...currentValues, frequencyValue];

      return {
        ...prev,
        alerts: {
          ...prev.alerts,
          critical_frequencies: nextValues,
        },
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (!formState.categories.length) {
      setMessage("Debe existir al menos una categoria.");
      setIsError(true);
      return;
    }

    if (!formState.units.length) {
      setMessage("Debe existir al menos una unidad.");
      setIsError(true);
      return;
    }

    if (!formState.alerts.critical_frequencies.length) {
      setMessage("Selecciona al menos una frecuencia critica para alertas.");
      setIsError(true);
      return;
    }

    try {
      setIsSaving(true);
      await onSave(formState);
      setMessage("Configuracion actualizada");
    } catch (error) {
      setMessage(error.message || "No se pudo guardar la configuracion");
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    formState,
    message,
    isError,
    isSaving,
    bucketOptions,
    categoryScopeOptions: CATEGORY_SCOPE_OPTIONS,
    typeOptions: TYPE_OPTIONS,
    criticalFrequencyOptions: CRITICAL_FREQUENCY_OPTIONS,
    updateCategory,
    addCategory,
    removeCategory,
    updateUnit,
    addUnit,
    removeUnit,
    updateBucket,
    updateThreshold,
    updateCurrency,
    updateMonthlyCloseDay,
    updateAlert,
    toggleCriticalFrequency,
    handleSubmit,
  };
}