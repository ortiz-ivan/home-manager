import django_filters

from .models import SavingsGoal


class SavingsGoalFilter(django_filters.FilterSet):
    class Meta:
        model = SavingsGoal
        fields = {
            "is_active": ["exact"],
            "goal_type": ["exact"],
        }
