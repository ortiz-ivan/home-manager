from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("purchases", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="product",
            name="stock",
            field=models.DecimalField(decimal_places=3, default=0, max_digits=12),
        ),
        migrations.AlterField(
            model_name="product",
            name="stock_min",
            field=models.DecimalField(decimal_places=3, default=1, max_digits=12),
        ),
    ]