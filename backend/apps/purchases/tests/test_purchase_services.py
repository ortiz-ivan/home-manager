from decimal import Decimal

import pytest

from apps.purchases.models import Product
from apps.purchases.services import consume_product, mark_product_out_of_stock, restock_product


@pytest.fixture
def consumable(db):
    return Product.objects.create(
        name="Arroz",
        category="food",
        type="consumable",
        stock=Decimal("5"),
        stock_min=Decimal("2"),
        unit="kg",
    )


@pytest.fixture
def asset(db):
    return Product.objects.create(
        name="Silla",
        category="assets",
        type="asset",
        stock=Decimal("1"),
        stock_min=Decimal("1"),
        unit="unidad",
    )


class TestConsumeProduct:
    def test_reduce_stock(self, consumable):
        consume_product(consumable.id, Decimal("2"))
        consumable.refresh_from_db()
        assert consumable.stock == Decimal("3")

    def test_low_stock_flag_true_when_at_min(self, consumable):
        # stock=5, stock_min=2 → consumir 3 deja stock=2 == stock_min
        result = consume_product(consumable.id, Decimal("3"))
        assert result["low_stock"] is True

    def test_low_stock_flag_false_when_above_min(self, consumable):
        # stock=5, stock_min=2 → consumir 1 deja stock=4 > stock_min
        result = consume_product(consumable.id, Decimal("1"))
        assert result["low_stock"] is False

    def test_raises_insufficient_stock(self, consumable):
        with pytest.raises(ValueError, match="Stock insuficiente"):
            consume_product(consumable.id, Decimal("10"))

    def test_raises_on_zero_quantity(self, consumable):
        with pytest.raises(ValueError):
            consume_product(consumable.id, Decimal("0"))

    def test_raises_on_negative_quantity(self, consumable):
        with pytest.raises(ValueError):
            consume_product(consumable.id, Decimal("-1"))

    def test_raises_on_non_consumable(self, asset):
        with pytest.raises(ValueError, match="consumible"):
            consume_product(asset.id, Decimal("1"))

    def test_returns_product_in_result(self, consumable):
        result = consume_product(consumable.id, Decimal("1"))
        assert result["product"].id == consumable.id


class TestRestockProduct:
    def test_increases_stock(self, consumable):
        restock_product(consumable.id, Decimal("3"))
        consumable.refresh_from_db()
        assert consumable.stock == Decimal("8")

    def test_updates_last_purchase_date(self, consumable):
        assert consumable.last_purchase is None
        restock_product(consumable.id, Decimal("1"))
        consumable.refresh_from_db()
        assert consumable.last_purchase is not None

    def test_raises_on_zero_quantity(self, consumable):
        with pytest.raises(ValueError):
            restock_product(consumable.id, Decimal("0"))

    def test_raises_on_negative_quantity(self, consumable):
        with pytest.raises(ValueError):
            restock_product(consumable.id, Decimal("-5"))

    def test_raises_on_non_consumable(self, asset):
        with pytest.raises(ValueError, match="consumible"):
            restock_product(asset.id, Decimal("1"))

    def test_returns_product_in_result(self, consumable):
        result = restock_product(consumable.id, Decimal("2"))
        assert result["product"].id == consumable.id


class TestMarkProductOutOfStock:
    def test_sets_stock_to_zero(self, consumable):
        mark_product_out_of_stock(consumable.id)
        consumable.refresh_from_db()
        assert consumable.stock == Decimal("0")

    def test_returns_low_stock_true(self, consumable):
        result = mark_product_out_of_stock(consumable.id)
        assert result["low_stock"] is True

    def test_raises_on_non_consumable(self, asset):
        with pytest.raises(ValueError, match="consumible"):
            mark_product_out_of_stock(asset.id)
