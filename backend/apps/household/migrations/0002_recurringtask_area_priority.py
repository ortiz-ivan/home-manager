from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("household", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="recurringtask",
            name="area",
            field=models.CharField(blank=True, default="home_admin", max_length=50),
        ),
        migrations.AddField(
            model_name="recurringtask",
            name="priority",
            field=models.CharField(default="medium", max_length=20),
        ),
    ]