import { useEffect, useMemo, useState } from "react";
import { getMonthlyFinanceSummary } from "../../api.js";
import {
  getCurrentPeriod,
  getPreviousPeriod,
  getRecentMonths,
  HISTORY_WINDOW,
  parseMonthInputValue,
  formatMonthInputValue,
} from "./utils.js";

export function useReportsViewController({ financeSummary, onSelectPeriod }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const selectedPeriodValue = formatMonthInputValue(financeSummary.month, financeSummary.year);
  const currentPeriod = useMemo(() => getCurrentPeriod(), []);
  const previousPeriod = useMemo(() => getPreviousPeriod(), []);
  const months = useMemo(
    () => getRecentMonths(HISTORY_WINDOW, financeSummary.month, financeSummary.year),
    [financeSummary.month, financeSummary.year],
  );

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      setLoadingHistory(true);
      setHistoryError("");

      try {
        const summaries = await Promise.all(
          months.map(async ({ month, year, label }) => {
            const summary = await getMonthlyFinanceSummary(month, year);
            return {
              ...summary,
              label,
            };
          }),
        );

        if (active) {
          setHistory(summaries);
        }
      } catch (error) {
        if (active) {
          setHistoryError(error.message || "No se pudo cargar la tendencia financiera");
          setHistory([]);
        }
      } finally {
        if (active) {
          setLoadingHistory(false);
        }
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [months]);

  const projectedSavings = Number(financeSummary.total_income || 0) - Number(financeSummary.estimated_expenses || 0);

  const selectPeriod = (period) => {
    if (typeof onSelectPeriod === "function") {
      onSelectPeriod(period);
    }
  };

  const handlePeriodInputChange = (event) => {
    const nextPeriod = parseMonthInputValue(event.target.value);

    if (!nextPeriod.month || !nextPeriod.year) {
      return;
    }

    selectPeriod(nextPeriod);
  };

  const applyQuickPeriod = (period) => {
    selectPeriod(period);
  };

  const handleUseLastSixMonths = () => {
    selectPeriod(currentPeriod);
  };

  return {
    history,
    loadingHistory,
    historyError,
    selectedPeriodValue,
    currentPeriod,
    previousPeriod,
    projectedSavings,
    handlePeriodInputChange,
    applyQuickPeriod,
    handleUseLastSixMonths,
  };
}