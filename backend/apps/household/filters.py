import django_filters

from .models import RecurringTask, TaskOccurrence


class RecurringTaskFilter(django_filters.FilterSet):
    class Meta:
        model = RecurringTask
        fields = {
            "category": ["exact"],
            "area": ["exact"],
            "priority": ["exact"],
            "is_active": ["exact"],
        }


class TaskOccurrenceFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name="recurring_task__category")
    area = django_filters.CharFilter(field_name="recurring_task__area")
    priority = django_filters.CharFilter(field_name="recurring_task__priority")

    class Meta:
        model = TaskOccurrence
        fields = ["status"]
