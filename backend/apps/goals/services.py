from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import SavingsGoal


def add_contribution(goal_id: int, amount: Decimal) -> SavingsGoal:
    with transaction.atomic():
        goal = SavingsGoal.objects.select_for_update().get(id=goal_id)

        if not goal.is_active:
            raise ValueError("No se puede aportar a una meta inactiva")

        if amount <= Decimal("0"):
            raise ValueError("El aporte debe ser mayor a 0")

        goal.current_amount += amount
        goal.save()

        return goal


def get_goal_progress(goal: SavingsGoal) -> dict:
    remaining = max(goal.target_amount - goal.current_amount, Decimal("0"))

    if goal.target_amount > 0:
        pct = min(float(goal.current_amount / goal.target_amount * 100), 100.0)
    else:
        pct = 0.0

    days_left = None
    if goal.target_date:
        today = timezone.localdate()
        days_left = (goal.target_date - today).days

    return {
        "progress_pct": round(pct, 1),
        "remaining": remaining,
        "days_left": days_left,
        "is_completed": goal.current_amount >= goal.target_amount,
    }
