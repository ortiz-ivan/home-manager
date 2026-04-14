from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0002_product_usage_frequency"),
    ]

    operations = [
        migrations.CreateModel(
            name="Income",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("source", models.CharField(blank=True, max_length=120)),
                ("notes", models.CharField(blank=True, max_length=255)),
                ("date", models.DateField(default=django.utils.timezone.localdate)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-date", "-id"],
            },
        ),
    ]
