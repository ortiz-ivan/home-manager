from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0004_product_extended_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="VariableExpense",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "category",
                    models.CharField(
                        choices=[("mobility", "Movilidad"), ("maintenance", "Mantenimiento")],
                        max_length=20,
                    ),
                ),
                ("description", models.CharField(blank=True, max_length=120)),
                ("notes", models.CharField(blank=True, max_length=255)),
                ("date", models.DateField(default=django.utils.timezone.localdate)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-date", "-id"],
            },
        ),
    ]
