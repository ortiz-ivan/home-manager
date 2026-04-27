from django.contrib import admin

from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "type", "stock", "is_active")
    list_filter = ("category", "type", "is_active")
    search_fields = ("name",)