from datetime import date, timedelta

import pytest
from django.utils import timezone

from apps.household.models import RecurringTask, TaskOccurrence

TASKS_BASE = "/api/v1/recurring-tasks/"
OCCURRENCES_BASE = "/api/v1/task-occurrences/"
INSIGHTS_URL = "/api/v1/household-insights/"


@pytest.fixture
def task(db):
    today = timezone.localdate()
    return RecurringTask.objects.create(
        title="Limpiar cocina",
        category="cleaning",
        area="kitchen",
        priority="medium",
        frequency_type="weekly",
        weekday=today.weekday(),
    )


@pytest.fixture
def maintenance_task(db):
    today = timezone.localdate()
    return RecurringTask.objects.create(
        title="Revisar instalación",
        category="maintenance",
        area="home_admin",
        priority="high",
        frequency_type="monthly",
        day_of_month=today.day,
    )


@pytest.fixture
def occurrence(task):
    today = timezone.localdate()
    return TaskOccurrence.objects.create(
        recurring_task=task,
        due_date=today,
        status="pending",
    )


# ---------------------------------------------------------------------------
# Tareas recurrentes — lista y filtros
# ---------------------------------------------------------------------------

class TestRecurringTaskList:
    def test_lista_todas_las_tareas(self, api, task, maintenance_task):
        response = api.get(TASKS_BASE)
        assert response.status_code == 200
        assert len(response.data["results"]) == 2

    def test_filtra_por_categoria(self, api, task, maintenance_task):
        response = api.get(TASKS_BASE, {"category": "cleaning"})
        assert response.status_code == 200
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["category"] == "cleaning"

    def test_filtra_por_area(self, api, task, maintenance_task):
        response = api.get(TASKS_BASE, {"area": "kitchen"})
        assert response.status_code == 200
        assert all(t["area"] == "kitchen" for t in response.data["results"])

    def test_filtra_por_priority(self, api, task, maintenance_task):
        response = api.get(TASKS_BASE, {"priority": "high"})
        assert response.status_code == 200
        assert all(t["priority"] == "high" for t in response.data["results"])

    def test_filtra_por_is_active(self, api, task, db):
        RecurringTask.objects.create(
            title="Inactiva",
            frequency_type="weekly",
            is_active=False,
        )
        response = api.get(TASKS_BASE, {"is_active": "false"})
        assert response.status_code == 200
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["title"] == "Inactiva"


# ---------------------------------------------------------------------------
# Tareas recurrentes — CRUD
# ---------------------------------------------------------------------------

class TestRecurringTaskCRUD:
    def test_crea_tarea(self, api, db):
        payload = {
            "title": "Barrer",
            "category": "cleaning",
            "area": "kitchen",
            "frequency_type": "daily",
            "priority": "low",
        }
        response = api.post(TASKS_BASE, payload, format="json")
        assert response.status_code == 201
        assert RecurringTask.objects.filter(title="Barrer").exists()

    def test_titulo_obligatorio_retorna_400(self, api, db):
        response = api.post(TASKS_BASE, {"frequency_type": "daily"}, format="json")
        assert response.status_code == 400

    def test_actualiza_tarea(self, api, task):
        response = api.patch(f"{TASKS_BASE}{task.pk}/", {"priority": "critical"}, format="json")
        assert response.status_code == 200
        task.refresh_from_db()
        assert task.priority == "critical"

    def test_elimina_tarea(self, api, task):
        response = api.delete(f"{TASKS_BASE}{task.pk}/")
        assert response.status_code == 204


# ---------------------------------------------------------------------------
# Ocurrencias de tareas
# ---------------------------------------------------------------------------

class TestTaskOccurrenceList:
    def test_lista_ocurrencias_para_rango(self, api, task):
        today = timezone.localdate()
        response = api.get(OCCURRENCES_BASE, {
            "from": today.isoformat(),
            "to": (today + timedelta(days=7)).isoformat(),
        })
        assert response.status_code == 200
        assert isinstance(response.data["results"], list)

    def test_filtra_por_status(self, api, occurrence):
        today = timezone.localdate()
        response = api.get(OCCURRENCES_BASE, {
            "from": today.isoformat(),
            "to": today.isoformat(),
            "status": "pending",
        })
        assert response.status_code == 200
        assert all(o["status"] == "pending" for o in response.data["results"])

    def test_filtra_ocurrencias_por_categoria(self, api, task, maintenance_task):
        today = timezone.localdate()
        TaskOccurrence.objects.create(recurring_task=task, due_date=today)
        TaskOccurrence.objects.create(recurring_task=maintenance_task, due_date=today)
        response = api.get(OCCURRENCES_BASE, {
            "from": today.isoformat(),
            "to": today.isoformat(),
            "category": "cleaning",
        })
        assert response.status_code == 200
        assert len(response.data["results"]) == 1


# ---------------------------------------------------------------------------
# Acciones sobre ocurrencias
# ---------------------------------------------------------------------------

class TestTaskOccurrenceActions:
    def test_completar_ocurrencia(self, api, occurrence):
        response = api.post(
            f"/api/v1/task-occurrences/{occurrence.pk}/complete/",
            {"completion_notes": "Hecho"},
            format="json",
        )
        assert response.status_code == 200
        occurrence.refresh_from_db()
        assert occurrence.status == "done"

    def test_omitir_ocurrencia(self, api, occurrence):
        response = api.post(
            f"/api/v1/task-occurrences/{occurrence.pk}/skip/",
            format="json",
        )
        assert response.status_code == 200
        occurrence.refresh_from_db()
        assert occurrence.status == "skipped"

    def test_reabrir_ocurrencia_completada(self, api, occurrence):
        occurrence.status = "done"
        occurrence.save()
        response = api.post(
            f"/api/v1/task-occurrences/{occurrence.pk}/reopen/",
            format="json",
        )
        assert response.status_code == 200
        occurrence.refresh_from_db()
        assert occurrence.status == "pending"

    def test_completar_tarea_ya_completada_retorna_400(self, api, occurrence):
        occurrence.status = "done"
        occurrence.save()
        response = api.post(
            f"/api/v1/task-occurrences/{occurrence.pk}/complete/",
            format="json",
        )
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# Insights
# ---------------------------------------------------------------------------

class TestHouseholdInsightsView:
    def test_retorna_estructura(self, api, db):
        response = api.get(INSIGHTS_URL)
        assert response.status_code == 200
        assert "summary" in response.data or isinstance(response.data, dict)

    def test_fecha_invalida_retorna_400(self, api, db):
        response = api.get(INSIGHTS_URL, {"from": "no-es-fecha"})
        assert response.status_code == 400
