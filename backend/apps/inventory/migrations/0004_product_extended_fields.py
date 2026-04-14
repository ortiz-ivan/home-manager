from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0003_income"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="type",
            field=models.CharField(
                choices=[
                    ("consumable", "Consumible"),
                    ("service", "Servicio"),
                    ("subscription", "Suscripción"),
                    ("asset", "Activo"),
                ],
                default="consumable",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="product",
            name="price",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="product",
            name="next_due_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="product",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="product",
            name="created_at",
            field=models.DateTimeField(default=django.utils.timezone.now, auto_now_add=True),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="product",
            name="updated_at",
            field=models.DateTimeField(default=django.utils.timezone.now, auto_now=True),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="product",
            name="category",
            field=models.CharField(
                choices=[
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
                ],
                max_length=20,
            ),
        ),
    ]
