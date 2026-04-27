from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Product
from .serializers import ProductSerializer
from .services import consume_product, mark_product_out_of_stock, restock_product


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def _handle_action(self, func, *args):
        try:
            result = func(*args)
            return result, None
        except (TypeError, ValueError) as exc:
            return None, Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def consume(self, request, pk=None):
        quantity = int(request.data.get("quantity", 1))
        result, error = self._handle_action(consume_product, pk, quantity)

        if error:
            return error

        return Response({
            "product": ProductSerializer(result["product"]).data,
            "low_stock": result["low_stock"],
        })

    @action(detail=True, methods=["post"])
    def restock(self, request, pk=None):
        quantity = int(request.data.get("quantity", 1))
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