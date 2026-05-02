from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("household", "0002_recurringtask_area_priority"),
    ]

    operations = [
        migrations.AddField(
            model_name="recurringtask",
            name="estimated_minutes",
            field=models.PositiveIntegerField(default=15),
        ),
    ]