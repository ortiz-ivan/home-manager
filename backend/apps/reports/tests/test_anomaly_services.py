from datetime import date
from decimal import Decimal

import pytest

from apps.expenses.models import VariableExpense
from apps.purchases.models import Product, ProductRestock
from apps.reports.models import MonthlyClose
from apps.reports.services import (
    _detect_category_spikes,
    _detect_restock_anomalies,
    _get_historical_category_averages,
    detect_financial_anomalies,
)

MONTH = 5
YEAR = 2026
TODAY = date(YEAR, MONTH, 14)

# Helper builders

def make_close(month, year, category_breakdown):
    return MonthlyClose.objects.create(
        month=month,
        year=year,
        summary_snapshot={"category_breakdown": category_breakdown},
    )


def make_product(name="Producto", category="food"):
    return Product.objects.create(
        name=name,
        category=category,
        type="consumable",
        stock=10,
        stock_min=2,
    )


def make_restock(product, quantity, restock_date):
    return ProductRestock.objects.create(
        product=product,
        quantity=Decimal(str(quantity)),
        date=restock_date,
    )


# ---------------------------------------------------------------------------
# _get_historical_category_averages
# ---------------------------------------------------------------------------

class TestGetHistoricalCategoryAverages:
    def test_sin_cierres_retorna_dict_vacio(self, db):
        avgs, count = _get_historical_category_averages(MONTH, YEAR)
        assert avgs == {}
        assert count == 0

    def test_excluye_el_mes_actual(self, db):
        make_close(MONTH, YEAR, [{"category": "food", "actual": 1000}])
        avgs, count = _get_historical_category_averages(MONTH, YEAR)
        assert count == 0

    def test_incluye_meses_anteriores(self, db):
        make_close(MONTH - 1, YEAR, [{"category": "food", "actual": 1000}])
        make_close(MONTH - 2, YEAR, [{"category": "food", "actual": 2000}])
        avgs, count = _get_historical_category_averages(MONTH, YEAR)
        assert count == 2
        assert avgs.get("food") == pytest.approx(1500.0)

    def test_requiere_al_menos_2_meses_con_datos(self, db):
        make_close(MONTH - 1, YEAR, [{"category": "food", "actual": 1000}])
        avgs, count = _get_historical_category_averages(MONTH, YEAR)
        assert "food" not in avgs

    def test_respeta_limite_de_lookback(self, db):
        for m in range(1, 6):
            make_close(m, YEAR, [{"category": "food", "actual": 1000}])
        avgs, count = _get_historical_category_averages(MONTH, YEAR, lookback_months=3)
        assert count == 3


# ---------------------------------------------------------------------------
# _detect_category_spikes
# ---------------------------------------------------------------------------

class TestDetectCategorySpikes:
    SETTINGS = {"categories": [{"value": "food", "label": "Alimentacion"}]}

    def test_detecta_spike_warning(self, db):
        current = [{"category": "food", "actual": 1500.0}]
        avgs = {"food": 900.0}  # +66%
        result = _detect_category_spikes(current, avgs, self.SETTINGS, lookback_count=2)
        assert len(result) == 1
        assert result[0]["level"] == "warning"
        assert result[0]["type"] == "category_spike"

    def test_detecta_spike_danger(self, db):
        current = [{"category": "food", "actual": 2000.0}]
        avgs = {"food": 900.0}  # +122%
        result = _detect_category_spikes(current, avgs, self.SETTINGS, lookback_count=2)
        assert result[0]["level"] == "danger"

    def test_no_detecta_spike_por_debajo_del_umbral(self, db):
        current = [{"category": "food", "actual": 1300.0}]
        avgs = {"food": 1000.0}  # +30%
        result = _detect_category_spikes(current, avgs, self.SETTINGS, lookback_count=2)
        assert result == []

    def test_ignora_categorias_sin_historial(self, db):
        current = [{"category": "food", "actual": 5000.0}]
        avgs = {}
        result = _detect_category_spikes(current, avgs, self.SETTINGS, lookback_count=2)
        assert result == []

    def test_ignora_historico_por_debajo_del_minimo(self, db):
        current = [{"category": "food", "actual": 1000.0}]
        avgs = {"food": 100.0}  # below min_historical_amount
        result = _detect_category_spikes(
            current, avgs, self.SETTINGS, lookback_count=2, min_historical_amount=500.0,
        )
        assert result == []

    def test_incluye_campos_de_categoria_en_anomalia(self, db):
        current = [{"category": "food", "actual": 2000.0}]
        avgs = {"food": 900.0}
        result = _detect_category_spikes(current, avgs, self.SETTINGS, lookback_count=3)
        anomaly = result[0]
        assert anomaly["category"] == "food"
        assert anomaly["category_label"] == "Alimentacion"
        assert anomaly["current_amount"] == pytest.approx(2000.0)
        assert anomaly["reference_amount"] == pytest.approx(900.0)
        assert anomaly["product_id"] is None


# ---------------------------------------------------------------------------
# _detect_restock_anomalies
# ---------------------------------------------------------------------------

class TestDetectRestockAnomalies:
    def test_sin_productos_no_hay_anomalias(self, db):
        result = _detect_restock_anomalies(today=TODAY)
        assert result == []

    def test_ignora_producto_con_menos_de_3_restocks(self, db):
        p = make_product()
        make_restock(p, 1, date(YEAR, MONTH - 2, 1))
        make_restock(p, 1, date(YEAR, MONTH - 1, 1))
        result = _detect_restock_anomalies(today=TODAY)
        assert result == []

    def test_ignora_productos_no_consumibles(self, db):
        p = Product.objects.create(name="TV", category="assets", type="asset", stock=1, stock_min=0)
        for d in [date(YEAR, 1, 1), date(YEAR, 2, 1), date(YEAR, 3, 1), date(YEAR, 4, 1)]:
            make_restock(p, 1, d)
        result = _detect_restock_anomalies(today=TODAY)
        assert result == []

    def test_detecta_fast_restock(self, db):
        p = make_product("Arroz")
        # 3 restocks with ~30-day interval, then a restock only 3 days ago
        make_restock(p, 1, date(YEAR, 1, 1))
        make_restock(p, 1, date(YEAR, 2, 1))
        make_restock(p, 1, date(YEAR, 3, 1))
        make_restock(p, 1, date(YEAR, MONTH, TODAY.day - 3))  # only 3 days ago
        result = _detect_restock_anomalies(today=TODAY)
        types = [a["type"] for a in result]
        assert "fast_restock" in types
        fast = next(a for a in result if a["type"] == "fast_restock")
        assert fast["product_name"] == "Arroz"
        assert fast["days_since_last_restock"] == 3

    def test_detecta_slow_restock(self, db):
        p = make_product("Detergente")
        # 4 restocks at 7-day intervals; last one Jan 22 = 112 days before TODAY (May 14)
        # avg_interval = 7 days, slow threshold = 7 * 2 = 14 → 112 > 14
        make_restock(p, 1, date(YEAR, 1, 1))
        make_restock(p, 1, date(YEAR, 1, 8))
        make_restock(p, 1, date(YEAR, 1, 15))
        make_restock(p, 1, date(YEAR, 1, 22))
        result = _detect_restock_anomalies(today=TODAY)
        types = [a["type"] for a in result]
        assert "slow_restock" in types

    def test_sin_anomalia_con_intervalo_normal(self, db):
        p = make_product("Normal")
        make_restock(p, 1, date(YEAR, 1, 1))
        make_restock(p, 1, date(YEAR, 2, 1))
        make_restock(p, 1, date(YEAR, 3, 1))
        make_restock(p, 1, date(YEAR, 4, 1))  # exactly on schedule
        result = _detect_restock_anomalies(today=TODAY)
        assert result == []


# ---------------------------------------------------------------------------
# detect_financial_anomalies (integración)
# ---------------------------------------------------------------------------

class TestDetectFinancialAnomalies:
    def test_retorna_estructura_correcta(self, db):
        result = detect_financial_anomalies(MONTH, YEAR, today=TODAY)
        assert "month" in result
        assert "year" in result
        assert "lookback_months" in result
        assert "anomalies" in result
        assert isinstance(result["anomalies"], list)

    def test_anomalias_ordenadas_por_severidad(self, db):
        # Create a slow_restock (warning) and a fast_restock (info)
        p1 = make_product("Arroz")
        make_restock(p1, 1, date(YEAR, 1, 1))
        make_restock(p1, 1, date(YEAR, 2, 1))
        make_restock(p1, 1, date(YEAR, 3, 1))
        make_restock(p1, 1, date(YEAR, MONTH, TODAY.day - 3))  # fast

        p2 = make_product("Detergente")
        make_restock(p2, 1, date(YEAR, 1, 1))
        make_restock(p2, 1, date(YEAR, 1, 8))
        make_restock(p2, 1, date(YEAR, 1, 15))
        make_restock(p2, 1, date(YEAR, MONTH - 1, 1))  # slow

        result = detect_financial_anomalies(MONTH, YEAR, today=TODAY)
        levels = [a["level"] for a in result["anomalies"]]
        level_order = {"danger": 0, "warning": 1, "info": 2}
        assert levels == sorted(levels, key=lambda l: level_order.get(l, 9))

    def test_sin_datos_retorna_lista_vacia(self, db):
        result = detect_financial_anomalies(MONTH, YEAR, today=TODAY)
        assert result["anomalies"] == []
        assert result["lookback_months"] == 0

    def test_detecta_spike_con_cierres_historicos(self, db):
        make_close(MONTH - 1, YEAR, [{"category": "food", "actual": 1000}])
        make_close(MONTH - 2, YEAR, [{"category": "food", "actual": 1000}])
        VariableExpense.objects.create(
            amount=Decimal("2500"), category="food", budget_bucket="needs",
            date=date(YEAR, MONTH, 5),
        )
        result = detect_financial_anomalies(MONTH, YEAR, today=TODAY)
        types = [a["type"] for a in result["anomalies"]]
        assert "category_spike" in types
