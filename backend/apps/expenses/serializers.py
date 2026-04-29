from django.utils import timezone
from rest_framework import serializers

from apps.configuration.serializers import validate_budget_bucket, validate_category_for_scope

from .models import FixedExpense, Income, VariableExpense


class FixedExpensePaymentHistorySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    date = serializers.DateField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class FixedExpenseSerializer(serializers.ModelSerializer):
    monthly_payment_status = serializers.SerializerMethodField()
    monthly_payment_date = serializers.SerializerMethodField()
    payment_history = serializers.SerializerMethodField()
    payment_count = serializers.SerializerMethodField()
    total_paid_amount = serializers.SerializerMethodField()

    def _get_payment_period(self):
        payment_month = self.context.get("payment_month")
        payment_year = self.context.get("payment_year")

        if payment_month and payment_year:
            return payment_month, payment_year

        today = timezone.localdate()
        return today.month, today.year

    def _get_current_month_payment(self, obj):
        payment_month, payment_year = self._get_payment_period()
        prefetched_payments = getattr(obj, "_prefetched_objects_cache", {}).get("payments")

        if prefetched_payments is not None:
            for payment in prefetched_payments:
                if payment.date.year == payment_year and payment.date.month == payment_month:
                    return payment
            return None

        return obj.payments.filter(date__year=payment_year, date__month=payment_month).first()

    def get_monthly_payment_status(self, obj):
        return "paid" if self._get_current_month_payment(obj) else "pending"

    def get_monthly_payment_date(self, obj):
        payment = self._get_current_month_payment(obj)
        return payment.date.isoformat() if payment else None

    def get_payment_history(self, obj):
        prefetched_payments = getattr(obj, "_prefetched_objects_cache", {}).get("payments")
        payments = prefetched_payments if prefetched_payments is not None else obj.payments.all()
        return FixedExpensePaymentHistorySerializer(payments, many=True).data

    def get_payment_count(self, obj):
        prefetched_payments = getattr(obj, "_prefetched_objects_cache", {}).get("payments")
        if prefetched_payments is not None:
            return len(prefetched_payments)
        return obj.payments.count()

    def get_total_paid_amount(self, obj):
        prefetched_payments = getattr(obj, "_prefetched_objects_cache", {}).get("payments")
        payments = prefetched_payments if prefetched_payments is not None else obj.payments.all()
        return round(sum(float(payment.amount or 0) for payment in payments), 2)

    def validate(self, attrs):
        category = attrs.get("category")

        if category is None and self.instance is not None:
            category = self.instance.category

        if category is None:
            return attrs

        settings_data, _ = validate_category_for_scope(category, "fixed_expense")
        validate_budget_bucket(settings_data, attrs, self.instance)

        if not attrs.get("budget_bucket"):
            attrs["budget_bucket"] = FixedExpense.get_budget_bucket_for_category(category)

        return attrs

    class Meta:
        model = FixedExpense
        fields = "__all__"


class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Income
        fields = "__all__"


class VariableExpenseSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        category = attrs.get("category")

        if category is None and self.instance is not None:
            category = self.instance.category

        if category is None:
            return attrs

        settings_data, _ = validate_category_for_scope(category, "variable_expense")
        validate_budget_bucket(settings_data, attrs, self.instance)

        if not attrs.get("budget_bucket"):
            attrs["budget_bucket"] = VariableExpense.get_budget_bucket_for_category(category)

        return attrs

    class Meta:
        model = VariableExpense
        fields = "__all__"