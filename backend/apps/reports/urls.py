from django.urls import path

from .views import FinancialEventListView, MonthlyCloseView, MonthlyFinanceSummaryView


urlpatterns = [
    path("financial-events/", FinancialEventListView.as_view(), name="financial-event-list"),
    path("monthly-closes/", MonthlyCloseView.as_view(), name="monthly-close-list"),
    path("monthly-finance-summary/", MonthlyFinanceSummaryView.as_view(), name="monthly-finance-summary"),
]