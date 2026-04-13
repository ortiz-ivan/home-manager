from django.db import models

class Product(models.Model):
    CATEGORY_CHOICES = [
        ("food", "Alimentos"),
        ("cleaning", "Limpieza"),
        ("hygiene", "Higiene"),
        ("home", "Hogar"),
    ]

    USAGE_FREQUENCY_CHOICES = [
        ("high", "Alta"),
        ("medium", "Media"),
        ("low", "Baja"),
    ]

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    stock = models.IntegerField(default=0)
    stock_min = models.IntegerField(default=1)
    unit = models.CharField(max_length=20, default="unidad")
    usage_frequency = models.CharField(
        max_length=10,
        choices=USAGE_FREQUENCY_CHOICES,
        default="medium",
    )
    last_purchase = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.name