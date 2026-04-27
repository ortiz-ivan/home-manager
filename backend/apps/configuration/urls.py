from django.urls import path

from .views import InventorySettingsView


urlpatterns = [
    path("settings/", InventorySettingsView.as_view(), name="inventory-settings"),
]