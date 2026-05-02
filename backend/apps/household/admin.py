from django.contrib import admin

from .models import RecurringTask, TaskOccurrence


@admin.register(RecurringTask)
class RecurringTaskAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "frequency_type", "next_due_date", "is_active")
    list_filter = ("frequency_type", "is_active", "category")
    search_fields = ("title", "category", "notes")


@admin.register(TaskOccurrence)
class TaskOccurrenceAdmin(admin.ModelAdmin):
    list_display = ("recurring_task", "due_date", "status", "completed_at")
    list_filter = ("status", "due_date")
    search_fields = ("recurring_task__title", "recurring_task__category", "completion_notes")