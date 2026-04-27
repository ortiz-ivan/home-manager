from django.db import models
from django.utils import timezone


class FinancialEvent(models.Model):
    ENTITY_CHOICES = [
        ("income", "Ingreso"),
        ("variable_expense", "Gasto variable"),
        ("fixed_expense", "Gasto fijo"),
        ("fixed_expense_payment", "Pago fijo"),
        ("monthly_close", "Cierre mensual"),
    ]

    ACTION_CHOICES = [
        ("created", "Creado"),
        ("updated", "Actualizado"),
        ("deleted", "Eliminado"),
        ("payment_recorded", "Pago registrado"),
        ("monthly_closed", "Mes cerrado"),
    ]

    entity_type = models.CharField(max_length=30, choices=ENTITY_CHOICES)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    entity_id = models.PositiveIntegerField()
    title = models.CharField(max_length=140)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    effective_date = models.DateField(default=timezone.localdate)
    month = models.PositiveSmallIntegerField()
    year = models.PositiveSmallIntegerField()
    reason = models.CharField(max_length=255, blank=True)
    previous_data = models.JSONField(default=dict, blank=True)
    current_data = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inventory_financialevent"
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.get_entity_type_display()} {self.get_action_display()} ({self.effective_date})"


class MonthlyClose(models.Model):
    month = models.PositiveSmallIntegerField()
    year = models.PositiveSmallIntegerField()
    notes = models.CharField(max_length=255, blank=True)
    summary_snapshot = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inventory_monthlyclose"
        unique_together = ("month", "year")
        ordering = ["-year", "-month", "-id"]

    def __str__(self):
        return f"Cierre {self.month:02d}/{self.year}"