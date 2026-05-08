import pytest
from apps.configuration.models import InventorySettings


@pytest.fixture(autouse=True)
def settings_singleton(db):
    """Garantiza que el singleton de InventorySettings exista en cada test."""
    return InventorySettings.get_solo()
