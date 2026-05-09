import decimal

from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []

    operations = [
        migrations.CreateModel(
            name="SavingsGoal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                (
                    "goal_type",
                    models.CharField(
                        choices=[
                            ("savings", "Ahorro"),
                            ("debt", "Deuda"),
                            ("big_purchase", "Compra grande"),
                        ],
                        default="savings",
                        max_length=20,
                    ),
                ),
                ("target_amount", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "current_amount",
                    models.DecimalField(decimal_places=2, default=decimal.Decimal("0"), max_digits=12),
                ),
                ("target_date", models.DateField(blank=True, null=True)),
                ("notes", models.CharField(blank=True, max_length=255)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "inventory_savingsgoal",
                "ordering": ["goal_type", "name", "id"],
            },
        ),
    ]
