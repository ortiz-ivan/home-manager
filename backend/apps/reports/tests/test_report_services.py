from datetime import date
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.expenses.models import FixedExpense, FixedExpensePayment, Income, VariableExpense
from apps.purchases.models import Product, ProductRestock
from apps.reports.models import FinancialEvent, MonthlyClose
from apps.reports.services import (
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
