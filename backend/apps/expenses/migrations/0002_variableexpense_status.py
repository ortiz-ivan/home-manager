from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("expenses", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="variableexpense",
            name="status",
            field=models.CharField(
                choices=[("paid", "Pagado"), ("committed", "Comprometido")],
                default="paid",
                max_length=20,
            ),
        ),
    ]
