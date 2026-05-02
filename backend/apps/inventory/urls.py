from django.urls import include, path


urlpatterns = [
    path("", include("apps.purchases.urls")),
    path("", include("apps.expenses.urls")),
    path("", include("apps.reports.urls")),
    path("", include("apps.household.urls")),
    path("", include("apps.configuration.urls")),
]