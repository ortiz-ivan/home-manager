from django.db import models
from django.utils import timezone


class RecurringTask(models.Model):
    FREQUENCY_DAILY = "daily"
    FREQUENCY_WEEKLY = "weekly"
    FREQUENCY_MONTHLY = "monthly"
    INTEGRATION_NONE = ""
    INTEGRATION_FIXED_EXPENSE = "fixed_expense"
    INTEGRATION_PRODUCT_RESTOCK = "product_restock"
    INTEGRATION_PRODUCT_EXPIRY = "product_expiry"
    FREQUENCY_CHOICES = [
        (FREQUENCY_DAILY, "Diaria"),
        (FREQUENCY_WEEKLY, "Semanal"),
        (FREQUENCY_MONTHLY, "Mensual"),
    ]
    INTEGRATION_CHOICES = [
        (INTEGRATION_NONE, "Sin integracion"),
        (INTEGRATION_FIXED_EXPENSE, "Gasto fijo"),
        (INTEGRATION_PRODUCT_RESTOCK, "Reposicion de producto"),
        (INTEGRATION_PRODUCT_EXPIRY, "Revision de vencimiento"),
    ]

    title = models.CharField(max_length=120)
    category = models.CharField(max_length=50, default="general", blank=True)
    area = models.CharField(max_length=50, default="home_admin", blank=True)
    priority = models.CharField(max_length=20, default="medium")
    estimated_minutes = models.PositiveIntegerField(default=15)
    integration_kind = models.CharField(max_length=30, choices=INTEGRATION_CHOICES, default=INTEGRATION_NONE, blank=True)
    linked_fixed_expense = models.ForeignKey(
        "expenses.FixedExpense",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="linked_household_tasks",
    )
    linked_product = models.ForeignKey(
        "purchases.Product",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="linked_household_tasks",
    )
    frequency_type = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    interval = models.PositiveSmallIntegerField(default=1)
    weekday = models.PositiveSmallIntegerField(null=True, blank=True)
    day_of_month = models.PositiveSmallIntegerField(null=True, blank=True)
    start_date = models.DateField(default=timezone.localdate)
    next_due_date = models.DateField(null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventory_recurringtask"
        ordering = ["title", "id"]

    def __str__(self):
        return self.title


class TaskOccurrence(models.Model):
    STATUS_PENDING = "pending"
    STATUS_DONE = "done"
    STATUS_SKIPPED = "skipped"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pendiente"),
        (STATUS_DONE, "Hecha"),
        (STATUS_SKIPPED, "Omitida"),
    ]

    recurring_task = models.ForeignKey(RecurringTask, on_delete=models.CASCADE, related_name="occurrences")
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    completed_at = models.DateTimeField(null=True, blank=True)
    completion_notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inventory_taskoccurrence"
        unique_together = ("recurring_task", "due_date")
        ordering = ["due_date", "id"]

    def __str__(self):
        return f"{self.recurring_task.title} - {self.due_date}"