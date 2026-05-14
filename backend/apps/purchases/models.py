from django.db import models
from django.utils import timezone

from apps.configuration.models import (
    InventorySettings,
    get_category_budget_bucket,
    get_category_type,
)


class Product(models.Model):
    BUDGET_BUCKET_CHOICES = [
        ("needs", "Necesidades"),
        ("wants", "Deseos"),
        ("savings", "Ahorro / deuda"),
    ]

    TYPE_CHOICES = [
        ("consumable", "Consumible"),
        ("service", "Servicio"),
        ("subscription", "Suscripción"),
        ("asset", "Activo"),
    ]

    USAGE_FREQUENCY_CHOICES = [
        ("high", "Alta"),
        ("medium", "Media"),
        ("low", "Baja"),
    ]

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=50)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="consumable")
    budget_bucket = models.CharField(max_length=20, choices=BUDGET_BUCKET_CHOICES, default="needs")
    stock = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    stock_min = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    unit = models.CharField(max_length=40, default="unidad")
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    usage_frequency = models.CharField(max_length=10, choices=USAGE_FREQUENCY_CHOICES, default="medium")
    last_purchase = models.DateField(null=True, blank=True)
    next_due_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventory_product"
        ordering = ["name", "id"]

    @classmethod
    def get_type_for_category(cls, category: str) -> str:
        settings_data = InventorySettings.get_solo().get_config()
        return get_category_type(settings_data, category, "consumable")

    @classmethod
    def get_budget_bucket_for_category(cls, category: str) -> str:
        settings_data = InventorySettings.get_solo().get_config()
        return get_category_budget_bucket(settings_data, category, "needs")

    def __str__(self):
        return f"{self.name} ({self.category})"


class ProductConsumption(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="consumptions")
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inventory_productconsumption"
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"Consumo {self.product.name} x{self.quantity} ({self.date})"


class ProductRestock(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="restocks")
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inventory_productrestock"
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"Reposicion {self.product.name} x{self.quantity} ({self.date})"