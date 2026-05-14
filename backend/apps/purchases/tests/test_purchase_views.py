from decimal import Decimal

import pytest

from apps.purchases.models import Product, ProductConsumption, ProductRestock

BASE = "/api/v1/products/"


@pytest.fixture
def product(db):
    return Product.objects.create(
        name="Arroz",
        category="food",
        type="consumable",
        stock=Decimal("5"),
        stock_min=Decimal("2"),
        unit="kg",
        price=10.0,
    )


@pytest.fixture
def inactive_product(db):
    return Product.objects.create(
        name="Archivado",
        category="food",
        type="consumable",
        is_active=False,
    )


# ---------------------------------------------------------------------------
# Lista y filtros
# ---------------------------------------------------------------------------

class TestProductList:
    def test_lista_solo_productos_activos(self, api, product, inactive_product):
        response = api.get(BASE)
        assert response.status_code == 200
        names = [p["name"] for p in response.data["results"]]
        assert "Arroz" in names
        assert "Archivado" not in names

    def test_filtra_por_categoria(self, api, db):
        Product.objects.create(name="Arroz", category="food", type="consumable")
        Product.objects.create(name="Jabon", category="cleaning", type="consumable")
        response = api.get(BASE, {"category": "food"})
        assert response.status_code == 200
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["category"] == "food"

    def test_filtra_por_budget_bucket(self, api, db):
        Product.objects.create(name="N", category="food", type="consumable", budget_bucket="needs")
        Product.objects.create(name="W", category="food", type="consumable", budget_bucket="wants")
        response = api.get(BASE, {"budget_bucket": "needs"})
        assert response.status_code == 200
        assert all(p["budget_bucket"] == "needs" for p in response.data["results"])

    def test_filtra_por_tipo(self, api, db):
        Product.objects.create(name="C", category="food", type="consumable")
        Product.objects.create(name="A", category="assets", type="asset")
        response = api.get(BASE, {"type": "asset"})
        assert response.status_code == 200
        assert all(p["type"] == "asset" for p in response.data["results"])

    def test_archived_retorna_inactivos(self, api, inactive_product, db):
        response = api.get(f"{BASE}archived/")
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]["name"] == "Archivado"


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

class TestProductCreate:
    def test_crea_producto(self, api, db):
        payload = {
            "name": "Leche",
            "category": "food",
            "type": "consumable",
            "unit": "litro",
            "stock": "2.000",
            "stock_min": "1.000",
        }
        response = api.post(BASE, payload, format="json")
        assert response.status_code == 201
        assert response.data["name"] == "Leche"
        assert Product.objects.filter(name="Leche").exists()

    def test_nombre_obligatorio_retorna_400(self, api, db):
        response = api.post(BASE, {"category": "food"}, format="json")
        assert response.status_code == 400

    def test_actualiza_producto(self, api, product):
        response = api.patch(f"{BASE}{product.pk}/", {"name": "Arroz integral"}, format="json")
        assert response.status_code == 200
        product.refresh_from_db()
        assert product.name == "Arroz integral"

    def test_elimina_producto(self, api, product):
        response = api.delete(f"{BASE}{product.pk}/")
        assert response.status_code == 204


# ---------------------------------------------------------------------------
# Acciones de stock
# ---------------------------------------------------------------------------

class TestProductStockActions:
    def test_consume_reduce_stock(self, api, product):
        response = api.post(f"{BASE}{product.pk}/consume/", {"quantity": "2"}, format="json")
        assert response.status_code == 200
        product.refresh_from_db()
        assert product.stock == Decimal("3")

    def test_consume_exceso_retorna_400(self, api, product):
        response = api.post(f"{BASE}{product.pk}/consume/", {"quantity": "999"}, format="json")
        assert response.status_code == 400

    def test_consume_responde_flag_low_stock(self, api, product):
        # stock=5, stock_min=2, consume 3 → stock=2 == stock_min → low_stock=True
        response = api.post(f"{BASE}{product.pk}/consume/", {"quantity": "3"}, format="json")
        assert response.status_code == 200
        assert response.data["low_stock"] is True

    def test_restock_aumenta_stock(self, api, product):
        response = api.post(f"{BASE}{product.pk}/restock/", {"quantity": "3"}, format="json")
        assert response.status_code == 200
        product.refresh_from_db()
        assert product.stock == Decimal("8")

    def test_out_of_stock_pone_cero(self, api, product):
        response = api.post(f"{BASE}{product.pk}/out_of_stock/", format="json")
        assert response.status_code == 200
        product.refresh_from_db()
        assert product.stock == Decimal("0")

    def test_stats_retorna_estructura(self, api, product):
        response = api.get(f"{BASE}{product.pk}/stats/")
        assert response.status_code == 200
        assert "total_consumed" in response.data
        assert "total_restocked" in response.data

    def test_historial_consumo(self, api, product):
        ProductConsumption.objects.create(product=product, quantity=Decimal("1"))
        response = api.get(f"{BASE}{product.pk}/consumption/")
        assert response.status_code == 200
        assert len(response.data) == 1

    def test_historial_reposiciones(self, api, product):
        ProductRestock.objects.create(product=product, quantity=Decimal("5"), unit_cost=Decimal("10"))
        response = api.get(f"{BASE}{product.pk}/restocks/")
        assert response.status_code == 200
        assert len(response.data) == 1
