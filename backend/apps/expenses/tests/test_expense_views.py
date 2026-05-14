from datetime import date
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.expenses.models import FixedExpense, Income, VariableExpense

INCOMES_BASE = "/api/v1/incomes/"
VAR_BASE = "/api/v1/variable-expenses/"
FIXED_BASE = "/api/v1/fixed-expenses/"


def _current_period():
    today = timezone.localdate()
    return {"month": today.month, "year": today.year}


@pytest.fixture
def income(db):
    return Income.objects.create(amount=Decimal("1000"), source="Trabajo")


@pytest.fixture
def variable_expense(db):
    return VariableExpense.objects.create(
        amount=Decimal("200"),
        category="leisure",
        description="Cine",
    )


@pytest.fixture
def fixed_expense(db):
    return FixedExpense.objects.create(
        name="Alquiler",
        category="home",
        monthly_amount=Decimal("500"),
    )


# ---------------------------------------------------------------------------
# Ingresos
# ---------------------------------------------------------------------------

class TestIncomeView:
    def test_lista_ingresos_del_periodo_activo(self, api, income):
        response = api.get(INCOMES_BASE, _current_period())
        assert response.status_code == 200
        assert any(i["source"] == "Trabajo" for i in response.data["results"])

    def test_no_incluye_ingresos_de_otro_mes(self, api, db):
        Income.objects.create(amount=Decimal("500"), date=date(2020, 1, 1))
        response = api.get(INCOMES_BASE, _current_period())
        assert response.status_code == 200
        assert len(response.data["results"]) == 0

    def test_crea_ingreso(self, api, db):
        payload = {"amount": "1500", "source": "Freelance"}
        response = api.post(INCOMES_BASE, payload, format="json")
        assert response.status_code == 201
        assert response.data["source"] == "Freelance"
        assert Income.objects.filter(source="Freelance").exists()

    def test_monto_obligatorio_retorna_400(self, api, db):
        response = api.post(INCOMES_BASE, {"source": "X"}, format="json")
        assert response.status_code == 400

    def test_actualiza_ingreso(self, api, income):
        response = api.patch(
            f"{INCOMES_BASE}{income.pk}/",
            {"amount": "2000", "change_reason": "corrección"},
            format="json",
        )
        assert response.status_code == 200
        income.refresh_from_db()
        assert income.amount == Decimal("2000")

    def test_elimina_ingreso(self, api, income):
        response = api.delete(
            f"{INCOMES_BASE}{income.pk}/",
            {"change_reason": "duplicado"},
            format="json",
        )
        assert response.status_code == 204
        assert not Income.objects.filter(pk=income.pk).exists()


# ---------------------------------------------------------------------------
# Gastos variables
# ---------------------------------------------------------------------------

class TestVariableExpenseView:
    def test_lista_gastos_del_periodo_activo(self, api, variable_expense):
        response = api.get(VAR_BASE, _current_period())
        assert response.status_code == 200
        assert any(e["description"] == "Cine" for e in response.data["results"])

    def test_crea_gasto_variable(self, api, db):
        payload = {"amount": "150", "category": "mobility", "description": "Bus"}
        response = api.post(VAR_BASE, payload, format="json")
        assert response.status_code == 201
        assert response.data["category"] == "mobility"

    def test_categoria_invalida_retorna_400(self, api, db):
        payload = {"amount": "100", "category": "categoria_inventada"}
        response = api.post(VAR_BASE, payload, format="json")
        assert response.status_code == 400

    def test_elimina_gasto_variable(self, api, variable_expense):
        response = api.delete(
            f"{VAR_BASE}{variable_expense.pk}/",
            {"change_reason": "error de carga"},
            format="json",
        )
        assert response.status_code == 204


# ---------------------------------------------------------------------------
# Gastos fijos
# ---------------------------------------------------------------------------

class TestFixedExpenseView:
    def test_lista_solo_activos(self, api, fixed_expense, db):
        FixedExpense.objects.create(
            name="Archivado",
            category="home",
            monthly_amount=Decimal("100"),
            is_active=False,
        )
        response = api.get(FIXED_BASE)
        assert response.status_code == 200
        names = [e["name"] for e in response.data["results"]]
        assert "Alquiler" in names
        assert "Archivado" not in names

    def test_archived_retorna_inactivos(self, api, db):
        FixedExpense.objects.create(
            name="Archivado",
            category="home",
            monthly_amount=Decimal("100"),
            is_active=False,
        )
        response = api.get(f"{FIXED_BASE}archived/")
        assert response.status_code == 200
        assert len(response.data) == 1

    def test_crea_gasto_fijo(self, api, db):
        payload = {"name": "Internet", "category": "services", "monthly_amount": "80"}
        response = api.post(FIXED_BASE, payload, format="json")
        assert response.status_code == 201
        assert FixedExpense.objects.filter(name="Internet").exists()

    def test_registra_pago(self, api, fixed_expense):
        response = api.post(
            f"{FIXED_BASE}{fixed_expense.pk}/pay/",
            {"change_reason": "pago mayo"},
            format="json",
        )
        assert response.status_code == 200
        assert "fixed_expense" in response.data

    def test_pago_duplicado_retorna_400(self, api, fixed_expense):
        api.post(f"{FIXED_BASE}{fixed_expense.pk}/pay/", {"change_reason": "p1"}, format="json")
        response = api.post(
            f"{FIXED_BASE}{fixed_expense.pk}/pay/",
            {"change_reason": "p2"},
            format="json",
        )
        assert response.status_code == 400
