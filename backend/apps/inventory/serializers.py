from rest_framework import serializers
from django.utils import timezone

from .models import (
    FixedExpense,
    Income,
    InventorySettings,
    Product,
    VariableExpense,
    get_budget_bucket_values,
    get_category_settings,
    get_category_type,
    merge_inventory_settings,
)


def _validate_category_for_scope(category, scope):
    settings_data = InventorySettings.get_solo().get_config()
    category_settings = get_category_settings(settings_data, category)

    if category_settings is None or category_settings.get("scope") != scope:
        raise serializers.ValidationError({
            "category": f"La categoria '{category}' no esta habilitada para {scope}."
        })

    return settings_data, category_settings


def _validate_budget_bucket(settings_data, attrs, instance=None):
    allowed_values = set(get_budget_bucket_values(settings_data))
    budget_bucket = attrs.get("budget_bucket")

    if budget_bucket is None and instance is not None:
        budget_bucket = instance.budget_bucket

    if budget_bucket and budget_bucket not in allowed_values:
        raise serializers.ValidationError({
            "budget_bucket": f"La bolsa '{budget_bucket}' no existe en la configuracion."
        })


class ProductSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        category = attrs.get("category")

        if category is None and self.instance is not None:
            category = self.instance.category

        if category is None:
            return attrs

        settings_data, _ = _validate_category_for_scope(category, "inventory")
        _validate_budget_bucket(settings_data, attrs, self.instance)

        expected_type = get_category_type(settings_data, category, "consumable")
        provided_type = attrs.get("type")

        if provided_type and provided_type != expected_type:
            raise serializers.ValidationError({
                "type": (
                    f"El tipo '{provided_type}' no corresponde a la categoria '{category}'. "
                    f"Debe ser '{expected_type}'."
                )
            })

        attrs["type"] = expected_type
        if not attrs.get("budget_bucket"):
            attrs["budget_bucket"] = Product.get_budget_bucket_for_category(category)
        return attrs

    class Meta:
        model = Product
        fields = "__all__"


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

    def _get_current_month_payment(self, obj):
        today = timezone.localdate()
        prefetched_payments = getattr(obj, "_prefetched_objects_cache", {}).get("payments")

        if prefetched_payments is not None:
            for payment in prefetched_payments:
                if payment.date.year == today.year and payment.date.month == today.month:
                    return payment
            return None

        return obj.payments.filter(date__year=today.year, date__month=today.month).first()

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

        settings_data, _ = _validate_category_for_scope(category, "fixed_expense")
        _validate_budget_bucket(settings_data, attrs, self.instance)

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

        settings_data, _ = _validate_category_for_scope(category, "variable_expense")
        _validate_budget_bucket(settings_data, attrs, self.instance)

        if not attrs.get("budget_bucket"):
            attrs["budget_bucket"] = VariableExpense.get_budget_bucket_for_category(category)

        return attrs

    class Meta:
        model = VariableExpense
        fields = "__all__"


class BudgetBucketSummarySerializer(serializers.Serializer):
    needs = serializers.FloatField()
    wants = serializers.FloatField()
    savings = serializers.FloatField()


class BudgetRuleSummarySerializer(serializers.Serializer):
    targets = BudgetBucketSummarySerializer()
    actuals = BudgetBucketSummarySerializer()
    variance = BudgetBucketSummarySerializer()


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
    rule_50_30_20 = BudgetRuleSummarySerializer()


class InventoryCategorySettingsSerializer(serializers.Serializer):
    value = serializers.CharField(max_length=50)
    label = serializers.CharField(max_length=80)
    scope = serializers.ChoiceField(choices=["inventory", "fixed_expense", "variable_expense"])
    type = serializers.ChoiceField(choices=["consumable", "service", "subscription", "asset"])
    budget_bucket = serializers.CharField(max_length=20)
    fallback_unit_cost = serializers.FloatField(min_value=0)


class InventoryUnitSettingsSerializer(serializers.Serializer):
    value = serializers.CharField(max_length=40)
    label = serializers.CharField(max_length=80)


class InventoryBudgetBucketSettingsSerializer(serializers.Serializer):
    value = serializers.ChoiceField(choices=["needs", "wants", "savings"])
    label = serializers.CharField(max_length=80)
    target_ratio = serializers.FloatField(min_value=0)


class InventoryUsageFrequencyWeightsSerializer(serializers.Serializer):
    high = serializers.FloatField(min_value=0)
    medium = serializers.FloatField(min_value=0)
    low = serializers.FloatField(min_value=0)


class InventoryThresholdSettingsSerializer(serializers.Serializer):
    default_stock_min = serializers.IntegerField(min_value=0)
    low_stock_ratio = serializers.FloatField(min_value=0)
    critical_stock_ratio = serializers.FloatField(min_value=0)
    purchase_suggestion_stock_ratio = serializers.FloatField(min_value=0)


class InventoryCurrencySettingsSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=10)
    locale = serializers.CharField(max_length=20)
    maximum_fraction_digits = serializers.IntegerField(min_value=0, max_value=6)


class InventoryAlertSettingsSerializer(serializers.Serializer):
    expiring_soon_days = serializers.IntegerField(min_value=0)
    purchase_stale_days = serializers.IntegerField(min_value=0)
    critical_frequencies = serializers.ListField(
        child=serializers.ChoiceField(choices=["high", "medium", "low"]),
        allow_empty=False,
    )


class InventorySettingsConfigSerializer(serializers.Serializer):
    categories = InventoryCategorySettingsSerializer(many=True)
    units = InventoryUnitSettingsSerializer(many=True)
    budget_buckets = InventoryBudgetBucketSettingsSerializer(many=True)
    usage_frequency_weights = InventoryUsageFrequencyWeightsSerializer()
    thresholds = InventoryThresholdSettingsSerializer()
    currency = InventoryCurrencySettingsSerializer()
    monthly_close_day = serializers.IntegerField(min_value=1, max_value=31)
    alerts = InventoryAlertSettingsSerializer()

    def validate_budget_buckets(self, value):
        bucket_values = {item["value"] for item in value}
        required_values = {"needs", "wants", "savings"}

        if bucket_values != required_values:
            raise serializers.ValidationError("Deben existir exactamente las bolsas needs, wants y savings.")

        total_ratio = round(sum(float(item["target_ratio"]) for item in value), 4)
        if abs(total_ratio - 1) > 0.0001:
            raise serializers.ValidationError("Las reglas de buckets deben sumar 1.")

        return value

    def validate_categories(self, value):
        seen = set()
        for item in value:
            category_value = item["value"]
            if category_value in seen:
                raise serializers.ValidationError(f"La categoria '{category_value}' esta duplicada.")
            seen.add(category_value)
        return value

    def validate(self, attrs):
        bucket_values = {item["value"] for item in attrs["budget_buckets"]}
        for category in attrs["categories"]:
            if category["budget_bucket"] not in bucket_values:
                raise serializers.ValidationError({
                    "categories": "Todas las categorias deben apuntar a una bolsa valida."
                })
        return attrs


class InventorySettingsSerializer(serializers.ModelSerializer):
    config = InventorySettingsConfigSerializer()

    class Meta:
        model = InventorySettings
        fields = ["id", "config", "updated_at"]
        read_only_fields = ["id", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["config"] = merge_inventory_settings(instance.config)
        return data

    def update(self, instance, validated_data):
        config = validated_data.get("config")
        if config is not None:
            instance.config = merge_inventory_settings(config)
        instance.save()
        return instance