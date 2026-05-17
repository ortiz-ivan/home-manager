from datetime import date
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.expenses.models import FixedExpense, FixedExpensePayment, Income, VariableExpense
from apps.purchases.models import Product, ProductRestock
from apps.reports.models import FinancialEvent, MonthlyClose
from apps.reports.services import (
    _compute_category_breakdown,
    _compute_monthly_projection,
    calculate_monthly_finance_summary,
    create_monthly_close,
    get_active_financial_period,
)

MONTH = 3
YEAR = 2025


# ---------------------------------------------------------------------------
# calculate_monthly_finance_summary
# ---------------------------------------------------------------------------

class TestCalculateMonthlyFinanceSummary:
    def test_periodo_vacio_retorna_ceros(self, db):
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["total_income"] == 0.0
        assert summary["variable_expenses"] == 0.0
        assert summary["fixed_estimated_expenses"] == 0.0
        assert summary["expense_percentage"] is None

    def test_contabiliza_ingresos_del_mes(self, db):
        Income.objects.create(amount=Decimal("1000"), date=date(YEAR, MONTH, 10))
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["total_income"] == 1000.0

    def test_ignora_ingresos_de_otro_mes(self, db):
        Income.objects.create(amount=Decimal("1000"), date=date(YEAR, MONTH - 1, 10))
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["total_income"] == 0.0

    def test_contabiliza_gastos_variables(self, db):
        Income.objects.create(amount=Decimal("1000"), date=date(YEAR, MONTH, 1))
        VariableExpense.objects.create(
            amount=Decimal("200"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5),
        )
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["variable_expenses"] == 200.0

    def test_ignora_gastos_variables_de_otro_mes(self, db):
        VariableExpense.objects.create(
            amount=Decimal("200"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH - 1, 5),
        )
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["variable_expenses"] == 0.0

    def test_contabiliza_pagos_fijos_del_mes(self, db):
        Income.objects.create(amount=Decimal("1000"), date=date(YEAR, MONTH, 1))
        expense = FixedExpense.objects.create(
            name="Alquiler", category="home", budget_bucket="needs",
            monthly_amount=Decimal("400"), is_active=True,
        )
        FixedExpensePayment.objects.create(
            fixed_expense=expense, date=date(YEAR, MONTH, 1), amount=Decimal("400"),
        )
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["fixed_estimated_expenses"] == 400.0

    def test_balance_restante_correcto(self, db):
        Income.objects.create(amount=Decimal("1000"), date=date(YEAR, MONTH, 1))
        VariableExpense.objects.create(
            amount=Decimal("300"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5),
        )
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        # sin productos activos: home_estimated_expenses=0
        assert summary["remaining_balance"] == pytest.approx(700.0, abs=1)

    def test_porcentaje_de_gasto_calculado(self, db):
        Income.objects.create(amount=Decimal("1000"), date=date(YEAR, MONTH, 1))
        VariableExpense.objects.create(
            amount=Decimal("500"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5),
        )
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["expense_percentage"] is not None
        assert summary["expense_percentage"] == pytest.approx(50.0, abs=1)

    def test_regla_50_30_20_targets_proporcionales_al_ingreso(self, db):
        Income.objects.create(amount=Decimal("1000"), date=date(YEAR, MONTH, 1))
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        targets = summary["rule_50_30_20"]["targets"]
        assert targets["needs"] == pytest.approx(500.0)
        assert targets["wants"] == pytest.approx(300.0)
        assert targets["savings"] == pytest.approx(200.0)

    def test_regla_50_30_20_targets_cero_sin_ingreso(self, db):
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        targets = summary["rule_50_30_20"]["targets"]
        assert targets["needs"] == 0.0
        assert targets["wants"] == 0.0
        assert targets["savings"] == 0.0

    def test_incluye_todos_los_campos_esperados(self, db):
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        expected_keys = {
            "month", "year", "total_income", "home_estimated_expenses",
            "fixed_estimated_expenses", "variable_expenses", "estimated_expenses",
            "expense_percentage", "remaining_balance", "rule_50_30_20", "monthly_close",
            "projection",
        }
        assert expected_keys.issubset(summary.keys())

    def test_monthly_close_es_none_si_no_existe(self, db):
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["monthly_close"] is None

    def test_monthly_close_incluido_si_existe(self, db):
        MonthlyClose.objects.create(month=MONTH, year=YEAR, summary_snapshot={})
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["monthly_close"] is not None
        assert summary["monthly_close"]["month"] == MONTH


# ---------------------------------------------------------------------------
# create_monthly_close
# ---------------------------------------------------------------------------

class TestCreateMonthlyClose:
    def test_crea_cierre_mensual(self, db):
        close = create_monthly_close(MONTH, YEAR)
        assert close.pk is not None
        assert close.month == MONTH
        assert close.year == YEAR

    def test_crea_evento_financiero(self, db):
        create_monthly_close(MONTH, YEAR)
        evento = FinancialEvent.objects.filter(entity_type="monthly_close").first()
        assert evento is not None
        assert evento.action == "monthly_closed"

    def test_snapshot_almacenado_en_cierre(self, db):
        close = create_monthly_close(MONTH, YEAR)
        assert isinstance(close.summary_snapshot, dict)
        assert "month" in close.summary_snapshot
        assert close.summary_snapshot["month"] == MONTH

    def test_lanza_error_en_cierre_duplicado(self, db):
        create_monthly_close(MONTH, YEAR)
        with pytest.raises(ValueError, match="ya fue cerrado"):
            create_monthly_close(MONTH, YEAR)

    def test_lanza_error_mes_invalido_mayor_12(self, db):
        with pytest.raises(ValueError, match="mes"):
            create_monthly_close(13, YEAR)

    def test_lanza_error_mes_invalido_cero(self, db):
        with pytest.raises(ValueError, match="mes"):
            create_monthly_close(0, YEAR)

    def test_guarda_notas(self, db):
        close = create_monthly_close(MONTH, YEAR, notes="Mes cerrado manualmente")
        assert close.notes == "Mes cerrado manualmente"

    def test_acepta_todos_los_meses_validos(self, db):
        for month in range(1, 13):
            close = create_monthly_close(month, YEAR + month)
            assert close.month == month


# ---------------------------------------------------------------------------
# get_active_financial_period
# ---------------------------------------------------------------------------

class TestGetActiveFinancialPeriod:
    def test_retorna_mes_actual_sin_cierres(self, db):
        today = timezone.localdate()
        month, year = get_active_financial_period()
        assert month == today.month
        assert year == today.year

    def test_retorna_mes_actual_con_cierre_del_mes_anterior(self, db):
        today = timezone.localdate()
        prev_month = today.month - 1 if today.month > 1 else 12
        prev_year = today.year if today.month > 1 else today.year - 1
        MonthlyClose.objects.create(month=prev_month, year=prev_year, summary_snapshot={})
        month, year = get_active_financial_period()
        assert month == today.month
        assert year == today.year


# ---------------------------------------------------------------------------
# _compute_monthly_projection
# ---------------------------------------------------------------------------

class TestComputeMonthlyProjection:
    TODAY = date(2025, MONTH, 15)

    def test_es_mes_actual_cuando_today_coincide(self, db):
        proj = _compute_monthly_projection(MONTH, YEAR, Decimal("0"), today=self.TODAY)
        assert proj["is_current_month"] is True

    def test_no_es_mes_actual_para_mes_pasado(self, db):
        proj = _compute_monthly_projection(MONTH - 1, YEAR, Decimal("0"), today=self.TODAY)
        assert proj["is_current_month"] is False

    def test_days_elapsed_igual_a_dia_de_today(self, db):
        proj = _compute_monthly_projection(MONTH, YEAR, Decimal("0"), today=self.TODAY)
        assert proj["days_elapsed"] == self.TODAY.day

    def test_days_elapsed_igual_a_days_total_en_mes_pasado(self, db):
        proj = _compute_monthly_projection(MONTH - 1, YEAR, Decimal("0"), today=self.TODAY)
        assert proj["days_elapsed"] == proj["days_total"]

    def test_gasto_real_incluye_variables_y_pagos_fijos(self, db):
        VariableExpense.objects.create(
            amount=Decimal("300"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5),
        )
        expense = FixedExpense.objects.create(
            name="Alquiler", category="home", budget_bucket="needs",
            monthly_amount=Decimal("500"), is_active=True,
        )
        FixedExpensePayment.objects.create(
            fixed_expense=expense, date=date(YEAR, MONTH, 1), amount=Decimal("500"),
        )
        proj = _compute_monthly_projection(MONTH, YEAR, Decimal("2000"), today=self.TODAY)
        assert proj["actual_spend_so_far"] == pytest.approx(800.0)

    def test_gasto_real_incluye_reposiciones_con_costo(self, db):
        product = Product.objects.create(
            name="Arroz", category="food", stock=10, stock_min=2,
        )
        ProductRestock.objects.create(
            product=product, quantity=Decimal("5"), unit_cost=Decimal("20"),
            date=date(YEAR, MONTH, 3),
        )
        proj = _compute_monthly_projection(MONTH, YEAR, Decimal("2000"), today=self.TODAY)
        assert proj["actual_spend_so_far"] == pytest.approx(100.0)

    def test_proyeccion_calcula_tasa_diaria(self, db):
        VariableExpense.objects.create(
            amount=Decimal("150"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5),
        )
        proj = _compute_monthly_projection(MONTH, YEAR, Decimal("2000"), today=self.TODAY)
        expected_rate = 150.0 / self.TODAY.day
        assert proj["daily_rate"] == pytest.approx(expected_rate, abs=0.01)

    def test_proyeccion_fin_de_mes(self, db):
        VariableExpense.objects.create(
            amount=Decimal("150"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5),
        )
        proj = _compute_monthly_projection(MONTH, YEAR, Decimal("2000"), today=self.TODAY)
        expected_end = (150.0 / self.TODAY.day) * proj["days_total"]
        assert proj["projected_month_end"] == pytest.approx(expected_end, abs=0.01)

    def test_alerta_no_income_cuando_sin_ingresos(self, db):
        VariableExpense.objects.create(
            amount=Decimal("100"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5),
        )
        proj = _compute_monthly_projection(MONTH, YEAR, Decimal("0"), today=self.TODAY)
        codes = [a["code"] for a in proj["alerts"]]
        assert "no_income" in codes

    def test_alerta_deficit_cuando_proyeccion_supera_ingreso(self, db):
        VariableExpense.objects.create(
            amount=Decimal("900"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 1),
        )
        proj = _compute_monthly_projection(MONTH, YEAR, Decimal("500"), today=self.TODAY)
        codes = [a["code"] for a in proj["alerts"]]
        assert "budget_overrun" in codes
        assert proj["alerts"][0]["level"] == "danger"

    def test_sin_alertas_para_mes_pasado(self, db):
        VariableExpense.objects.create(
            amount=Decimal("9000"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH - 1, 5),
        )
        proj = _compute_monthly_projection(MONTH - 1, YEAR, Decimal("100"), today=self.TODAY)
        assert proj["alerts"] == []

    def test_sin_gastos_no_hay_proyeccion(self, db):
        proj = _compute_monthly_projection(MONTH, YEAR, Decimal("2000"), today=self.TODAY)
        assert proj["actual_spend_so_far"] == 0.0
        assert proj["daily_rate"] == 0.0
        assert proj["projected_month_end"] == 0.0

    def test_projection_ignora_variables_comprometidas_en_daily_rate(self, db):
        # Variable paid: aporta al daily_rate
        VariableExpense.objects.create(
            amount=Decimal("150"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5), status=VariableExpense.STATUS_PAID,
        )
        # Variable committed: NO debe aportar al daily_rate
        VariableExpense.objects.create(
            amount=Decimal("500"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 10), status=VariableExpense.STATUS_COMMITTED,
        )
        proj = _compute_monthly_projection(MONTH, YEAR, Decimal("2000"), today=self.TODAY)
        # actual_spend_so_far solo debe incluir 150 (paid), no 650
        assert proj["actual_spend_so_far"] == pytest.approx(150.0)
        expected_rate = 150.0 / self.TODAY.day
        assert proj["daily_rate"] == pytest.approx(expected_rate, abs=0.01)


# ---------------------------------------------------------------------------
# calculate_monthly_finance_summary — breakdown paid/committed
# ---------------------------------------------------------------------------

class TestCalculateMonthlyFinanceSummaryPaidCommitted:
    def test_nuevos_campos_presentes_en_summary(self, db):
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        for key in ("paid_expenses", "committed_expenses", "committed_fixed_expenses",
                    "paid_variable_expenses", "committed_variable_expenses"):
            assert key in summary, f"Falta el campo '{key}' en el summary"

    def test_paid_expenses_incluye_pagos_fijos_y_variables_pagados(self, db):
        expense = FixedExpense.objects.create(
            name="Alquiler", category="home", budget_bucket="needs",
            monthly_amount=Decimal("400"), is_active=True,
        )
        FixedExpensePayment.objects.create(
            fixed_expense=expense, date=date(YEAR, MONTH, 1), amount=Decimal("400"),
        )
        VariableExpense.objects.create(
            amount=Decimal("200"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5), status=VariableExpense.STATUS_PAID,
        )
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["paid_expenses"] == pytest.approx(600.0)

    def test_committed_fixed_son_activos_sin_pago_en_el_mes(self, db):
        FixedExpense.objects.create(
            name="Internet", category="services", budget_bucket="needs",
            monthly_amount=Decimal("80"), is_active=True,
        )
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["committed_fixed_expenses"] == pytest.approx(80.0)
        assert summary["committed_expenses"] == pytest.approx(80.0)

    def test_committed_fixed_excluye_activos_ya_pagados(self, db):
        expense = FixedExpense.objects.create(
            name="Alquiler", category="home", budget_bucket="needs",
            monthly_amount=Decimal("400"), is_active=True,
        )
        FixedExpensePayment.objects.create(
            fixed_expense=expense, date=date(YEAR, MONTH, 1), amount=Decimal("400"),
        )
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["committed_fixed_expenses"] == 0.0

    def test_committed_fixed_excluye_inactivos(self, db):
        FixedExpense.objects.create(
            name="Inactivo", category="home", budget_bucket="needs",
            monthly_amount=Decimal("200"), is_active=False,
        )
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["committed_fixed_expenses"] == 0.0

    def test_paid_variable_expenses_solo_status_paid(self, db):
        VariableExpense.objects.create(
            amount=Decimal("100"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5), status=VariableExpense.STATUS_PAID,
        )
        VariableExpense.objects.create(
            amount=Decimal("300"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 10), status=VariableExpense.STATUS_COMMITTED,
        )
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["paid_variable_expenses"] == pytest.approx(100.0)

    def test_committed_variable_expenses_solo_status_committed(self, db):
        VariableExpense.objects.create(
            amount=Decimal("100"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5), status=VariableExpense.STATUS_PAID,
        )
        VariableExpense.objects.create(
            amount=Decimal("300"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 10), status=VariableExpense.STATUS_COMMITTED,
        )
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["committed_variable_expenses"] == pytest.approx(300.0)

    def test_variable_expenses_total_incluye_paid_y_committed(self, db):
        VariableExpense.objects.create(
            amount=Decimal("100"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5), status=VariableExpense.STATUS_PAID,
        )
        VariableExpense.objects.create(
            amount=Decimal("300"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 10), status=VariableExpense.STATUS_COMMITTED,
        )
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["variable_expenses"] == pytest.approx(400.0)

    def test_committed_expenses_suma_committed_fijo_y_variable(self, db):
        FixedExpense.objects.create(
            name="Internet", category="services", budget_bucket="needs",
            monthly_amount=Decimal("80"), is_active=True,
        )
        VariableExpense.objects.create(
            amount=Decimal("150"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5), status=VariableExpense.STATUS_COMMITTED,
        )
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["committed_expenses"] == pytest.approx(230.0)

    def test_paid_y_committed_no_se_solapan(self, db):
        expense = FixedExpense.objects.create(
            name="Alquiler", category="home", budget_bucket="needs",
            monthly_amount=Decimal("400"), is_active=True,
        )
        FixedExpensePayment.objects.create(
            fixed_expense=expense, date=date(YEAR, MONTH, 1), amount=Decimal("400"),
        )
        FixedExpense.objects.create(
            name="Internet", category="services", budget_bucket="needs",
            monthly_amount=Decimal("80"), is_active=True,
        )
        VariableExpense.objects.create(
            amount=Decimal("200"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5), status=VariableExpense.STATUS_PAID,
        )
        VariableExpense.objects.create(
            amount=Decimal("100"), category="leisure", budget_bucket="wants",
            date=date(YEAR, MONTH, 8), status=VariableExpense.STATUS_COMMITTED,
        )
        summary = calculate_monthly_finance_summary(MONTH, YEAR)
        assert summary["paid_expenses"] == pytest.approx(600.0)    # 400 fixed + 200 paid var
        assert summary["committed_expenses"] == pytest.approx(180.0)  # 80 internet + 100 committed var


# ---------------------------------------------------------------------------
# _compute_category_breakdown — committed_variable_total
# ---------------------------------------------------------------------------

class TestComputeCategoryBreakdown:
    def test_variable_paid_va_a_variable_expense_total(self, db, settings_singleton):
        VariableExpense.objects.create(
            amount=Decimal("200"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5), status=VariableExpense.STATUS_PAID,
        )
        breakdown = _compute_category_breakdown(MONTH, YEAR, settings_singleton.get_config())
        food = next((e for e in breakdown if e["category"] == "food"), None)
        assert food is not None
        assert food["variable_expense_total"] == pytest.approx(200.0)
        assert food["committed_variable_total"] == pytest.approx(0.0)

    def test_variable_committed_va_a_committed_variable_total(self, db, settings_singleton):
        VariableExpense.objects.create(
            amount=Decimal("150"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 10), status=VariableExpense.STATUS_COMMITTED,
        )
        breakdown = _compute_category_breakdown(MONTH, YEAR, settings_singleton.get_config())
        food = next((e for e in breakdown if e["category"] == "food"), None)
        assert food is not None
        assert food["committed_variable_total"] == pytest.approx(150.0)
        assert food["variable_expense_total"] == pytest.approx(0.0)

    def test_actual_incluye_paid_y_committed(self, db, settings_singleton):
        VariableExpense.objects.create(
            amount=Decimal("100"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5), status=VariableExpense.STATUS_PAID,
        )
        VariableExpense.objects.create(
            amount=Decimal("200"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 10), status=VariableExpense.STATUS_COMMITTED,
        )
        breakdown = _compute_category_breakdown(MONTH, YEAR, settings_singleton.get_config())
        food = next((e for e in breakdown if e["category"] == "food"), None)
        assert food["actual"] == pytest.approx(300.0)

    def test_campo_committed_variable_total_presente_en_estructura(self, db, settings_singleton):
        VariableExpense.objects.create(
            amount=Decimal("50"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5),
        )
        breakdown = _compute_category_breakdown(MONTH, YEAR, settings_singleton.get_config())
        assert len(breakdown) > 0
        assert "committed_variable_total" in breakdown[0]


# ---------------------------------------------------------------------------
# _compute_category_breakdown — budget y remaining
# ---------------------------------------------------------------------------

class TestComputeCategoryBreakdownBudget:
    def _settings_with_budget(self, settings_singleton, category, budget):
        data = settings_singleton.get_config()
        for cat in data["categories"]:
            if cat["value"] == category:
                cat["monthly_budget"] = budget
        return data

    def test_sin_budget_devuelve_none(self, db, settings_singleton):
        VariableExpense.objects.create(
            amount=Decimal("200"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5), status=VariableExpense.STATUS_PAID,
        )
        breakdown = _compute_category_breakdown(MONTH, YEAR, settings_singleton.get_config())
        food = next((e for e in breakdown if e["category"] == "food"), None)
        assert food is not None
        assert food["budget"] is None
        assert food["remaining"] is None

    def test_con_budget_calcula_remaining_positivo(self, db, settings_singleton):
        settings_data = self._settings_with_budget(settings_singleton, "food", 500.0)
        VariableExpense.objects.create(
            amount=Decimal("200"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5), status=VariableExpense.STATUS_PAID,
        )
        breakdown = _compute_category_breakdown(MONTH, YEAR, settings_data)
        food = next((e for e in breakdown if e["category"] == "food"), None)
        assert food is not None
        assert food["budget"] == pytest.approx(500.0)
        assert food["remaining"] == pytest.approx(300.0)

    def test_remaining_negativo_cuando_excede_budget(self, db, settings_singleton):
        settings_data = self._settings_with_budget(settings_singleton, "food", 100.0)
        VariableExpense.objects.create(
            amount=Decimal("300"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5), status=VariableExpense.STATUS_PAID,
        )
        breakdown = _compute_category_breakdown(MONTH, YEAR, settings_data)
        food = next((e for e in breakdown if e["category"] == "food"), None)
        assert food is not None
        assert food["budget"] == pytest.approx(100.0)
        assert food["remaining"] == pytest.approx(-200.0)

    def test_budget_cero_tratado_como_sin_budget(self, db, settings_singleton):
        settings_data = self._settings_with_budget(settings_singleton, "food", 0)
        VariableExpense.objects.create(
            amount=Decimal("200"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5), status=VariableExpense.STATUS_PAID,
        )
        breakdown = _compute_category_breakdown(MONTH, YEAR, settings_data)
        food = next((e for e in breakdown if e["category"] == "food"), None)
        assert food is not None
        assert food["budget"] is None
        assert food["remaining"] is None

    def test_budget_aplica_solo_a_la_categoria_correcta(self, db, settings_singleton):
        settings_data = self._settings_with_budget(settings_singleton, "food", 400.0)
        VariableExpense.objects.create(
            amount=Decimal("100"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5), status=VariableExpense.STATUS_PAID,
        )
        VariableExpense.objects.create(
            amount=Decimal("50"), category="leisure", budget_bucket="wants",
            date=date(YEAR, MONTH, 6), status=VariableExpense.STATUS_PAID,
        )
        breakdown = _compute_category_breakdown(MONTH, YEAR, settings_data)
        food = next((e for e in breakdown if e["category"] == "food"), None)
        leisure = next((e for e in breakdown if e["category"] == "leisure"), None)
        assert food["budget"] == pytest.approx(400.0)
        assert food["remaining"] == pytest.approx(300.0)
        assert leisure["budget"] is None
        assert leisure["remaining"] is None
