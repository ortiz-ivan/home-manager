from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="RecurringTask",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=120)),
                ("category", models.CharField(blank=True, default="general", max_length=50)),
                ("frequency_type", models.CharField(choices=[("weekly", "Semanal"), ("monthly", "Mensual")], max_length=20)),
                ("interval", models.PositiveSmallIntegerField(default=1)),
                ("weekday", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("day_of_month", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("start_date", models.DateField(default=django.utils.timezone.localdate)),
                ("next_due_date", models.DateField(blank=True, null=True)),
                ("notes", models.CharField(blank=True, max_length=255)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "inventory_recurringtask",
                "ordering": ["title", "id"],
            },
        ),
        migrations.CreateModel(
            name="TaskOccurrence",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("due_date", models.DateField()),
                ("status", models.CharField(choices=[("pending", "Pendiente"), ("done", "Hecha"), ("skipped", "Omitida")], default="pending", max_length=20)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("completion_notes", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("recurring_task", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="occurrences", to="household.recurringtask")),
            ],
            options={
                "db_table": "inventory_taskoccurrence",
                "ordering": ["due_date", "id"],
                "unique_together": {("recurring_task", "due_date")},
            },
        ),
    ]