from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.purchases.models import Product, ProductConsumption, ProductRestock
from apps.purchases.services import (
    consume_product,
    get_product_stats,
    mark_product_out_of_stock,
    restock_product,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def consumable(db):
    return Product.objects.create(
        name="Arroz",
        category="food",
        type="consumable",
        stock=Decimal("10"),
        stock_min=Decimal("2"),
        unit="kg",
        price=5.0,
    )


@pytest.fixture
def consumable_sin_precio(db):
    return Product.objects.create(
        name="Sal",
        category="food",
        type="consumable",
        stock=Decimal("5"),
        stock_min=Decimal("1"),
        unit="kg",
        price=None,
    )


# ---------------------------------------------------------------------------
# consume_product → registra ProductConsumption
# ---------------------------------------------------------------------------

class TestConsumeProductRegistraHistorial:
    def test_crea_registro_de_consumo(self, consumable):
        consume_product(consumable.id, Decimal("2"))
        assert ProductConsumption.objects.filter(product=consumable).count() == 1

    def test_registro_tiene_cantidad_correcta(self, consumable):
        consume_product(consumable.id, Decimal("3"))
        record = ProductConsumption.objects.get(product=consumable)
        assert record.quantity == Decimal("3")

    def test_registro_tiene_fecha_de_hoy(self, consumable):
        consume_product(consumable.id, Decimal("1"))
        record = ProductConsumption.objects.get(product=consumable)
        assert record.date == timezone.localdate()

    def test_multiples_consumos_generan_multiples_registros(self, consumable):
        consume_product(consumable.id, Decimal("1"))
        consume_product(consumable.id, Decimal("2"))
        assert ProductConsumption.objects.filter(product=consumable).count() == 2

    def test_error_no_crea_registro(self, consumable):
        with pytest.raises(ValueError):
            consume_product(consumable.id, Decimal("999"))
        assert ProductConsumption.objects.filter(product=consumable).count() == 0


# ---------------------------------------------------------------------------
# restock_product → registra ProductRestock
# ---------------------------------------------------------------------------

class TestRestockProductRegistraHistorial:
    def test_crea_registro_de_reposicion(self, consumable):
        restock_product(consumable.id, Decimal("5"))
        assert ProductRestock.objects.filter(product=consumable).count() == 1

    def test_registro_tiene_cantidad_correcta(self, consumable):
        restock_product(consumable.id, Decimal("4"))
        record = ProductRestock.objects.get(product=consumable)
        assert record.quantity == Decimal("4")

    def test_registro_tiene_fecha_de_hoy(self, consumable):
        restock_product(consumable.id, Decimal("1"))
        record = ProductRestock.objects.get(product=consumable)
        assert record.date == timezone.localdate()

    def test_copia_unit_cost_del_precio_del_producto(self, consumable):
        restock_product(consumable.id, Decimal("2"))
        record = ProductRestock.objects.get(product=consumable)
        assert record.unit_cost == Decimal("5.00")

    def test_unit_cost_es_none_sin_precio(self, consumable_sin_precio):
        restock_product(consumable_sin_precio.id, Decimal("2"))
        record = ProductRestock.objects.get(product=consumable_sin_precio)
        assert record.unit_cost is None

    def test_multiples_reposiciones_generan_multiples_registros(self, consumable):
        restock_product(consumable.id, Decimal("2"))
        restock_product(consumable.id, Decimal("3"))
        assert ProductRestock.objects.filter(product=consumable).count() == 2


# ---------------------------------------------------------------------------
# mark_product_out_of_stock → registra consumo si había stock
# ---------------------------------------------------------------------------

class TestMarkOutOfStockRegistraHistorial:
    def test_crea_consumo_con_stock_previo(self, consumable):
        mark_product_out_of_stock(consumable.id)
        record = ProductConsumption.objects.get(product=consumable)
        assert record.quantity == Decimal("10")

    def test_no_crea_consumo_si_ya_estaba_en_cero(self, db):
        product = Product.objects.create(
            name="Vacio", category="food", type="consumable",
            stock=Decimal("0"), stock_min=Decimal("1"), unit="kg",
        )
        mark_product_out_of_stock(product.id)
        assert ProductConsumption.objects.filter(product=product).count() == 0


# ---------------------------------------------------------------------------
# get_product_stats
# ---------------------------------------------------------------------------

class TestGetProductStats:
    def test_retorna_todos_los_campos(self, consumable):
        result = get_product_stats(consumable.id)
        expected = {
            "product_id", "period_days", "date_from", "date_to",
            "total_consumed", "total_restocked",
            "consumption_count", "restock_count",
            "avg_daily_consumption", "avg_monthly_consumption",
            "estimated_days_remaining", "estimated_monthly_cost",
            "avg_restock_interval_days", "current_stock", "unit",
        }
        assert expected.issubset(result.keys())

    def test_ceros_sin_historial(self, consumable):
        result = get_product_stats(consumable.id)
        assert result["total_consumed"] == 0.0
        assert result["total_restocked"] == 0.0
        assert result["consumption_count"] == 0
        assert result["restock_count"] == 0
        assert result["avg_daily_consumption"] == 0.0
        assert result["estimated_days_remaining"] is None
        assert result["estimated_monthly_cost"] is None
        assert result["avg_restock_interval_days"] is None

    def test_contabiliza_consumos_del_periodo(self, consumable):
        consume_product(consumable.id, Decimal("3"))
        consume_product(consumable.id, Decimal("2"))
        result = get_product_stats(consumable.id, days=90)
        assert result["total_consumed"] == pytest.approx(5.0)
        assert result["consumption_count"] == 2

    def test_contabiliza_reposiciones_del_periodo(self, consumable):
        restock_product(consumable.id, Decimal("6"))
        result = get_product_stats(consumable.id, days=90)
        assert result["total_restocked"] == pytest.approx(6.0)
        assert result["restock_count"] == 1

    def test_avg_daily_consumption_dividido_por_dias(self, consumable):
        consume_product(consumable.id, Decimal("9"))
        result = get_product_stats(consumable.id, days=90)
        assert result["avg_daily_consumption"] == pytest.approx(9.0 / 90, rel=1e-3)

    def test_avg_monthly_consumption_es_daily_por_30(self, consumable):
        consume_product(consumable.id, Decimal("9"))
        result = get_product_stats(consumable.id, days=90)
        expected = (9.0 / 90) * 30
        assert result["avg_monthly_consumption"] == pytest.approx(expected, rel=1e-3)

    def test_estimated_days_remaining_con_datos(self, consumable):
        consume_product(consumable.id, Decimal("9"))
        consumable.refresh_from_db()
        result = get_product_stats(consumable.id, days=90)
        avg_daily = Decimal("9") / 90
        expected_days = int(consumable.stock / avg_daily)
        assert result["estimated_days_remaining"] == expected_days

    def test_estimated_monthly_cost_con_precio(self, consumable):
        consume_product(consumable.id, Decimal("9"))
        result = get_product_stats(consumable.id, days=90)
        avg_monthly = (9.0 / 90) * 30
        expected_cost = round(avg_monthly * 5.0, 2)
        assert result["estimated_monthly_cost"] == pytest.approx(expected_cost, rel=1e-3)

    def test_estimated_monthly_cost_none_sin_precio(self, consumable_sin_precio):
        consume_product(consumable_sin_precio.id, Decimal("3"))
        result = get_product_stats(consumable_sin_precio.id, days=90)
        assert result["estimated_monthly_cost"] is None

    def test_avg_restock_interval_none_con_solo_una_reposicion(self, consumable):
        restock_product(consumable.id, Decimal("5"))
        result = get_product_stats(consumable.id)
        assert result["avg_restock_interval_days"] is None

    def test_avg_restock_interval_calculado_con_dos_reposiciones(self, db):
        product = Product.objects.create(
            name="Aceite", category="food", type="consumable",
            stock=Decimal("3"), stock_min=Decimal("1"), unit="litros", price=10.0,
        )
        today = timezone.localdate()
        ProductRestock.objects.create(product=product, quantity=Decimal("2"), date=today - timedelta(days=20))
        ProductRestock.objects.create(product=product, quantity=Decimal("2"), date=today)
        result = get_product_stats(product.id, days=90)
        assert result["avg_restock_interval_days"] == 20.0

    def test_ignora_eventos_fuera_del_periodo(self, consumable):
        old_date = timezone.localdate() - timedelta(days=200)
        ProductConsumption.objects.create(product=consumable, quantity=Decimal("50"), date=old_date)
        result = get_product_stats(consumable.id, days=90)
        assert result["total_consumed"] == 0.0

    def test_respeta_parametro_days(self, consumable):
        result_30 = get_product_stats(consumable.id, days=30)
        result_90 = get_product_stats(consumable.id, days=90)
        assert result_30["period_days"] == 30
        assert result_90["period_days"] == 90

    def test_current_stock_refleja_stock_actual(self, consumable):
        result = get_product_stats(consumable.id)
        assert result["current_stock"] == float(consumable.stock)

    def test_unit_refleja_unidad_del_producto(self, consumable):
        result = get_product_stats(consumable.id)
        assert result["unit"] == "kg"
