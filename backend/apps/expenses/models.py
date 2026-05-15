from django.db import models
from django.utils import timezone

from apps.configuration.models import InventorySettings, get_category_budget_bucket
from apps.purchases.models import Product


class FixedExpense(models.Model):
    BUDGET_BUCKET_CHOICES = Product.BUDGET_BUCKET_CHOICES

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=50)
    budget_bucket = models.CharField(max_length=20, choices=BUDGET_BUCKET_CHOICES, default="needs")
    monthly_amount = models.DecimalField(max_digits=12, decimal_places=2)
    next_due_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventory_fixedexpense"
        ordering = ["name", "id"]

    @classmethod
    def get_budget_bucket_for_category(cls, category: str) -> str:
        settings_data = InventorySettings.get_solo().get_config()
        return get_category_budget_bucket(settings_data, category, "needs")

    def __str__(self):
        return f"{self.name} ({self.category})"


class Income(models.Model):
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    source = models.CharField(max_length=120, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inventory_income"
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"Ingreso {self.amount} ({self.date})"


class VariableExpense(models.Model):
    STATUS_PAID = "paid"
    STATUS_COMMITTED = "committed"
    STATUS_CHOICES = [
        (STATUS_PAID, "Pagado"),
        (STATUS_COMMITTED, "Comprometido"),
    ]

    BUDGET_BUCKET_CHOICES = Product.BUDGET_BUCKET_CHOICES

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=50)
    budget_bucket = models.CharField(max_length=20, choices=BUDGET_BUCKET_CHOICES, default="needs")
    description = models.CharField(max_length=120, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PAID)
    date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inventory_variableexpense"
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"Gasto variable {self.amount} ({self.category})"

    @classmethod
    def get_budget_bucket_for_category(cls, category: str) -> str:
        settings_data = InventorySettings.get_solo().get_config()
        return get_category_budget_bucket(settings_data, category, "needs")


class FixedExpensePayment(models.Model):
    fixed_expense = models.ForeignKey(FixedExpense, on_delete=models.CASCADE, related_name="payments")
    date = models.DateField(default=timezone.localdate)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inventory_fixedexpensepayment"
        unique_together = ("fixed_expense", "date")
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"Pago fijo {self.fixed_expense.name} - {self.date} - {self.amount}"