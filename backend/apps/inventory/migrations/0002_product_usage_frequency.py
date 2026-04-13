from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="usage_frequency",
            field=models.CharField(
                choices=[("high", "Alta"), ("medium", "Media"), ("low", "Baja")],
                default="medium",
                max_length=10,
            ),
        ),
    ]
