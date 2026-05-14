import {
  BudgetComparisonChart,
  CategoryBudgetPanel,
  ExpenseCompositionChart,
  FixedExpensesStatusChart,
  IncomeSourcesChart,
  InventoryCategoryChart,
  ReportsHeader,
  ReportsPeriodFilter,
  TrendChart,
  useReportsViewController,
} from "./reports/index.js";

export function ReportsView({
  products,
  incomes,
  variableExpenses,
  financeSummary,
  fixedExpenses,
  onSelectPeriod,
  onResetPeriod,
}) {
  const {
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
  } = useReportsViewController({ financeSummary, onSelectPeriod });

  return (
    <section className="module-content fade-in reports-view">
      <ReportsHeader
        financeSummary={financeSummary}
        incomesCount={incomes.length}
        variableExpensesCount={variableExpenses.length}
        projectedSavings={projectedSavings}
      />

      <ReportsPeriodFilter
        selectedPeriodValue={selectedPeriodValue}
        currentPeriod={currentPeriod}
        previousPeriod={previousPeriod}
        onPeriodInputChange={handlePeriodInputChange}
        onApplyQuickPeriod={applyQuickPeriod}
        onUseLastSixMonths={handleUseLastSixMonths}
        onResetPeriod={onResetPeriod}
      />

      <div className="reports-grid">
        {loadingHistory ? (
          <article className="panel reports-panel reports-panel-wide">
            <p className="empty-report">Cargando tendencia financiera...</p>
          </article>
        ) : historyError ? (
          <article className="panel reports-panel reports-panel-wide">
            <p className="empty-report">{historyError}</p>
          </article>
        ) : (
          <TrendChart data={history} />
        )}

        <CategoryBudgetPanel summary={financeSummary} />
        <ExpenseCompositionChart summary={financeSummary} />
        <BudgetComparisonChart summary={financeSummary} />
        <InventoryCategoryChart products={products} />
        <IncomeSourcesChart incomes={incomes} />
        <FixedExpensesStatusChart fixedExpenses={fixedExpenses} />
      </div>
    </section>
  );
}