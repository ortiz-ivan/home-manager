import { useCallback, useEffect, useState } from "react";
import {
  contributeToGoal,
  createSavingsGoal,
  deleteSavingsGoal,
  listSavingsGoals,
  updateSavingsGoal,
} from "../../api.js";

const EMPTY_FORM = {
  name: "",
  goal_type: "savings",
  target_amount: "",
  current_amount: "0",
  target_date: "",
  notes: "",
  is_active: true,
};

function goalToFormData(goal) {
  return {
    name: goal.name,
    goal_type: goal.goal_type,
    target_amount: String(goal.target_amount),
    current_amount: String(goal.current_amount),
    target_date: goal.target_date || "",
    notes: goal.notes || "",
    is_active: goal.is_active,
  };
}

export function useGoalsViewController() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingGoal, setEditingGoal] = useState(null);
  const [contributeTargetId, setContributeTargetId] = useState(null);
  const [contributeAmount, setContributeAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listSavingsGoals();
      setGoals(data || []);
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const clearMessage = () => {
    setMessage("");
    setIsError(false);
  };

  const openGoalModal = () => {
    setFormData(EMPTY_FORM);
    setEditingGoal(null);
    clearMessage();
    setIsGoalModalOpen(true);
  };

  const closeGoalModal = () => {
    setIsGoalModalOpen(false);
    setEditingGoal(null);
    setFormData(EMPTY_FORM);
    clearMessage();
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearMessage();
    setIsActing(true);

    try {
      const payload = {
        ...formData,
        target_amount: Number(formData.target_amount),
        current_amount: Number(formData.current_amount),
        target_date: formData.target_date || null,
      };

      if (editingGoal) {
        await updateSavingsGoal(editingGoal.id, payload);
      } else {
        await createSavingsGoal(payload);
      }

      setFormData(EMPTY_FORM);
      setEditingGoal(null);
      setIsGoalModalOpen(false);
      await loadGoals();
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    } finally {
      setIsActing(false);
    }
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setFormData(goalToFormData(goal));
    clearMessage();
    setIsGoalModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingGoal(null);
    setFormData(EMPTY_FORM);
    clearMessage();
    setIsGoalModalOpen(false);
  };

  const handleDeleteGoal = async (goalId) => {
    clearMessage();
    setIsActing(true);

    try {
      await deleteSavingsGoal(goalId);
      await loadGoals();
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    } finally {
      setIsActing(false);
    }
  };

  const handleOpenContribute = (goalId) => {
    setContributeTargetId(goalId);
    setContributeAmount("");
    clearMessage();
  };

  const handleCloseContribute = () => {
    setContributeTargetId(null);
    setContributeAmount("");
  };

  const handleContributeSubmit = async (event) => {
    event.preventDefault();
    clearMessage();
    setIsActing(true);

    try {
      await contributeToGoal(contributeTargetId, Number(contributeAmount));
      setContributeTargetId(null);
      setContributeAmount("");
      await loadGoals();
    } catch (error) {
      setMessage(error.message);
      setIsError(true);
    } finally {
      setIsActing(false);
    }
  };

  const activeGoals = goals.filter((g) => g.is_active);
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount), 0);
  const totalSaved = goals.reduce((sum, g) => sum + Number(g.current_amount), 0);
  const totalRemaining = goals.reduce((sum, g) => sum + Number(g.remaining), 0);
  const completedGoals = goals.filter((g) => g.is_completed);

  return {
    goals,
    loading,
    isActing,
    isGoalModalOpen,
    formData,
    editingGoal,
    contributeTargetId,
    contributeAmount,
    message,
    isError,
    activeGoals,
    completedGoals,
    totalTarget,
    totalSaved,
    totalRemaining,
    handleChange,
    handleSubmit,
    handleEditGoal,
    handleCancelEdit,
    handleDeleteGoal,
    handleOpenContribute,
    handleCloseContribute,
    setContributeAmount,
    handleContributeSubmit,
    openGoalModal,
    closeGoalModal,
  };
}
