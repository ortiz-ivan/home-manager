from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
	FixedExpenseViewSet,
	IncomeViewSet,
	InventorySettingsView,
	MonthlyFinanceSummaryView,
	ProductViewSet,
	VariableExpenseViewSet,
)

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'fixed-expenses', FixedExpenseViewSet, basename='fixed-expense')

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
	path("settings/", InventorySettingsView.as_view(), name="inventory-settings"),
	path("monthly-finance-summary/", MonthlyFinanceSummaryView.as_view(), name="monthly-finance-summary"),
	*router.urls,
]