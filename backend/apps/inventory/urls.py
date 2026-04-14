from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import IncomeViewSet, MonthlyFinanceSummaryView, ProductViewSet, VariableExpenseViewSet

router = DefaultRouter()
router.register(r'', ProductViewSet)

urlpatterns = [
	path("incomes/", IncomeViewSet.as_view({"get": "list", "post": "create"}), name="income-list"),
	path(
		"incomes/<int:pk>/",
		IncomeViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}),
		name="income-detail",
	),
	path(
		"variable-expenses/",
		VariableExpenseViewSet.as_view({"get": "list", "post": "create"}),
		name="variable-expense-list",
	),
	path(
		"variable-expenses/<int:pk>/",
		VariableExpenseViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}),
		name="variable-expense-detail",
	),
	path("monthly-finance-summary/", MonthlyFinanceSummaryView.as_view(), name="monthly-finance-summary"),
	*router.urls,
]