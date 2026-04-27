from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.utils import timezone

from .models import (
    FinancialEvent,
    FixedExpense,
    Income,
    InventorySettings,
    MonthlyClose,
    Product,
    VariableExpense,
)
from .serializers import (
    FinancialEventSerializer,
    FixedExpenseSerializer,
    IncomeSerializer,
    InventorySettingsSerializer,
    MonthlyCloseSerializer,
    MonthlyFinanceSummarySerializer,
    ProductSerializer,
    VariableExpenseSerializer,
)
from .services import (
    calculate_monthly_finance_summary,
    create_fixed_expense_record,
    create_income_record,
    create_monthly_close,
    create_variable_expense_record,
    consume_product,
    delete_fixed_expense_record,
    delete_income_record,
    delete_variable_expense_record,
    get_active_financial_period,
    restock_product,
    mark_product_out_of_stock,
    register_payment,
    update_fixed_expense_record,
    update_income_record,
    update_variable_expense_record,
)


def _extract_payload_and_reason(request):
    payload = request.data.copy()
    change_reason = payload.pop("change_reason", "")

    if isinstance(change_reason, list):
        change_reason = change_reason[0] if change_reason else ""

    return payload, str(change_reason or "").strip()


def _resolve_month_year(query_params):
    default_month, default_year = get_active_financial_period()

    try:
        month = int(query_params.get("month", default_month))
        year = int(query_params.get("year", default_year))
    except ValueError:
        raise ValueError("Mes y anio deben ser valores numericos")

    if month < 1 or month > 12:
        raise ValueError("El mes debe estar entre 1 y 12")

    return month, year


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


    def get_queryset(self):
        return super().get_queryset()


class FixedExpenseViewSet(viewsets.ModelViewSet):
    queryset = FixedExpense.objects.all().prefetch_related("payments")
    serializer_class = FixedExpenseSerializer

    def _handle_action(self, func, *args):
        try:
            result = func(*args)
            return result, None
        except (TypeError, ValueError) as exc:
            return None, Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def create(self, request, *args, **kwargs):
        payload, change_reason = _extract_payload_and_reason(request)
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)

        try:
            instance = create_fixed_expense_record(serializer.validated_data, change_reason)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        output_serializer = self.get_serializer(instance)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        payload, change_reason = _extract_payload_and_reason(request)
        serializer = self.get_serializer(instance, data=payload, partial=partial)
        serializer.is_valid(raise_exception=True)

        try:
            updated_instance = update_fixed_expense_record(instance, serializer.validated_data, change_reason)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(self.get_serializer(updated_instance).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        _, change_reason = _extract_payload_and_reason(request)

        try:
            delete_fixed_expense_record(instance, change_reason)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        _, change_reason = _extract_payload_and_reason(request)
        result, error = self._handle_action(register_payment, pk, change_reason)

        if error:
            return error

        return Response({
            "fixed_expense": FixedExpenseSerializer(result["fixed_expense"]).data
        })


class IncomeViewSet(viewsets.ModelViewSet):
    queryset = Income.objects.all().order_by("-date", "-id")
    serializer_class = IncomeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if getattr(self, "action", None) != "list":
            return queryset

        try:
            month, year = _resolve_month_year(self.request.query_params)
        except ValueError:
            return queryset.none()

        return queryset.filter(date__year=year, date__month=month)

    def create(self, request, *args, **kwargs):
        payload, change_reason = _extract_payload_and_reason(request)
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)

        instance = create_income_record(serializer.validated_data, change_reason)
        output_serializer = self.get_serializer(instance)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        payload, change_reason = _extract_payload_and_reason(request)
        serializer = self.get_serializer(instance, data=payload, partial=partial)
        serializer.is_valid(raise_exception=True)

        try:
            updated_instance = update_income_record(instance, serializer.validated_data, change_reason)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(self.get_serializer(updated_instance).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        _, change_reason = _extract_payload_and_reason(request)

        try:
            delete_income_record(instance, change_reason)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(status=status.HTTP_204_NO_CONTENT)


class VariableExpenseViewSet(viewsets.ModelViewSet):
    queryset = VariableExpense.objects.all().order_by("-date", "-id")
    serializer_class = VariableExpenseSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if getattr(self, "action", None) != "list":
            return queryset

        try:
            month, year = _resolve_month_year(self.request.query_params)
        except ValueError:
            return queryset.none()

        return queryset.filter(date__year=year, date__month=month)

    def create(self, request, *args, **kwargs):
        payload, change_reason = _extract_payload_and_reason(request)
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)

        instance = create_variable_expense_record(serializer.validated_data, change_reason)
        output_serializer = self.get_serializer(instance)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        payload, change_reason = _extract_payload_and_reason(request)
        serializer = self.get_serializer(instance, data=payload, partial=partial)
        serializer.is_valid(raise_exception=True)

        try:
            updated_instance = update_variable_expense_record(instance, serializer.validated_data, change_reason)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(self.get_serializer(updated_instance).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        _, change_reason = _extract_payload_and_reason(request)

        try:
            delete_variable_expense_record(instance, change_reason)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(status=status.HTTP_204_NO_CONTENT)


class MonthlyFinanceSummaryView(APIView):
    def get(self, request):
        try:
            month, year = _resolve_month_year(request.query_params)
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = calculate_monthly_finance_summary(month, year)
        serializer = MonthlyFinanceSummarySerializer(payload)
        return Response(serializer.data)


class FinancialEventListView(APIView):
    def get(self, request):
        try:
            month, year = _resolve_month_year(request.query_params)
            limit = int(request.query_params.get("limit", 25))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        events = FinancialEvent.objects.filter(month=month, year=year)[: max(1, min(limit, 100))]
        serializer = FinancialEventSerializer(events, many=True)
        return Response(serializer.data)


class MonthlyCloseView(APIView):
    def get(self, request):
        closes = MonthlyClose.objects.all()
        serializer = MonthlyCloseSerializer(closes, many=True)
        return Response(serializer.data)

    def post(self, request):
        today = timezone.localdate()

        try:
            month = int(request.data.get("month", today.month))
            year = int(request.data.get("year", today.year))
        except (TypeError, ValueError):
            return Response({"detail": "Mes y anio deben ser numericos"}, status=status.HTTP_400_BAD_REQUEST)

        notes = str(request.data.get("notes", "")).strip()

        try:
            monthly_close = create_monthly_close(month, year, notes)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = MonthlyCloseSerializer(monthly_close)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class InventorySettingsView(APIView):
    def get(self, request):
        settings_instance = InventorySettings.get_solo()
        serializer = InventorySettingsSerializer(settings_instance)
        return Response(serializer.data)

    def put(self, request):
        settings_instance = InventorySettings.get_solo()
        serializer = InventorySettingsSerializer(settings_instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        settings_instance = InventorySettings.get_solo()
        current_config = settings_instance.get_config()
        payload_config = request.data.get("config", {})
        serializer = InventorySettingsSerializer(
            settings_instance,
            data={"config": {**current_config, **payload_config}},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)