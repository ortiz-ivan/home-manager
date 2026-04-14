from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.db.models import Sum
from django.utils import timezone

from .models import Income, Product
from .serializers import (
    IncomeSerializer,
    MonthlyFinanceSummarySerializer,
    ProductSerializer,
)
from .services import (
    consume_product,
    restock_product,
    mark_product_out_of_stock,
    register_payment,
)


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
            "low_stock": result["low_stock"]
        })


    @action(detail=True, methods=["post"])
    def restock(self, request, pk=None):
        quantity = int(request.data.get("quantity", 1))
        result, error = self._handle_action(restock_product, pk, quantity)

        if error:
            return error

        return Response({
            "product": ProductSerializer(result["product"]).data
        })

    # Alias semántico
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


    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        result, error = self._handle_action(register_payment, pk)

        if error:
            return error

        return Response({
            "product": ProductSerializer(result["product"]).data
        })


class IncomeViewSet(viewsets.ModelViewSet):
    queryset = Income.objects.all()
    serializer_class = IncomeSerializer


class MonthlyFinanceSummaryView(APIView):
    category_unit_cost = {
        "food": 4.8,
        "cleaning": 6.2,
        "hygiene": 5.1,
        "home": 7.4,
        "mobility": 8.1,
        "maintenance": 10.5,
        "subscription": 9.5,
        "services": 12,
        "assets": 11.6,
        "leisure": 7.9,
    }

    frequency_weight = {
        "high": 1.5,
        "medium": 1,
        "low": 0.65,
    }

    def get(self, request):
        today = timezone.localdate()

        try:
            month = int(request.query_params.get("month", today.month))
            year = int(request.query_params.get("year", today.year))
        except ValueError:
            return Response(
                {"detail": "Mes y anio deben ser valores numericos"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if month < 1 or month > 12:
            return Response(
                {"detail": "El mes debe estar entre 1 y 12"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        products = Product.objects.all()
        estimated_expenses = 0.0

        for product in products:
            fallback_cost = self.category_unit_cost.get(product.category, 4)
            base_cost = float(product.price) if product.price and product.price > 0 else fallback_cost
            frequency = self.frequency_weight.get(product.usage_frequency, 1)
            projected_units = product.stock_min if product.type == "consumable" else 1
            estimated_expenses += projected_units * base_cost * frequency

        month_income = (
            Income.objects.filter(date__year=year, date__month=month).aggregate(total=Sum("amount"))["total"]
            or 0
        )
        total_income = float(month_income)

        expense_percentage = None
        if total_income > 0:
            expense_percentage = (estimated_expenses / total_income) * 100

        payload = {
            "month": month,
            "year": year,
            "total_income": round(total_income, 2),
            "estimated_expenses": round(estimated_expenses, 2),
            "expense_percentage": round(expense_percentage, 2) if expense_percentage is not None else None,
            "remaining_balance": round(total_income - estimated_expenses, 2),
        }

        serializer = MonthlyFinanceSummarySerializer(payload)
        return Response(serializer.data)