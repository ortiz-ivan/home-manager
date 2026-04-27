from django.contrib import admin

from .models import FixedExpense, FixedExpensePayment, Income, VariableExpense


@admin.register(FixedExpense)
class FixedExpenseAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "monthly_amount", "next_due_date", "is_active")
    list_filter = ("category", "budget_bucket", "is_active")
    search_fields = ("name",)


@admin.register(FixedExpensePayment)
class FixedExpensePaymentAdmin(admin.ModelAdmin):
    list_display = ("fixed_expense", "date", "amount")
    list_filter = ("date",)


@admin.register(Income)
class IncomeAdmin(admin.ModelAdmin):
    list_display = ("source", "amount", "date")
    list_filter = ("date",)
    search_fields = ("source", "notes")


@admin.register(VariableExpense)
class VariableExpenseAdmin(admin.ModelAdmin):
    list_display = ("category", "description", "amount", "date")
    list_filter = ("category", "budget_bucket", "date")
    search_fields = ("description", "notes")