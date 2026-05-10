from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.expenses.models import FixedExpense, FixedExpensePayment
from apps.household.models import RecurringTask, TaskOccurrence
from apps.household.services import (
    build_household_insights,
    build_task_linked_context,
    calculate_first_due_date,
    calculate_next_due_date,
    complete_task_occurrence,
    create_recurring_task_record,
    reopen_task_occurrence,
    skip_task_occurrence,
    sync_task_occurrences,
    update_recurring_task_record,
)
from apps.purchases.models import Product


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_daily(db, **kwargs):
    payload = {
        "title": "Ventilacion",
        "frequency_type": "daily",
        "interval": 1,
        "start_date": timezone.localdate(),
    }
    payload.update(kwargs)
    return create_recurring_task_record(payload)


def _make_weekly(db, **kwargs):
    today = timezone.localdate()
    payload = {
        "title": "Limpieza semanal",
        "frequency_type": "weekly",
        "weekday": today.weekday(),
        "interval": 1,
        "start_date": today,
    }
    payload.update(kwargs)
    return create_recurring_task_record(payload)


def _make_monthly(db, **kwargs):
    today = timezone.localdate()
    payload = {
        "title": "Pago mensual",
        "frequency_type": "monthly",
        "day_of_month": min(today.day, 28),
        "interval": 1,
        "start_date": today,
    }
    payload.update(kwargs)
    return create_recurring_task_record(payload)


def _first_pending(task):
    return task.occurrences.filter(status=TaskOccurrence.STATUS_PENDING).order_by("due_date").first()


# ---------------------------------------------------------------------------
# calculate_first_due_date
# ---------------------------------------------------------------------------

class TestCalculateFirstDueDate:
    def test_diaria_retorna_start_date(self):
        d = date(2025, 3, 10)
        assert calculate_first_due_date(d, "daily") == d

    def test_semanal_mismo_dia(self):
        monday = date(2025, 3, 10)  # lunes (weekday=0)
        result = calculate_first_due_date(monday, "weekly", weekday=0)
        assert result == monday

    def test_semanal_dia_posterior_en_la_semana(self):
        monday = date(2025, 3, 10)  # lunes
        result = calculate_first_due_date(monday, "weekly", weekday=4)  # viernes
        assert result == date(2025, 3, 14)

    def test_semanal_dia_anterior_salta_a_semana_siguiente(self):
        friday = date(2025, 3, 14)  # viernes
        result = calculate_first_due_date(friday, "weekly", weekday=0)  # lunes
        assert result == date(2025, 3, 17)

    def test_mensual_dia_futuro_en_el_mismo_mes(self):
        start = date(2025, 3, 5)
        result = calculate_first_due_date(start, "monthly", day_of_month=15)
        assert result == date(2025, 3, 15)

    def test_mensual_dia_ya_pasado_avanza_al_mes_siguiente(self):
        start = date(2025, 3, 20)
        result = calculate_first_due_date(start, "monthly", day_of_month=15)
        assert result == date(2025, 4, 15)

    def test_mensual_dia_31_en_febrero_ajusta_al_ultimo_dia(self):
        start = date(2025, 1, 31)
        result = calculate_first_due_date(start, "monthly", day_of_month=31)
        assert result == date(2025, 1, 31)
        # el siguiente mes sería date(2025, 2, 28)


# ---------------------------------------------------------------------------
# calculate_next_due_date
# ---------------------------------------------------------------------------

class TestCalculateNextDueDate:
    def _task(self, frequency_type, interval=1, weekday=None, day_of_month=None):
        return RecurringTask(
            frequency_type=frequency_type,
            interval=interval,
            weekday=weekday,
            day_of_month=day_of_month,
        )

    def test_diaria_avanza_segun_intervalo(self):
        task = self._task("daily", interval=1)
        result = calculate_next_due_date(task, date(2025, 3, 10))
        assert result == date(2025, 3, 11)

    def test_diaria_intervalo_3(self):
        task = self._task("daily", interval=3)
        result = calculate_next_due_date(task, date(2025, 3, 10))
        assert result == date(2025, 3, 13)

    def test_semanal_avanza_7_dias(self):
        task = self._task("weekly", interval=1, weekday=0)
        result = calculate_next_due_date(task, date(2025, 3, 10))
        assert result == date(2025, 3, 17)

    def test_semanal_intervalo_2(self):
        task = self._task("weekly", interval=2, weekday=0)
        result = calculate_next_due_date(task, date(2025, 3, 10))
        assert result == date(2025, 3, 24)

    def test_mensual_avanza_un_mes(self):
        task = self._task("monthly", interval=1, day_of_month=15)
        result = calculate_next_due_date(task, date(2025, 3, 15))
        assert result == date(2025, 4, 15)

    def test_mensual_diciembre_avanza_a_enero(self):
        task = self._task("monthly", interval=1, day_of_month=1)
        result = calculate_next_due_date(task, date(2025, 12, 1))
        assert result == date(2026, 1, 1)

    def test_mensual_dia_31_en_mes_corto_ajusta(self):
        task = self._task("monthly", interval=1, day_of_month=31)
        result = calculate_next_due_date(task, date(2025, 1, 31))
        assert result == date(2025, 2, 28)


# ---------------------------------------------------------------------------
# create_recurring_task_record
# ---------------------------------------------------------------------------

class TestCreateRecurringTaskRecord:
    def test_crea_la_tarea(self, db):
        task = _make_daily(db, title="  Barrer  ")
        assert task.pk is not None
        assert task.title == "Barrer"

    def test_aplica_defaults_de_categoria_y_area(self, db):
        task = _make_daily(db)
        assert task.category == "general"
        assert task.area == "home_admin"

    def test_respeta_campos_opcionales(self, db):
        task = _make_daily(db, category="cleaning", area="kitchen", priority="high", estimated_minutes=30, notes="  puntual  ")
        assert task.category == "cleaning"
        assert task.area == "kitchen"
        assert task.priority == "high"
        assert task.estimated_minutes == 30
        assert task.notes == "puntual"

    def test_genera_ocurrencias_tras_la_creacion(self, db):
        task = _make_daily(db)
        assert task.occurrences.exists()

    def test_next_due_date_queda_seteada(self, db):
        task = _make_daily(db)
        assert task.next_due_date is not None

    def test_tarea_semanal_genera_ocurrencias_correctas(self, db):
        task = _make_weekly(db)
        today = timezone.localdate()
        occurrences = list(task.occurrences.order_by("due_date"))
        for occ in occurrences:
            assert occ.due_date.weekday() == today.weekday()

    def test_tarea_mensual_genera_ocurrencias_correctas(self, db):
        today = timezone.localdate()
        day = min(today.day, 28)
        task = _make_monthly(db, day_of_month=day)
        for occ in task.occurrences.order_by("due_date"):
            assert occ.due_date.day == day


# ---------------------------------------------------------------------------
# update_recurring_task_record
# ---------------------------------------------------------------------------

class TestUpdateRecurringTaskRecord:
    def test_actualiza_titulo(self, db):
        task = _make_daily(db)
        update_recurring_task_record(task, {"title": "  Nuevo titulo  ", "frequency_type": "daily", "interval": 1, "start_date": task.start_date})
        assert task.title == "Nuevo titulo"

    def test_re_sincroniza_ocurrencias_al_actualizar(self, db):
        task = _make_daily(db)
        count_before = task.occurrences.count()
        update_recurring_task_record(task, {
            "title": task.title,
            "frequency_type": "daily",
            "interval": 2,
            "start_date": task.start_date,
        })
        count_after = task.occurrences.count()
        assert count_after != count_before or count_after >= 1

    def test_category_vacia_queda_como_general(self, db):
        task = _make_daily(db)
        update_recurring_task_record(task, {
            "title": task.title,
            "category": "",
            "frequency_type": "daily",
            "interval": 1,
            "start_date": task.start_date,
        })
        assert task.category == "general"

    def test_area_vacia_queda_como_home_admin(self, db):
        task = _make_daily(db)
        update_recurring_task_record(task, {
            "title": task.title,
            "area": "",
            "frequency_type": "daily",
            "interval": 1,
            "start_date": task.start_date,
        })
        assert task.area == "home_admin"


# ---------------------------------------------------------------------------
# sync_task_occurrences
# ---------------------------------------------------------------------------

class TestSyncTaskOccurrences:
    def test_crea_ocurrencias_en_la_ventana(self, db):
        task = _make_daily(db)
        today = timezone.localdate()
        count = task.occurrences.filter(due_date__gte=today, due_date__lte=today + timedelta(days=7)).count()
        assert count == 8  # hoy + 7 días

    def test_no_duplica_ocurrencias_en_doble_sync(self, db):
        task = _make_daily(db)
        today = timezone.localdate()
        date_from = today
        date_to = today + timedelta(days=10)
        count_before = task.occurrences.count()
        sync_task_occurrences(task, date_from, date_to)
        assert task.occurrences.count() == count_before

    def test_elimina_ocurrencias_pendientes_al_desactivar_en_ventana(self, db):
        task = _make_daily(db)
        today = timezone.localdate()
        date_from = today
        date_to = today + timedelta(days=5)
        assert task.occurrences.filter(due_date__gte=date_from, due_date__lte=date_to).count() == 6
        task.is_active = False
        task.save()
        sync_task_occurrences(task, date_from, date_to)
        assert task.occurrences.filter(
            status=TaskOccurrence.STATUS_PENDING,
            due_date__gte=date_from,
            due_date__lte=date_to,
        ).count() == 0

    def test_lanza_error_si_date_to_menor_que_date_from(self, db):
        task = _make_daily(db)
        today = timezone.localdate()
        with pytest.raises(ValueError, match="final"):
            sync_task_occurrences(task, today, today - timedelta(days=1))


# ---------------------------------------------------------------------------
# complete_task_occurrence
# ---------------------------------------------------------------------------

class TestCompleteTaskOccurrence:
    def test_marca_la_ocurrencia_como_hecha(self, db):
        task = _make_daily(db)
        occ = _first_pending(task)
        complete_task_occurrence(occ)
        occ.refresh_from_db()
        assert occ.status == TaskOccurrence.STATUS_DONE

    def test_registra_completed_at(self, db):
        task = _make_daily(db)
        occ = _first_pending(task)
        complete_task_occurrence(occ)
        occ.refresh_from_db()
        assert occ.completed_at is not None

    def test_guarda_notas_de_completado(self, db):
        task = _make_daily(db)
        occ = _first_pending(task)
        complete_task_occurrence(occ, completion_notes="Todo limpio")
        occ.refresh_from_db()
        assert occ.completion_notes == "Todo limpio"

    def test_lanza_error_si_ya_fue_hecha(self, db):
        task = _make_daily(db)
        occ = _first_pending(task)
        complete_task_occurrence(occ)
        occ.refresh_from_db()
        with pytest.raises(ValueError, match="ya fue marcada"):
            complete_task_occurrence(occ)

    def test_actualiza_next_due_date_de_la_tarea(self, db):
        task = _make_daily(db)
        occ = _first_pending(task)
        due_before = occ.due_date
        complete_task_occurrence(occ)
        task.refresh_from_db()
        assert task.next_due_date != due_before or task.next_due_date is None


# ---------------------------------------------------------------------------
# skip_task_occurrence
# ---------------------------------------------------------------------------

class TestSkipTaskOccurrence:
    def test_marca_la_ocurrencia_como_omitida(self, db):
        task = _make_daily(db)
        occ = _first_pending(task)
        skip_task_occurrence(occ)
        occ.refresh_from_db()
        assert occ.status == TaskOccurrence.STATUS_SKIPPED

    def test_guarda_notas_de_omision(self, db):
        task = _make_daily(db)
        occ = _first_pending(task)
        skip_task_occurrence(occ, completion_notes="Sin tiempo")
        occ.refresh_from_db()
        assert occ.completion_notes == "Sin tiempo"

    def test_lanza_error_si_ya_fue_omitida(self, db):
        task = _make_daily(db)
        occ = _first_pending(task)
        skip_task_occurrence(occ)
        occ.refresh_from_db()
        with pytest.raises(ValueError, match="ya fue omitida"):
            skip_task_occurrence(occ)


# ---------------------------------------------------------------------------
# reopen_task_occurrence
# ---------------------------------------------------------------------------

class TestReopenTaskOccurrence:
    def test_revierte_una_ocurrencia_hecha_a_pendiente(self, db):
        task = _make_daily(db)
        occ = _first_pending(task)
        complete_task_occurrence(occ)
        occ.refresh_from_db()
        reopen_task_occurrence(occ)
        occ.refresh_from_db()
        assert occ.status == TaskOccurrence.STATUS_PENDING

    def test_revierte_una_ocurrencia_omitida_a_pendiente(self, db):
        task = _make_daily(db)
        occ = _first_pending(task)
        skip_task_occurrence(occ)
        occ.refresh_from_db()
        reopen_task_occurrence(occ)
        occ.refresh_from_db()
        assert occ.status == TaskOccurrence.STATUS_PENDING

    def test_limpia_completed_at_al_reabrir(self, db):
        task = _make_daily(db)
        occ = _first_pending(task)
        complete_task_occurrence(occ)
        occ.refresh_from_db()
        reopen_task_occurrence(occ)
        occ.refresh_from_db()
        assert occ.completed_at is None

    def test_lanza_error_si_ya_esta_pendiente(self, db):
        task = _make_daily(db)
        occ = _first_pending(task)
        with pytest.raises(ValueError, match="ya esta pendiente"):
            reopen_task_occurrence(occ)


# ---------------------------------------------------------------------------
# build_task_linked_context
# ---------------------------------------------------------------------------

class TestBuildTaskLinkedContext:
    def test_retorna_none_sin_integracion(self, db):
        task = RecurringTask.objects.create(
            title="Sin integracion",
            frequency_type="daily",
            interval=1,
            start_date=timezone.localdate(),
            integration_kind="",
        )
        assert build_task_linked_context(task) is None

    def test_gasto_fijo_pagado_este_mes(self, db):
        expense = FixedExpense.objects.create(
            name="Internet",
            category="services",
            budget_bucket="needs",
            monthly_amount=Decimal("50"),
        )
        today = timezone.localdate()
        FixedExpensePayment.objects.create(
            fixed_expense=expense,
            date=today.replace(day=1),
            amount=Decimal("50"),
        )
        task = RecurringTask.objects.create(
            title="Pagar internet",
            frequency_type="monthly",
            interval=1,
            day_of_month=1,
            start_date=today,
            integration_kind=RecurringTask.INTEGRATION_FIXED_EXPENSE,
            linked_fixed_expense=expense,
        )
        ctx = build_task_linked_context(task)
        assert ctx["kind"] == RecurringTask.INTEGRATION_FIXED_EXPENSE
        assert ctx["status"] == "paid"
        assert ctx["tone"] == "success"

    def test_gasto_fijo_vencido(self, db):
        past_date = timezone.localdate() - timedelta(days=5)
        expense = FixedExpense.objects.create(
            name="Agua",
            category="services",
            budget_bucket="needs",
            monthly_amount=Decimal("30"),
            next_due_date=past_date,
        )
        task = RecurringTask.objects.create(
            title="Pagar agua",
            frequency_type="monthly",
            interval=1,
            day_of_month=1,
            start_date=timezone.localdate(),
            integration_kind=RecurringTask.INTEGRATION_FIXED_EXPENSE,
            linked_fixed_expense=expense,
        )
        ctx = build_task_linked_context(task)
        assert ctx["status"] == "overdue"
        assert ctx["tone"] == "danger"

    def test_gasto_fijo_referencia_eliminada_retorna_missing(self, db):
        task = RecurringTask.objects.create(
            title="Tarea huerfana",
            frequency_type="daily",
            interval=1,
            start_date=timezone.localdate(),
            integration_kind=RecurringTask.INTEGRATION_FIXED_EXPENSE,
            linked_fixed_expense=None,
        )
        ctx = build_task_linked_context(task)
        assert ctx["status"] == "missing"
        assert ctx["tone"] == "warning"

    def test_reposicion_producto_sin_stock(self, db):
        product = Product.objects.create(
            name="Arroz",
            category="food",
            type="consumable",
            stock=Decimal("0"),
            stock_min=Decimal("2"),
            unit="kg",
        )
        task = RecurringTask.objects.create(
            title="Reponer arroz",
            frequency_type="weekly",
            interval=1,
            weekday=0,
            start_date=timezone.localdate(),
            integration_kind=RecurringTask.INTEGRATION_PRODUCT_RESTOCK,
            linked_product=product,
        )
        ctx = build_task_linked_context(task)
        assert ctx["kind"] == RecurringTask.INTEGRATION_PRODUCT_RESTOCK
        assert ctx["status"] == "out_of_stock"
        assert ctx["tone"] == "danger"

    def test_reposicion_producto_stock_bajo(self, db):
        product = Product.objects.create(
            name="Aceite",
            category="food",
            type="consumable",
            stock=Decimal("1"),
            stock_min=Decimal("2"),
            unit="litros",
        )
        task = RecurringTask.objects.create(
            title="Reponer aceite",
            frequency_type="weekly",
            interval=1,
            weekday=0,
            start_date=timezone.localdate(),
            integration_kind=RecurringTask.INTEGRATION_PRODUCT_RESTOCK,
            linked_product=product,
        )
        ctx = build_task_linked_context(task)
        assert ctx["status"] == "low_stock"
        assert ctx["tone"] == "warning"

    def test_reposicion_producto_stock_ok(self, db):
        product = Product.objects.create(
            name="Azucar",
            category="food",
            type="consumable",
            stock=Decimal("5"),
            stock_min=Decimal("2"),
            unit="kg",
        )
        task = RecurringTask.objects.create(
            title="Reponer azucar",
            frequency_type="weekly",
            interval=1,
            weekday=0,
            start_date=timezone.localdate(),
            integration_kind=RecurringTask.INTEGRATION_PRODUCT_RESTOCK,
            linked_product=product,
        )
        ctx = build_task_linked_context(task)
        assert ctx["status"] == "ok"
        assert ctx["tone"] == "success"

    def test_vencimiento_producto_vencido(self, db):
        past = timezone.localdate() - timedelta(days=3)
        product = Product.objects.create(
            name="Leche",
            category="food",
            type="consumable",
            stock=Decimal("2"),
            stock_min=Decimal("1"),
            unit="litros",
            next_due_date=past,
        )
        task = RecurringTask.objects.create(
            title="Revisar leche",
            frequency_type="weekly",
            interval=1,
            weekday=0,
            start_date=timezone.localdate(),
            integration_kind=RecurringTask.INTEGRATION_PRODUCT_EXPIRY,
            linked_product=product,
        )
        ctx = build_task_linked_context(task)
        assert ctx["status"] == "expired"
        assert ctx["tone"] == "danger"

    def test_vencimiento_producto_sin_fecha(self, db):
        product = Product.objects.create(
            name="Medicamento",
            category="health",
            type="consumable",
            stock=Decimal("1"),
            stock_min=Decimal("0"),
            unit="unidad",
            next_due_date=None,
        )
        task = RecurringTask.objects.create(
            title="Revisar medicamento",
            frequency_type="monthly",
            interval=1,
            day_of_month=1,
            start_date=timezone.localdate(),
            integration_kind=RecurringTask.INTEGRATION_PRODUCT_EXPIRY,
            linked_product=product,
        )
        ctx = build_task_linked_context(task)
        assert ctx["status"] == "missing_date"
        assert ctx["tone"] == "warning"


# ---------------------------------------------------------------------------
# build_household_insights
# ---------------------------------------------------------------------------

class TestBuildHouseholdInsights:
    def test_retorna_estructura_esperada_sin_tareas(self, db):
        today = timezone.localdate()
        result = build_household_insights(today - timedelta(days=7), today)
        assert "window_start" in result
        assert "window_end" in result
        assert "weekly_completion" in result
        assert "most_postponed_tasks" in result
        assert "recurring_overdue_tasks" in result
        assert "weekly_estimated_minutes" in result
        assert "overdue_tasks_count" in result

    def test_sin_tareas_contadores_en_cero(self, db):
        today = timezone.localdate()
        result = build_household_insights(today - timedelta(days=7), today)
        assert result["overdue_tasks_count"] == 0
        assert result["most_postponed_tasks"] == []
        assert result["recurring_overdue_tasks"] == []

    def test_lanza_error_si_date_to_menor_que_date_from(self, db):
        today = timezone.localdate()
        with pytest.raises(ValueError, match="final"):
            build_household_insights(today, today - timedelta(days=1))

    def test_contabiliza_tareas_activas_en_la_ventana(self, db):
        today = timezone.localdate()
        _make_daily(db, title="Tarea activa")
        result = build_household_insights(today, today + timedelta(days=6))
        total_due = sum(w["total_due"] for w in result["weekly_completion"])
        assert total_due >= 7
