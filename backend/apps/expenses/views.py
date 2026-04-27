from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.reports.views import resolve_month_year

from .models import FixedExpense, Income, VariableExpense
from .serializers import FixedExpenseSerializer, IncomeSerializer, VariableExpenseSerializer
from .services import (
    create_fixed_expense_record,
    create_income_record,
    create_variable_expense_record,
    delete_fixed_expense_record,
    delete_income_record,
    delete_variable_expense_record,
    register_payment,
    update_fixed_expense_record,
    update_income_record,
    update_variable_expense_record,
)


def extract_payload_and_reason(request):
    payload = request.data.copy()
    change_reason = payload.pop("change_reason", "")

    if isinstance(change_reason, list):
        change_reason = change_reason[0] if change_reason else ""

    return payload, str(change_reason or "").strip()


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
        payload, change_reason = extract_payload_and_reason(request)
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
        payload, change_reason = extract_payload_and_reason(request)
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
        _, change_reason = extract_payload_and_reason(request)

        try:
            delete_fixed_expense_record(instance, change_reason)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        _, change_reason = extract_payload_and_reason(request)
        result, error = self._handle_action(register_payment, pk, change_reason)

        if error:
            return error

        return Response({
            "fixed_expense": FixedExpenseSerializer(result["fixed_expense"]).data,
        })


class IncomeViewSet(viewsets.ModelViewSet):
    queryset = Income.objects.all().order_by("-date", "-id")
    serializer_class = IncomeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        if getattr(self, "action", None) != "list":
            return queryset

        try:
            month, year = resolve_month_year(self.request.query_params)
        except ValueError:
            return queryset.none()

        return queryset.filter(date__year=year, date__month=month)

    def create(self, request, *args, **kwargs):
        payload, change_reason = extract_payload_and_reason(request)
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)

        instance = create_income_record(serializer.validated_data, change_reason)
        output_serializer = self.get_serializer(instance)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        payload, change_reason = extract_payload_and_reason(request)
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
        _, change_reason = extract_payload_and_reason(request)

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
            month, year = resolve_month_year(self.request.query_params)
        except ValueError:
            return queryset.none()

        return queryset.filter(date__year=year, date__month=month)

    def create(self, request, *args, **kwargs):
        payload, change_reason = extract_payload_and_reason(request)
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)

        instance = create_variable_expense_record(serializer.validated_data, change_reason)
        output_serializer = self.get_serializer(instance)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        payload, change_reason = extract_payload_and_reason(request)
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
        _, change_reason = extract_payload_and_reason(request)

        try:
            delete_variable_expense_record(instance, change_reason)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(status=status.HTTP_204_NO_CONTENT)