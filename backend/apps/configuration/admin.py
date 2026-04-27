from django.contrib import admin

from .models import InventorySettings


@admin.register(InventorySettings)
class InventorySettingsAdmin(admin.ModelAdmin):
    list_display = ("id", "updated_at")