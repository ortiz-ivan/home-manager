import {
  ExpensesHeader,
  ExpensesModals,
  FinancialAnomaliesSection,
  FinancialTimelineSection,
  FinanceSummaryCards,
  FixedExpensesSection,
  IncomeSection,
  ProjectionSection,
  toInputDate,
  useExpensesPanelController,
  VariableExpensesSection,
} from "./expenses/index.js";

export function ExpensesPanel({
  incomes,
  summary,
  fixedExpenses,
  variableExpenses,
  financialEvents,
  monthlyCloses,
  selectedPeriod,
  onDataChanged,
}) {
  const activePeriodInputDate = summary?.year && summary?.month
    ? toInputDate(new Date(summary.year, summary.month - 1, 1))
    : toInputDate(new Date());
  const { income, variable, fixed, close, isCurrentCalendarMonth, isCustomPeriod } = useExpensesPanelController({
    activePeriodInputDate,
    summary,
    selectedPeriod,
    onDataChanged,
  });

  return (
    <section className="module-content fade-in">
      <ExpensesHeader
        isCustomPeriod={isCustomPeriod}
        isCurrentCalendarMonth={isCurrentCalendarMonth}
        onOpenFixedExpense={fixed.openExpenseModal}
        onOpenIncome={income.openIncomeModal}
        onOpenVariableExpense={variable.openVariableModal}
      />

      <FinanceSummaryCards summary={summary} />

      <ProjectionSection summary={summary} />

      <FinancialAnomaliesSection summary={summary} />

      <div className="finance-grid">
        <FixedExpensesSection
          fixedExpenses={fixedExpenses}
          fixedExpenseMessage={fixed.fixedExpenseMessage}
          isFixedExpenseError={fixed.isFixedExpenseError}
          payingExpenseId={fixed.payingExpenseId}
          canMarkAsPaid={isCurrentCalendarMonth}
          onOpenDetail={fixed.openFixedExpenseDetail}
          onEdit={fixed.handleEditFixedExpense}
          onPay={fixed.handlePayFixedExpense}
        />

        <IncomeSection incomes={incomes} onEdit={income.handleEditIncome} onDelete={income.handleDelete} />

        <VariableExpensesSection
          variableExpenses={variableExpenses}
          onEdit={variable.handleEditVariableExpense}
          onDelete={variable.handleDeleteVariableExpense}
        />
      </div>

      <FinancialTimelineSection
        summary={summary}
        events={financialEvents}
        monthlyCloses={monthlyCloses}
        closeNotes={close.closeNotes}
        onCloseNotesChange={close.handleCloseNotesChange}
        onCloseMonth={close.handleCloseMonth}
        isClosingMonth={close.isClosingMonth}
        closeMessage={close.closeMessage}
        isCloseError={close.isCloseError}
      />

      <ExpensesModals income={income} variable={variable} fixed={fixed} onDataChanged={onDataChanged} />
    </section>
  );
}
