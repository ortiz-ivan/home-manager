from decimal import Decimal

from django.db import models


class SavingsGoal(models.Model):
    TYPE_SAVINGS = "savings"
    TYPE_DEBT = "debt"
    TYPE_BIG_PURCHASE = "big_purchase"

    TYPE_CHOICES = [
        (TYPE_SAVINGS, "Ahorro"),
        (TYPE_DEBT, "Deuda"),
        (TYPE_BIG_PURCHASE, "Compra grande"),
    ]

    name = models.CharField(max_length=120)
    goal_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_SAVINGS)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    target_date = models.DateField(null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventory_savingsgoal"
        ordering = ["goal_type", "name", "id"]

    def __str__(self):
        return f"{self.name} ({self.get_goal_type_display()})"
