from datetime import date
from decimal import Decimal

import pytest

from apps.expenses.models import FixedExpense, FixedExpensePayment, Income, VariableExpense
from apps.expenses.services import (
    create_fixed_expense_record,
    create_income_record,
    create_variable_expense_record,
    delete_fixed_expense_record,
    delete_income_record,
    delete_variable_expense_record,
    register_payment,
    update_fixed_expense_record,
    update_income_record,
    update_variable_expense_record,
)
from apps.reports.models import FinancialEvent


# ---------------------------------------------------------------------------
# Ingresos
# ---------------------------------------------------------------------------

class TestCreateIncomeRecord:
    def test_crea_ingreso(self, db):
        income = create_income_record({"amount": Decimal("1000"), "source": "Trabajo"})
        assert income.pk is not None
        assert income.amount == Decimal("1000")
        assert income.source == "Trabajo"

    def test_registra_evento_financiero(self, db):
        income = create_income_record({"amount": Decimal("500"), "source": "Freelance"})
        evento = FinancialEvent.objects.filter(
            entity_type="income", action="created", entity_id=income.id
        ).first()
        assert evento is not None
        assert evento.amount == Decimal("500")

    def test_usa_fecha_de_hoy_si_no_se_provee(self, db):
        from django.utils import timezone
        income = create_income_record({"amount": Decimal("100"), "source": ""})
        assert income.date == timezone.localdate()

    def test_respeta_fecha_provista(self, db):
        income = create_income_record({"amount": Decimal("100"), "date": date(2025, 3, 15)})
        assert income.date == date(2025, 3, 15)

    def test_strips_source_and_notes(self, db):
        income = create_income_record({"amount": Decimal("100"), "source": "  Trabajo  ", "notes": "  ok  "})
        assert income.source == "Trabajo"
        assert income.notes == "ok"


class TestUpdateIncomeRecord:
    def _make(self, db):
        return create_income_record({"amount": Decimal("100"), "source": "A"})

    def test_actualiza_campos(self, db):
        income = self._make(db)
        update_income_record(income, {"amount": Decimal("999"), "source": "B"}, change_reason="Corrección")
        assert income.amount == Decimal("999")
        assert income.source == "B"

    def test_requiere_motivo(self, db):
        income = self._make(db)
        with pytest.raises(ValueError, match="motivo"):
            update_income_record(income, {"amount": Decimal("200")}, change_reason="")

    def test_registra_snapshots_antes_y_despues(self, db):
        income = self._make(db)
        update_income_record(income, {"amount": Decimal("200")}, change_reason="Test")
        evento = FinancialEvent.objects.filter(entity_type="income", action="updated").first()
        assert evento.previous_data["amount"] == 100.0
        assert evento.current_data["amount"] == 200.0


class TestDeleteIncomeRecord:
    def _make(self, db):
        return create_income_record({"amount": Decimal("100"), "source": "X"})

    def test_elimina_el_ingreso(self, db):
        income = self._make(db)
        income_id = income.id
        delete_income_record(income, change_reason="Prueba")
        assert not Income.objects.filter(pk=income_id).exists()

    def test_requiere_motivo(self, db):
        income = self._make(db)
        with pytest.raises(ValueError, match="motivo"):
            delete_income_record(income, change_reason="")

    def test_registra_evento_deleted(self, db):
        income = self._make(db)
        income_id = income.id
        delete_income_record(income, change_reason="Prueba")
        evento = FinancialEvent.objects.filter(
            entity_type="income", action="deleted", entity_id=income_id
        ).first()
        assert evento is not None


# ---------------------------------------------------------------------------
# Gastos variables
# ---------------------------------------------------------------------------

def _variable_payload(**kwargs):
    base = {
        "amount": Decimal("50"),
        "category": "food",
        "budget_bucket": "needs",
        "description": "Supermercado",
    }
    base.update(kwargs)
    return base


class TestCreateVariableExpenseRecord:
    def test_crea_gasto_variable(self, db):
        expense = create_variable_expense_record(_variable_payload())
        assert expense.pk is not None
        assert expense.amount == Decimal("50")

    def test_registra_evento_financiero(self, db):
        expense = create_variable_expense_record(_variable_payload())
        evento = FinancialEvent.objects.filter(
            entity_type="variable_expense", action="created", entity_id=expense.id
        ).first()
        assert evento is not None

    def test_strips_description_and_notes(self, db):
        expense = create_variable_expense_record(
            _variable_payload(description="  mercado  ", notes="  compra  ")
        )
        assert expense.description == "mercado"
        assert expense.notes == "compra"


class TestUpdateVariableExpenseRecord:
    def _make(self, db):
        return create_variable_expense_record(_variable_payload())

    def test_actualiza_campos(self, db):
        expense = self._make(db)
        update_variable_expense_record(expense, {"amount": Decimal("99")}, change_reason="Corrección")
        assert expense.amount == Decimal("99")

    def test_requiere_motivo(self, db):
        expense = self._make(db)
        with pytest.raises(ValueError, match="motivo"):
            update_variable_expense_record(expense, {"amount": Decimal("99")}, change_reason="")


class TestDeleteVariableExpenseRecord:
    def _make(self, db):
        return create_variable_expense_record(_variable_payload())

    def test_elimina_el_gasto(self, db):
        expense = self._make(db)
        expense_id = expense.id
        delete_variable_expense_record(expense, change_reason="Test")
        assert not VariableExpense.objects.filter(pk=expense_id).exists()

    def test_requiere_motivo(self, db):
        expense = self._make(db)
        with pytest.raises(ValueError, match="motivo"):
            delete_variable_expense_record(expense, change_reason="")


# ---------------------------------------------------------------------------
# Gastos fijos
# ---------------------------------------------------------------------------

def _fixed_payload(**kwargs):
    base = {
        "name": "Alquiler",
        "category": "home",
        "budget_bucket": "needs",
        "monthly_amount": Decimal("500"),
    }
    base.update(kwargs)
    return base


class TestCreateFixedExpenseRecord:
    def test_crea_gasto_fijo(self, db):
        expense = create_fixed_expense_record(_fixed_payload())
        assert expense.pk is not None
        assert expense.monthly_amount == Decimal("500")

    def test_strips_nombre(self, db):
        expense = create_fixed_expense_record(_fixed_payload(name="  Alquiler  "))
        assert expense.name == "Alquiler"

    def test_registra_evento_financiero(self, db):
        expense = create_fixed_expense_record(_fixed_payload())
        evento = FinancialEvent.objects.filter(
            entity_type="fixed_expense", action="created", entity_id=expense.id
        ).first()
        assert evento is not None


class TestUpdateFixedExpenseRecord:
    def _make(self, db):
        return create_fixed_expense_record(_fixed_payload())

    def test_actualiza_campos(self, db):
        expense = self._make(db)
        update_fixed_expense_record(expense, {"monthly_amount": Decimal("600")}, change_reason="Ajuste")
        assert expense.monthly_amount == Decimal("600")

    def test_requiere_motivo(self, db):
        expense = self._make(db)
        with pytest.raises(ValueError, match="motivo"):
            update_fixed_expense_record(expense, {"monthly_amount": Decimal("600")}, change_reason="")

    def test_registra_evento_updated(self, db):
        expense = self._make(db)
        update_fixed_expense_record(expense, {"monthly_amount": Decimal("600")}, change_reason="Ajuste")
        evento = FinancialEvent.objects.filter(
            entity_type="fixed_expense", action="updated", entity_id=expense.id
        ).first()
        assert evento is not None


class TestDeleteFixedExpenseRecord:
    def _make(self, db):
        return create_fixed_expense_record(_fixed_payload())

    def test_elimina_el_gasto(self, db):
        expense = self._make(db)
        expense_id = expense.id
        delete_fixed_expense_record(expense, change_reason="Test")
        assert not FixedExpense.objects.filter(pk=expense_id).exists()

    def test_requiere_motivo(self, db):
        expense = self._make(db)
        with pytest.raises(ValueError, match="motivo"):
            delete_fixed_expense_record(expense, change_reason="")


# ---------------------------------------------------------------------------
# Registro de pago
# ---------------------------------------------------------------------------

class TestRegisterPayment:
    def _make_fixed_expense(self, next_due_date=None):
        return FixedExpense.objects.create(
            name="Agua",
            category="services",
            budget_bucket="needs",
            monthly_amount=Decimal("80"),
            next_due_date=next_due_date,
        )

    def test_crea_el_pago(self, db):
        expense = self._make_fixed_expense()
        result = register_payment(expense.id)
        assert result["payment"].pk is not None
        assert result["payment"].amount == Decimal("80")

    def test_registra_evento_financiero(self, db):
        expense = self._make_fixed_expense()
        register_payment(expense.id)
        evento = FinancialEvent.objects.filter(
            entity_type="fixed_expense_payment", action="payment_recorded"
        ).first()
        assert evento is not None

    def test_avanza_next_due_date_un_mes(self, db):
        due = date(2025, 3, 15)
        expense = self._make_fixed_expense(next_due_date=due)
        register_payment(expense.id)
        expense.refresh_from_db()
        assert expense.next_due_date == date(2025, 4, 15)

    def test_avanza_next_due_date_de_diciembre_a_enero(self, db):
        due = date(2025, 12, 1)
        expense = self._make_fixed_expense(next_due_date=due)
        register_payment(expense.id)
        expense.refresh_from_db()
        assert expense.next_due_date == date(2026, 1, 1)

    def test_no_cambia_next_due_date_si_es_none(self, db):
        expense = self._make_fixed_expense(next_due_date=None)
        register_payment(expense.id)
        expense.refresh_from_db()
        assert expense.next_due_date is None

    def test_lanza_error_en_pago_duplicado_del_mismo_mes(self, db):
        expense = self._make_fixed_expense()
        register_payment(expense.id)
        with pytest.raises(ValueError, match="ya fue registrado"):
            register_payment(expense.id)

    def test_payment_date_es_primer_dia_del_mes(self, db):
        from django.utils import timezone
        expense = self._make_fixed_expense()
        result = register_payment(expense.id)
        today = timezone.localdate()
        assert result["payment"].date == today.replace(day=1)
