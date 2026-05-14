from decimal import Decimal

import pytest

from apps.goals.models import SavingsGoal

BASE = "/api/v1/savings-goals/"


@pytest.fixture
def goal(db):
    return SavingsGoal.objects.create(
        name="Fondo emergencia",
        goal_type="savings",
        target_amount=Decimal("10000"),
    )


@pytest.fixture
def inactive_goal(db):
    return SavingsGoal.objects.create(
        name="Deuda vieja",
        goal_type="debt",
        target_amount=Decimal("5000"),
        is_active=False,
    )


# ---------------------------------------------------------------------------
# Lista y filtros
# ---------------------------------------------------------------------------

class TestSavingsGoalList:
    def test_lista_todas_las_metas(self, api, goal, inactive_goal):
        response = api.get(BASE)
        assert response.status_code == 200
        assert len(response.data["results"]) == 2

    def test_filtra_activas(self, api, goal, inactive_goal):
        response = api.get(BASE, {"is_active": "true"})
        assert response.status_code == 200
        assert all(g["is_active"] for g in response.data["results"])
        assert len(response.data["results"]) == 1

    def test_filtra_inactivas(self, api, goal, inactive_goal):
        response = api.get(BASE, {"is_active": "false"})
        assert response.status_code == 200
        assert not any(g["is_active"] for g in response.data["results"])

    def test_filtra_por_goal_type(self, api, goal, inactive_goal):
        response = api.get(BASE, {"goal_type": "debt"})
        assert response.status_code == 200
        assert all(g["goal_type"] == "debt" for g in response.data["results"])


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

class TestSavingsGoalCreate:
    def test_crea_meta(self, api, db):
        payload = {"name": "Viaje", "goal_type": "savings", "target_amount": "2000"}
        response = api.post(BASE, payload, format="json")
        assert response.status_code == 201
        assert response.data["name"] == "Viaje"
        assert SavingsGoal.objects.filter(name="Viaje").exists()

    def test_nombre_obligatorio_retorna_400(self, api, db):
        response = api.post(BASE, {"target_amount": "1000"}, format="json")
        assert response.status_code == 400

    def test_actualiza_meta(self, api, goal):
        response = api.patch(f"{BASE}{goal.pk}/", {"name": "Fondo renovado"}, format="json")
        assert response.status_code == 200
        goal.refresh_from_db()
        assert goal.name == "Fondo renovado"

    def test_elimina_meta(self, api, goal):
        response = api.delete(f"{BASE}{goal.pk}/")
        assert response.status_code == 204
        assert not SavingsGoal.objects.filter(pk=goal.pk).exists()


# ---------------------------------------------------------------------------
# Acción contribuir
# ---------------------------------------------------------------------------

class TestSavingsGoalContribute:
    def test_contribucion_incrementa_monto(self, api, goal):
        response = api.post(f"{BASE}{goal.pk}/contribute/", {"amount": "500"}, format="json")
        assert response.status_code == 200
        goal.refresh_from_db()
        assert goal.current_amount == Decimal("500")

    def test_contribucion_acumulativa(self, api, goal):
        api.post(f"{BASE}{goal.pk}/contribute/", {"amount": "300"}, format="json")
        api.post(f"{BASE}{goal.pk}/contribute/", {"amount": "200"}, format="json")
        goal.refresh_from_db()
        assert goal.current_amount == Decimal("500")

    def test_monto_invalido_retorna_400(self, api, goal):
        response = api.post(f"{BASE}{goal.pk}/contribute/", {"amount": "no_es_numero"}, format="json")
        assert response.status_code == 400

    def test_monto_negativo_retorna_400(self, api, goal):
        response = api.post(f"{BASE}{goal.pk}/contribute/", {"amount": "-100"}, format="json")
        assert response.status_code == 400
