from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.goals.models import SavingsGoal
from apps.goals.services import add_contribution, get_goal_progress


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_goal(db, **kwargs):
    defaults = {
        "name": "Fondo de emergencia",
        "goal_type": SavingsGoal.TYPE_SAVINGS,
        "target_amount": Decimal("1000"),
        "current_amount": Decimal("0"),
        "is_active": True,
    }
    defaults.update(kwargs)
    return SavingsGoal.objects.create(**defaults)


# ---------------------------------------------------------------------------
# add_contribution
# ---------------------------------------------------------------------------

class TestAddContribution:
    def test_incrementa_current_amount(self, db):
        goal = _make_goal(db)
        add_contribution(goal.id, Decimal("200"))
        goal.refresh_from_db()
        assert goal.current_amount == Decimal("200")

    def test_aportes_acumulativos(self, db):
        goal = _make_goal(db)
        add_contribution(goal.id, Decimal("300"))
        add_contribution(goal.id, Decimal("150"))
        goal.refresh_from_db()
        assert goal.current_amount == Decimal("450")

    def test_retorna_la_meta_actualizada(self, db):
        goal = _make_goal(db)
        updated = add_contribution(goal.id, Decimal("500"))
        assert updated.current_amount == Decimal("500")
        assert updated.pk == goal.pk

    def test_lanza_error_en_meta_inactiva(self, db):
        goal = _make_goal(db, is_active=False)
        with pytest.raises(ValueError, match="inactiva"):
            add_contribution(goal.id, Decimal("100"))

    def test_lanza_error_en_monto_cero(self, db):
        goal = _make_goal(db)
        with pytest.raises(ValueError, match="mayor a 0"):
            add_contribution(goal.id, Decimal("0"))

    def test_lanza_error_en_monto_negativo(self, db):
        goal = _make_goal(db)
        with pytest.raises(ValueError, match="mayor a 0"):
            add_contribution(goal.id, Decimal("-50"))

    def test_permite_superar_el_objetivo(self, db):
        goal = _make_goal(db, target_amount=Decimal("100"))
        add_contribution(goal.id, Decimal("150"))
        goal.refresh_from_db()
        assert goal.current_amount == Decimal("150")

    def test_funciona_con_meta_de_tipo_deuda(self, db):
        goal = _make_goal(db, goal_type=SavingsGoal.TYPE_DEBT, name="Deuda tarjeta")
        add_contribution(goal.id, Decimal("200"))
        goal.refresh_from_db()
        assert goal.current_amount == Decimal("200")

    def test_funciona_con_meta_de_tipo_compra_grande(self, db):
        goal = _make_goal(db, goal_type=SavingsGoal.TYPE_BIG_PURCHASE, name="Auto")
        add_contribution(goal.id, Decimal("5000"))
        goal.refresh_from_db()
        assert goal.current_amount == Decimal("5000")


# ---------------------------------------------------------------------------
# get_goal_progress
# ---------------------------------------------------------------------------

class TestGetGoalProgress:
    def test_retorna_todos_los_campos_esperados(self, db):
        goal = _make_goal(db)
        result = get_goal_progress(goal)
        assert "progress_pct" in result
        assert "remaining" in result
        assert "days_left" in result
        assert "is_completed" in result

    def test_progreso_cero_al_inicio(self, db):
        goal = _make_goal(db)
        result = get_goal_progress(goal)
        assert result["progress_pct"] == 0.0
        assert result["remaining"] == Decimal("1000")
        assert result["is_completed"] is False

    def test_progreso_parcial(self, db):
        goal = _make_goal(db, current_amount=Decimal("250"))
        result = get_goal_progress(goal)
        assert result["progress_pct"] == pytest.approx(25.0)
        assert result["remaining"] == Decimal("750")
        assert result["is_completed"] is False

    def test_progreso_al_100(self, db):
        goal = _make_goal(db, current_amount=Decimal("1000"))
        result = get_goal_progress(goal)
        assert result["progress_pct"] == 100.0
        assert result["remaining"] == Decimal("0")
        assert result["is_completed"] is True

    def test_progreso_no_supera_100_aunque_haya_excedente(self, db):
        goal = _make_goal(db, current_amount=Decimal("1200"))
        result = get_goal_progress(goal)
        assert result["progress_pct"] == 100.0
        assert result["is_completed"] is True

    def test_remaining_nunca_es_negativo(self, db):
        goal = _make_goal(db, current_amount=Decimal("1500"))
        result = get_goal_progress(goal)
        assert result["remaining"] == Decimal("0")

    def test_days_left_es_none_sin_fecha_objetivo(self, db):
        goal = _make_goal(db, target_date=None)
        result = get_goal_progress(goal)
        assert result["days_left"] is None

    def test_days_left_positivo_con_fecha_futura(self, db):
        future = timezone.localdate() + timedelta(days=30)
        goal = _make_goal(db, target_date=future)
        result = get_goal_progress(goal)
        assert result["days_left"] == 30

    def test_days_left_negativo_con_fecha_pasada(self, db):
        past = timezone.localdate() - timedelta(days=10)
        goal = _make_goal(db, target_date=past)
        result = get_goal_progress(goal)
        assert result["days_left"] == -10

    def test_objetivo_cero_no_divide_por_cero(self, db):
        goal = _make_goal(db, target_amount=Decimal("0"))
        result = get_goal_progress(goal)
        assert result["progress_pct"] == 0.0
