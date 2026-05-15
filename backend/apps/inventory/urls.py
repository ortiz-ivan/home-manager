from django.urls import include, path

# This app is a URL router that aggregates all domain apps under /api/v1/.
# It owns no models of its own — the "inventory_*" db_table prefixes in other
# apps are a legacy of a prior naming scheme and kept to avoid data migrations.

urlpatterns = [
    path("", include("apps.purchases.urls")),
    path("", include("apps.expenses.urls")),
    path("", include("apps.reports.urls")),
    path("", include("apps.household.urls")),
    path("", include("apps.goals.urls")),
    path("", include("apps.configuration.urls")),
    path("assistant/", include("apps.assistant.urls")),
]