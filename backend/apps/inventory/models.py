from django.db import models
from django.utils import timezone


class Product(models.Model):

    CATEGORY_CHOICES = [
        ("food", "Alimentos"),
        ("cleaning", "Limpieza"),
        ("hygiene", "Higiene"),
        ("home", "Hogar"),

        ("mobility", "Movilidad"),
        ("maintenance", "Mantenimiento"),
        ("subscription", "Suscripciones"),
        ("services", "Servicios"),
        ("assets", "Activos"),
        ("leisure", "Ocio"),
    ]

    TYPE_CHOICES = [
        ("consumable", "Consumible"),
        ("service", "Servicio"),
        ("subscription", "Suscripción"),
        ("asset", "Activo"),
    ]

    CATEGORY_TYPE_MAP = {
        "mobility": "service",
        "maintenance": "service",
        "home": "service",
        "leisure": "service",
        "services": "service",
        "subscription": "subscription",
        "assets": "asset",
    }

    USAGE_FREQUENCY_CHOICES = [
        ("high", "Alta"),
        ("medium", "Media"),
        ("low", "Baja"),
    ]


    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="consumable")


    stock = models.IntegerField(default=0)
    stock_min = models.IntegerField(default=1)
    unit = models.CharField(max_length=20, default="unidad")


    price = models.FloatField(null=True, blank=True)


    usage_frequency = models.CharField(
        max_length=10,
        choices=USAGE_FREQUENCY_CHOICES,
        default="medium",
    )


    last_purchase = models.DateField(null=True, blank=True)
    next_due_date = models.DateField(null=True, blank=True)


    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get_type_for_category(cls, category: str) -> str:
        return cls.CATEGORY_TYPE_MAP.get(category, "consumable")

    def __str__(self):
        return f"{self.name} ({self.category})"


class Income(models.Model):
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    source = models.CharField(max_length=120, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"Ingreso {self.amount} ({self.date})"


class VariableExpense(models.Model):
    CATEGORY_CHOICES = [
        ("mobility", "Movilidad"),
        ("maintenance", "Mantenimiento"),
    ]

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.CharField(max_length=120, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"Gasto variable {self.amount} ({self.category})"