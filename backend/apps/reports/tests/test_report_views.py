from decimal import Decimal

import pytest
from django.utils import timezone

from apps.expenses.models import FixedExpense, FixedExpensePayment, Income, VariableExpense
from apps.purchases.models import Product, ProductRestock
from apps.reports.models import MonthlyClose

SUMMARY_URL = "/api/v1/monthly-finance-summary/"
EVENTS_URL = "/api/v1/financial-events/"
CLOSES_URL = "/api/v1/monthly-closes/"


def _current_period():
    today = timezone.localdate()
    return {"month": today.month, "year": today.year}


# ---------------------------------------------------------------------------
# Resumen financiero mensual
# ---------------------------------------------------------------------------

class TestMonthlyFinanceSummaryView:
    def test_retorna_estructura_completa(self, api, db):
        response = api.get(SUMMARY_URL, _current_period())
        assert response.status_code == 200
        expected_keys = {
            "month", "year", "total_income", "estimated_expenses",
            "remaining_balance", "rule_50_30_20", "category_breakdown",
        }
        assert expected_keys <= set(response.data.keys())

    def test_contabiliza_ingresos_del_mes(self, api, db):
        today = timezone.localdate()
        Income.objects.create(amount=Decimal("3000"), date=today)
        response = api.get(SUMMARY_URL, _current_period())
        assert response.status_code == 200
        assert response.data["total_income"] == 3000.0

    def test_category_breakdown_incluye_gastos_variables(self, api, db):
        today = timezone.localdate()
        VariableExpense.objects.create(amount=Decimal("500"), category="leisure", date=today)
        response = api.get(SUMMARY_URL, _current_period())
        assert response.status_code == 200
        breakdown = response.data["category_breakdown"]
        leisure_entry = next((c for c in breakdown if c["category"] == "leisure"), None)
        assert leisure_entry is not None
        assert leisure_entry["variable_expense_total"] == 500.0

    def test_category_breakdown_incluye_pagos_fijos(self, api, db):
        today = timezone.localdate()
        expense = FixedExpense.objects.create(
            name="Alquiler", category="home", monthly_amount=Decimal("800")
        )
        FixedExpensePayment.objects.create(
            fixed_expense=expense, amount=Decimal("800"), date=today
        )
        response = api.get(SUMMARY_URL, _current_period())
        assert response.status_code == 200
        breakdown = response.data["category_breakdown"]
        home_entry = next((c for c in breakdown if c["category"] == "home"), None)
        assert home_entry is not None
        assert home_entry["fixed_payment_total"] == 800.0

    def test_category_breakdown_incluye_reposiciones(self, api, db):
        today = timezone.localdate()
        product = Product.objects.create(name="Arroz", category="food", type="consumable")
        ProductRestock.objects.create(product=product, quantity=Decimal("2"), unit_cost=Decimal("50"), date=today)
        response = api.get(SUMMARY_URL, _current_period())
        assert response.status_code == 200
        breakdown = response.data["category_breakdown"]
        food_entry = next((c for c in breakdown if c["category"] == "food"), None)
        assert food_entry is not None
        assert food_entry["product_restock_total"] == 100.0

    def test_mes_invalido_retorna_400(self, api, db):
        response = api.get(SUMMARY_URL, {"month": "13", "year": "2025"})
        assert response.status_code == 400

    def test_rule_50_30_20_tiene_targets_actuals_variance(self, api, db):
        response = api.get(SUMMARY_URL, _current_period())
        assert response.status_code == 200
        rule = response.data["rule_50_30_20"]
        assert "targets" in rule
        assert "actuals" in rule
        assert "variance" in rule


# ---------------------------------------------------------------------------
# Eventos financieros
# ---------------------------------------------------------------------------

class TestFinancialEventListView:
    def test_lista_retorna_200(self, api, db):
        response = api.get(EVENTS_URL, _current_period())
        assert response.status_code == 200
        assert isinstance(response.data, list)

    def test_limit_param_respetado(self, api, db):
        from apps.expenses.services import create_income_record
        for i in range(5):
            create_income_record({"amount": Decimal("100"), "source": f"S{i}"})
        response = api.get(EVENTS_URL, {**_current_period(), "limit": "2"})
        assert response.status_code == 200
        assert len(response.data) <= 2


# ---------------------------------------------------------------------------
# Cierres mensuales
# ---------------------------------------------------------------------------

class TestMonthlyCloseView:
    def test_lista_retorna_200(self, api, db):
        response = api.get(CLOSES_URL)
        assert response.status_code == 200
        assert isinstance(response.data, list)

    def test_crea_cierre_mensual(self, api, db):
        payload = {"month": 1, "year": 2024, "notes": "Cierre de prueba"}
        response = api.post(CLOSES_URL, payload, format="json")
        assert response.status_code == 201
        assert MonthlyClose.objects.filter(month=1, year=2024).exists()

    def test_cierre_duplicado_retorna_400(self, api, db):
        api.post(CLOSES_URL, {"month": 2, "year": 2024}, format="json")
        response = api.post(CLOSES_URL, {"month": 2, "year": 2024}, format="json")
        assert response.status_code == 400
