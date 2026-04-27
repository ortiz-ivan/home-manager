from django.contrib import admin

from .models import FinancialEvent, MonthlyClose


@admin.register(FinancialEvent)
class FinancialEventAdmin(admin.ModelAdmin):
    list_display = ("title", "entity_type", "action", "amount", "effective_date")
    list_filter = ("entity_type", "action", "month", "year")
    search_fields = ("title", "reason")


@admin.register(MonthlyClose)
class MonthlyCloseAdmin(admin.ModelAdmin):
    list_display = ("month", "year", "created_at")
    list_filter = ("year", "month")