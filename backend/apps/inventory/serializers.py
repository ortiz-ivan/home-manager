from rest_framework import serializers
from django.utils import timezone

from .models import Income, Product, VariableExpense


class ProductSerializer(serializers.ModelSerializer):
    monthly_payment_status = serializers.SerializerMethodField()
    monthly_payment_date = serializers.SerializerMethodField()

    fixed_expense_categories = {"services", "subscription", "home"}

    def _get_current_month_payment(self, obj):
        if obj.category not in self.fixed_expense_categories:
            return None

        today = timezone.localdate()
        prefetched_payments = getattr(obj, "_prefetched_objects_cache", {}).get("fixed_payments")

        if prefetched_payments is not None:
            for payment in prefetched_payments:
                if payment.date.year == today.year and payment.date.month == today.month:
                    return payment
            return None

        return obj.fixed_payments.filter(date__year=today.year, date__month=today.month).first()

    def get_monthly_payment_status(self, obj):
        if obj.category not in self.fixed_expense_categories:
            return None
        return "paid" if self._get_current_month_payment(obj) else "pending"

    def get_monthly_payment_date(self, obj):
        payment = self._get_current_month_payment(obj)
        return payment.date.isoformat() if payment else None

    def validate(self, attrs):
        category = attrs.get("category")

        if category is None and self.instance is not None:
            category = self.instance.category

        if category is None:
            return attrs

        expected_type = Product.get_type_for_category(category)
        provided_type = attrs.get("type")

        if provided_type and provided_type != expected_type:
            raise serializers.ValidationError({
                "type": (
                    f"El tipo '{provided_type}' no corresponde a la categoria '{category}'. "
                    f"Debe ser '{expected_type}'."
                )
            })

        attrs["type"] = expected_type
        return attrs

    class Meta:
        model = Product
        fields = "__all__"


class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Income
        fields = "__all__"


class VariableExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = VariableExpense
        fields = "__all__"


class MonthlyFinanceSummarySerializer(serializers.Serializer):
    month = serializers.IntegerField()
    year = serializers.IntegerField()
    total_income = serializers.FloatField()
    home_estimated_expenses = serializers.FloatField()
    fixed_estimated_expenses = serializers.FloatField()
    variable_expenses = serializers.FloatField()
    estimated_expenses = serializers.FloatField()
    expense_percentage = serializers.FloatField(allow_null=True)
    remaining_balance = serializers.FloatField()