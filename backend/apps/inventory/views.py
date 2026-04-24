from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.db.models import Sum
from django.utils import timezone

from .models import Income, Product, VariableExpense
from .serializers import (
    IncomeSerializer,
    MonthlyFinanceSummarySerializer,
    ProductSerializer,
    VariableExpenseSerializer,
)
from .services import (
    consume_product,
    restock_product,
    mark_product_out_of_stock,
    register_payment,
)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().prefetch_related("fixed_payments")
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
    queryset = Income.objects.all().order_by("-date", "-id")
    serializer_class = IncomeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if getattr(self, "action", None) != "list":
            return queryset

        today = timezone.localdate()

        try:
            month = int(self.request.query_params.get("month", today.month))
            year = int(self.request.query_params.get("year", today.year))
        except ValueError:
            return queryset.none()

        if month < 1 or month > 12:
            return queryset.none()

        return queryset.filter(date__year=year, date__month=month)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        date = validated_data.get("date") or timezone.localdate()
        source = validated_data.get("source", "").strip()
        notes = validated_data.get("notes", "").strip()

        existing_income = None
        if source:
            existing_income = Income.objects.filter(
                source__iexact=source,
                date__year=date.year,
                date__month=date.month,
            ).order_by("-date", "-id").first()

        if existing_income is not None:
            existing_income.amount += validated_data["amount"]
            existing_income.source = source
            existing_income.date = max(existing_income.date, date)

            if notes:
                existing_income.notes = (
                    f"{existing_income.notes} | {notes}"
                    if existing_income.notes
                    else notes
                )

            existing_income.save(update_fields=["amount", "source", "date", "notes"])
            output_serializer = self.get_serializer(existing_income)
            return Response(output_serializer.data, status=status.HTTP_200_OK)

        instance = serializer.save(source=source, date=date, notes=notes)
        output_serializer = self.get_serializer(instance)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class VariableExpenseViewSet(viewsets.ModelViewSet):
    queryset = VariableExpense.objects.all().order_by("-date", "-id")
    serializer_class = VariableExpenseSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if getattr(self, "action", None) != "list":
            return queryset

        today = timezone.localdate()

        try:
            month = int(self.request.query_params.get("month", today.month))
            year = int(self.request.query_params.get("year", today.year))
        except ValueError:
            return queryset.none()

        if month < 1 or month > 12:
            return queryset.none()

        return queryset.filter(date__year=year, date__month=month)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        date = validated_data.get("date") or timezone.localdate()
        category = validated_data["category"]
        description = validated_data.get("description", "").strip()
        notes = validated_data.get("notes", "").strip()

        existing_expense = VariableExpense.objects.filter(
            category=category,
            description__iexact=description,
            date__year=date.year,
            date__month=date.month,
        ).order_by("-date", "-id").first()

        if existing_expense is not None:
            existing_expense.amount += validated_data["amount"]
            existing_expense.date = max(existing_expense.date, date)
            existing_expense.description = description

            if notes:
                existing_expense.notes = (
                    f"{existing_expense.notes} | {notes}"
                    if existing_expense.notes
                    else notes
                )

            existing_expense.save(update_fields=["amount", "date", "description", "notes"])
            output_serializer = self.get_serializer(existing_expense)
            return Response(output_serializer.data, status=status.HTTP_200_OK)

        instance = serializer.save(date=date, description=description, notes=notes)
        output_serializer = self.get_serializer(instance)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


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

    home_inventory_categories = {"food", "cleaning", "hygiene", "assets"}
    fixed_expense_categories = {"services", "subscription", "home"}
    budget_target_ratio = {
        "needs": 0.5,
        "wants": 0.3,
        "savings": 0.2,
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
        home_estimated_expenses = 0.0
        fixed_estimated_expenses = 0.0
        budget_actuals = {
            "needs": 0.0,
            "wants": 0.0,
            "savings": 0.0,
        }

        for product in products:
            budget_bucket = product.budget_bucket or Product.get_budget_bucket_for_category(product.category)

            if product.category in self.fixed_expense_categories:
                fixed_amount = float(product.price or 0)
                fixed_estimated_expenses += fixed_amount
                budget_actuals[budget_bucket] += fixed_amount
                continue

            if product.category in self.home_inventory_categories:
                fallback_cost = self.category_unit_cost.get(product.category, 4)
                base_cost = float(product.price) if product.price and product.price > 0 else fallback_cost
                frequency = self.frequency_weight.get(product.usage_frequency, 1)
                projected_units = product.stock_min if product.type == "consumable" else 1
                estimate = projected_units * base_cost * frequency
                home_estimated_expenses += estimate
                budget_actuals[budget_bucket] += estimate

        variable_month_expenses = 0.0
        variable_expenses = VariableExpense.objects.filter(date__year=year, date__month=month)

        for expense in variable_expenses:
            amount = float(expense.amount or 0)
            budget_bucket = expense.budget_bucket or VariableExpense.get_budget_bucket_for_category(expense.category)
            variable_month_expenses += amount
            budget_actuals[budget_bucket] += amount

        estimated_expenses = home_estimated_expenses + fixed_estimated_expenses + variable_month_expenses

        month_income = (
            Income.objects.filter(date__year=year, date__month=month).aggregate(total=Sum("amount"))["total"]
            or 0
        )
        total_income = float(month_income)

        expense_percentage = None
        if total_income > 0:
            expense_percentage = (estimated_expenses / total_income) * 100

        budget_targets = {
            bucket: round(total_income * ratio, 2)
            for bucket, ratio in self.budget_target_ratio.items()
        }
        budget_actuals["needs"] = round(budget_actuals["needs"], 2)
        budget_actuals["wants"] = round(budget_actuals["wants"], 2)
        budget_actuals["savings"] = round(
            max(total_income - budget_actuals["needs"] - budget_actuals["wants"], 0),
            2,
        )
        budget_variance = {
            bucket: round(budget_actuals[bucket] - budget_targets[bucket], 2)
            for bucket in self.budget_target_ratio
        }

        payload = {
            "month": month,
            "year": year,
            "total_income": round(total_income, 2),
            "home_estimated_expenses": round(home_estimated_expenses, 2),
            "fixed_estimated_expenses": round(fixed_estimated_expenses, 2),
            "variable_expenses": round(variable_month_expenses, 2),
            "estimated_expenses": round(estimated_expenses, 2),
            "expense_percentage": round(expense_percentage, 2) if expense_percentage is not None else None,
            "remaining_balance": round(total_income - estimated_expenses, 2),
            "rule_50_30_20": {
                "targets": budget_targets,
                "actuals": budget_actuals,
                "variance": budget_variance,
            },
        }

        serializer = MonthlyFinanceSummarySerializer(payload)
        return Response(serializer.data)