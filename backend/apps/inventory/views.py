from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

from .models import Product
from .serializers import ProductSerializer
from .services import consume_product, restock_product, mark_product_out_of_stock


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    # -----------------------------
    # CONSUMIR PRODUCTO
    # -----------------------------
    @action(detail=True, methods=["post"])
    def consume(self, request, pk=None):
        try:
            quantity = int(request.data.get("quantity", 1))
            result = consume_product(pk, quantity)
        except (TypeError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "product": ProductSerializer(result["product"]).data,
            "low_stock": result["low_stock"]
        })

    # -----------------------------
    # REABASTECER PRODUCTO
    # -----------------------------
    @action(detail=True, methods=["post"])
    def restock(self, request, pk=None):
        try:
            quantity = int(request.data.get("quantity", 1))
            result = restock_product(pk, quantity)
        except (TypeError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "product": ProductSerializer(result["product"]).data
        })

    # Alias semantico para el flujo de compra rapido.
    @action(detail=True, methods=["post"])
    def buy(self, request, pk=None):
        try:
            quantity = int(request.data.get("quantity", 1))
            result = restock_product(pk, quantity)
        except (TypeError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "product": ProductSerializer(result["product"]).data
        })

    @action(detail=True, methods=["post"])
    def out_of_stock(self, request, pk=None):
        result = mark_product_out_of_stock(pk)

        return Response({
            "product": ProductSerializer(result["product"]).data,
            "low_stock": result["low_stock"],
        })