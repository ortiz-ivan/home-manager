import { useState } from "react";
import {
  createIncome,
  createMonthlyClose,
  createVariableExpense,
  deleteIncome,
  deleteVariableExpense,
  payFixedExpense,
  updateIncome,
  updateVariableExpense,
} from "../../api.js";
import { getBudgetBucketForCategory } from "../../constants/inventory.js";
import {
  createIncomeFormState,
  createVariableExpenseFormState,
  formatGuarani,
} from "./utils.js";

function parsePositiveAmount(rawValue, errorMessage) {
  const amount = Number(rawValue);

  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error(errorMessage);
  }

  return amount;
}

function requestChangeReason(message, fallbackValue) {
  return window.prompt(message, fallbackValue)?.trim() || "";
}

function useIncomeController(activePeriodInputDate, onDataChanged) {
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isEditIncomeModalOpen, setIsEditIncomeModalOpen] = useState(false);
  const [formData, setFormData] = useState(() => createIncomeFormState());
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [editIncomeForm, setEditIncomeForm] = useState(() => createIncomeFormState());
  const [editIncomeMessage, setEditIncomeMessage] = useState("");
  const [isEditIncomeError, setIsEditIncomeError] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditIncomeChange = (event) => {
    const { name, value } = event.target;
    setEditIncomeForm((prev) => ({ ...prev, [name]: value }));
  };

  const openIncomeModal = () => {
    setMessage("");
    setIsError(false);
    setFormData(createIncomeFormState());
    setIsIncomeModalOpen(true);
  };

  const closeIncomeModal = () => {
    setIsIncomeModalOpen(false);
    setMessage("");
    setIsError(false);
  };

  const closeEditIncomeModal = () => {
    setIsEditIncomeModalOpen(false);
    setEditingIncomeId(null);
    setEditIncomeMessage("");
    setIsEditIncomeError(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    try {
      const amount = parsePositiveAmount(formData.amount, "El ingreso debe ser mayor a 0");
      await createIncome({
        ...formData,
        amount,
      });
      setFormData(createIncomeFormState());
      setMessage("Ingreso registrado");
      await onDataChanged();
      setIsIncomeModalOpen(false);
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    }
  };

  const handleDelete = async (income) => {
    const ok = window.confirm(`Eliminar ingreso de ${formatGuarani(income.amount)}?`);
    if (!ok) {
      return;
    }

    const changeReason = requestChangeReason(
      "Motivo de la eliminacion",
      "Movimiento duplicado o cargado por error",
    );

    if (!changeReason) {
      setMessage("Debes indicar el motivo de la eliminacion");
      setIsError(true);
      return;
    }

    setMessage("");
    setIsError(false);

    try {
      await deleteIncome(income.id, { change_reason: changeReason });
      await onDataChanged();
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    }
  };

  const handleEditIncome = (income) => {
    setEditingIncomeId(income.id);
    setEditIncomeForm({
      amount: String(income.amount ?? ""),
      source: income.source || "",
      notes: income.notes || "",
      change_reason: "",
      date: income.date,
    });
    setEditIncomeMessage("");
    setIsEditIncomeError(false);
    setIsEditIncomeModalOpen(true);
  };

  const handleEditIncomeSubmit = async (event) => {
    event.preventDefault();
    setEditIncomeMessage("");
    setIsEditIncomeError(false);

    try {
      const amount = parsePositiveAmount(editIncomeForm.amount, "El ingreso debe ser mayor a 0");
      await updateIncome(editingIncomeId, {
        ...editIncomeForm,
        amount,
      });
      setEditIncomeMessage("Ingreso actualizado");
      await onDataChanged();
      setIsEditIncomeModalOpen(false);
    } catch (error) {
      setEditIncomeMessage(error.message);
      setIsEditIncomeError(true);
    }
  };

  return {
    isIncomeModalOpen,
    isEditIncomeModalOpen,
    formData,
    message,
    isError,
    editIncomeForm,
    editIncomeMessage,
    isEditIncomeError,
    handleChange,
    handleSubmit,
    handleDelete,
    handleEditIncome,
    handleEditIncomeChange,
    handleEditIncomeSubmit,
    openIncomeModal,
    closeIncomeModal,
    closeEditIncomeModal,
  };
}

function useVariableExpenseController(activePeriodInputDate, onDataChanged) {
  const [isVariableModalOpen, setIsVariableModalOpen] = useState(false);
  const [isEditVariableModalOpen, setIsEditVariableModalOpen] = useState(false);
  const [variableForm, setVariableForm] = useState(() => createVariableExpenseFormState());
  const [variableMessage, setVariableMessage] = useState("");
  const [isVariableError, setIsVariableError] = useState(false);
  const [editingVariableExpenseId, setEditingVariableExpenseId] = useState(null);
  const [editVariableForm, setEditVariableForm] = useState(() => createVariableExpenseFormState());
  const [editVariableMessage, setEditVariableMessage] = useState("");
  const [isEditVariableError, setIsEditVariableError] = useState(false);

  const handleVariableChange = (event) => {
    const { name, value } = event.target;
    setVariableForm((prev) => ({
      ...prev,
      ...(name === "category" ? { budget_bucket: getBudgetBucketForCategory(value) } : {}),
      [name]: value,
    }));
  };

  const handleEditVariableChange = (event) => {
    const { name, value } = event.target;
    setEditVariableForm((prev) => ({
      ...prev,
      ...(name === "category" ? { budget_bucket: getBudgetBucketForCategory(value) } : {}),
      [name]: value,
    }));
  };

  const openVariableModal = () => {
    setVariableMessage("");
    setIsVariableError(false);
    setVariableForm(createVariableExpenseFormState());
    setIsVariableModalOpen(true);
  };

  const closeVariableModal = () => {
    setIsVariableModalOpen(false);
    setVariableMessage("");
    setIsVariableError(false);
  };

  const closeEditVariableModal = () => {
    setIsEditVariableModalOpen(false);
    setEditingVariableExpenseId(null);
    setEditVariableMessage("");
    setIsEditVariableError(false);
  };

  const handleVariableSubmit = async (event) => {
    event.preventDefault();
    setVariableMessage("");
    setIsVariableError(false);

    try {
      const amount = parsePositiveAmount(variableForm.amount, "El gasto debe ser mayor a 0");
      await createVariableExpense({
        ...variableForm,
        amount,
      });
      setVariableForm(createVariableExpenseFormState());
      setVariableMessage("Gasto variable registrado");
      await onDataChanged();
      setIsVariableModalOpen(false);
    } catch (error) {
      setVariableMessage(error.message);
      setIsVariableError(true);
    }
  };

  const handleEditVariableExpense = (expense) => {
    setEditingVariableExpenseId(expense.id);
    setEditVariableForm({
      amount: String(expense.amount ?? ""),
      category: expense.category,
      budget_bucket: expense.budget_bucket || getBudgetBucketForCategory(expense.category),
      description: expense.description || "",
      notes: expense.notes || "",
      change_reason: "",
      date: expense.date,
    });
    setEditVariableMessage("");
    setIsEditVariableError(false);
    setIsEditVariableModalOpen(true);
  };

  const handleEditVariableSubmit = async (event) => {
    event.preventDefault();
    setEditVariableMessage("");
    setIsEditVariableError(false);

    try {
      const amount = parsePositiveAmount(editVariableForm.amount, "El gasto debe ser mayor a 0");
      await updateVariableExpense(editingVariableExpenseId, {
        ...editVariableForm,
        amount,
      });
      setEditVariableMessage("Gasto variable actualizado");
      await onDataChanged();
      setIsEditVariableModalOpen(false);
    } catch (error) {
      setEditVariableMessage(error.message);
      setIsEditVariableError(true);
    }
  };

  const handleDeleteVariableExpense = async (expense) => {
    const ok = window.confirm(`Eliminar gasto de ${formatGuarani(expense.amount)}?`);
    if (!ok) {
      return;
    }

    const changeReason = requestChangeReason(
      "Motivo de la eliminacion",
      "Movimiento duplicado o cargado por error",
    );

    if (!changeReason) {
      setVariableMessage("Debes indicar el motivo de la eliminacion");
      setIsVariableError(true);
      return;
    }

    setVariableMessage("");
    setIsVariableError(false);

    try {
      await deleteVariableExpense(expense.id, { change_reason: changeReason });
      await onDataChanged();
    } catch (error) {
      setVariableMessage(error.message);
      setIsVariableError(true);
    }
  };

  return {
    isVariableModalOpen,
    isEditVariableModalOpen,
    variableForm,
    variableMessage,
    isVariableError,
    editVariableForm,
    editVariableMessage,
    isEditVariableError,
    handleVariableChange,
    handleVariableSubmit,
    handleEditVariableExpense,
    handleEditVariableChange,
    handleEditVariableSubmit,
    handleDeleteVariableExpense,
    openVariableModal,
    closeVariableModal,
    closeEditVariableModal,
  };
}

function useFixedExpenseController(onDataChanged) {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isEditFixedExpenseModalOpen, setIsEditFixedExpenseModalOpen] = useState(false);
  const [fixedExpenseMessage, setFixedExpenseMessage] = useState("");
  const [isFixedExpenseError, setIsFixedExpenseError] = useState(false);
  const [payingExpenseId, setPayingExpenseId] = useState(null);
  const [editingFixedExpenseId, setEditingFixedExpenseId] = useState(null);
  const [editFixedExpenseForm, setEditFixedExpenseForm] = useState(null);
  const [selectedFixedExpense, setSelectedFixedExpense] = useState(null);

  const openExpenseModal = () => {
    setIsExpenseModalOpen(true);
  };

  const closeExpenseModal = () => {
    setIsExpenseModalOpen(false);
  };

  const handleEditFixedExpense = (expense) => {
    setEditingFixedExpenseId(expense.id);
    setEditFixedExpenseForm({
      name: expense.name,
      category: expense.category,
      budget_bucket: expense.budget_bucket || getBudgetBucketForCategory(expense.category),
      monthly_amount: expense.monthly_amount ?? "",
      next_due_date: expense.next_due_date || "",
      change_reason: "",
    });
    setIsEditFixedExpenseModalOpen(true);
  };

  const closeEditFixedExpenseModal = () => {
    setIsEditFixedExpenseModalOpen(false);
    setEditingFixedExpenseId(null);
    setEditFixedExpenseForm(null);
  };

  const openFixedExpenseDetail = (expense) => {
    setSelectedFixedExpense(expense);
  };

  const closeFixedExpenseDetail = () => {
    setSelectedFixedExpense(null);
  };

  const handlePayFixedExpense = async (expense) => {
    const changeReason = requestChangeReason("Motivo del pago", "Pago mensual confirmado");

    if (!changeReason) {
      setFixedExpenseMessage("Debes indicar el motivo del pago");
      setIsFixedExpenseError(true);
      return;
    }

    setFixedExpenseMessage("");
    setIsFixedExpenseError(false);
    setPayingExpenseId(expense.id);

    try {
      await payFixedExpense(expense.id, { change_reason: changeReason });
      setFixedExpenseMessage(`Pago registrado para ${expense.name}`);
      await onDataChanged();
    } catch (error) {
      setFixedExpenseMessage(error.message);
      setIsFixedExpenseError(true);
    } finally {
      setPayingExpenseId(null);
    }
  };

  return {
    isExpenseModalOpen,
    isEditFixedExpenseModalOpen,
    fixedExpenseMessage,
    isFixedExpenseError,
    payingExpenseId,
    editingFixedExpenseId,
    editFixedExpenseForm,
    selectedFixedExpense,
    openExpenseModal,
    closeExpenseModal,
    handleEditFixedExpense,
    closeEditFixedExpenseModal,
    openFixedExpenseDetail,
    closeFixedExpenseDetail,
    handlePayFixedExpense,
  };
}

function useMonthlyCloseController(summary, onDataChanged) {
  const [closeNotes, setCloseNotes] = useState("");
  const [closeMessage, setCloseMessage] = useState("");
  const [isCloseError, setIsCloseError] = useState(false);
  const [isClosingMonth, setIsClosingMonth] = useState(false);

  const handleCloseNotesChange = (event) => {
    setCloseNotes(event.target.value);
  };

  const handleCloseMonth = async () => {
    setCloseMessage("");
    setIsCloseError(false);
    setIsClosingMonth(true);

    try {
      await createMonthlyClose({
        month: summary.month,
        year: summary.year,
        notes: closeNotes,
      });
      setCloseMessage("Cierre mensual registrado");
      setCloseNotes("");
      await onDataChanged();
    } catch (error) {
      setCloseMessage(error.message);
      setIsCloseError(true);
    } finally {
      setIsClosingMonth(false);
    }
  };

  return {
    closeNotes,
    closeMessage,
    isCloseError,
    isClosingMonth,
    handleCloseNotesChange,
    handleCloseMonth,
  };
}

export function useExpensesPanelController({ activePeriodInputDate, summary, selectedPeriod, onDataChanged }) {
  const income = useIncomeController(activePeriodInputDate, onDataChanged);
  const variable = useVariableExpenseController(activePeriodInputDate, onDataChanged);
  const fixed = useFixedExpenseController(onDataChanged);
  const close = useMonthlyCloseController(summary, onDataChanged);
  const currentDate = new Date();
  const isCurrentCalendarMonth = summary?.month === currentDate.getMonth() + 1 && summary?.year === currentDate.getFullYear();

  return {
    income,
    variable,
    fixed,
    close,
    isCurrentCalendarMonth,
    isCustomPeriod: Boolean(selectedPeriod),
  };
}