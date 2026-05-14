from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .filters import ProductFilter
from .models import Product, ProductConsumption, ProductRestock
from .serializers import (
    ProductConsumptionSerializer,
    ProductRestockSerializer,
    ProductSerializer,
    ProductStatsSerializer,
)
from .services import consume_product, get_product_stats, mark_product_out_of_stock, restock_product


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filterset_class = ProductFilter

    @staticmethod
    def _parse_quantity(raw_quantity):
        try:
            quantity = Decimal(str(raw_quantity if raw_quantity is not None else "1"))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise ValueError("La cantidad debe ser un numero valido") from exc

        return quantity

    def get_queryset(self):
        queryset = super().get_queryset()
        action = getattr(self, "action", None)

        if action == "list":
            return queryset.filter(is_active=True)

        if action == "archived":
            return queryset.filter(is_active=False)

        return queryset

    def _handle_action(self, func, *args):
        try:
            result = func(*args)
            return result, None
        except (TypeError, ValueError) as exc:
            return None, Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def archived(self, request):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def consume(self, request, pk=None):
        quantity = self._parse_quantity(request.data.get("quantity", 1))
        result, error = self._handle_action(consume_product, pk, quantity)

        if error:
            return error

        return Response({
            "product": ProductSerializer(result["product"]).data,
            "low_stock": result["low_stock"],
        })

    @action(detail=True, methods=["post"])
    def restock(self, request, pk=None):
        quantity = self._parse_quantity(request.data.get("quantity", 1))
        result, error = self._handle_action(restock_product, pk, quantity)

        if error:
            return error

        return Response({
            "product": ProductSerializer(result["product"]).data,
        })

    @action(detail=True, methods=["post"])
    def buy(self, request, pk=None):
        return self.restock(request, pk)

    @action(detail=True, methods=["post"])
    def out_of_stock(self, request, pk=None):
        result, error = self._handle_action(mark_product_out_of_stock, pk)

        if error:
            return error

        return Response({
            "product": ProductSerializer(result["product"]).data,
            "low_stock": result["low_stock"],
        })

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        days = self._parse_days(request.query_params.get("days", 90))
        try:
            data = get_product_stats(pk, days)
        except Product.DoesNotExist:
            return Response({"detail": "Producto no encontrado"}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProductStatsSerializer(data).data)

    @action(detail=True, methods=["get"])
    def consumption(self, request, pk=None):
        days = self._parse_days(request.query_params.get("days", 90))
        date_from = timezone.localdate() - timedelta(days=days - 1)
        qs = ProductConsumption.objects.filter(product_id=pk, date__gte=date_from)
        return Response(ProductConsumptionSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"])
    def restocks(self, request, pk=None):
        days = self._parse_days(request.query_params.get("days", 90))
        date_from = timezone.localdate() - timedelta(days=days - 1)
        qs = ProductRestock.objects.filter(product_id=pk, date__gte=date_from)
        return Response(ProductRestockSerializer(qs, many=True).data)

    @staticmethod
    def _parse_days(raw):
        try:
            return max(1, min(int(raw), 365))
        except (ValueError, TypeError):
            return 90