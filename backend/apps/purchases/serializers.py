from django.utils import timezone
from rest_framework import serializers

from apps.configuration.models import get_category_type
from apps.configuration.serializers import validate_budget_bucket, validate_category_for_scope

from .models import Product, ProductConsumption, ProductRestock


class ProductSerializer(serializers.ModelSerializer):
    stock = serializers.DecimalField(max_digits=12, decimal_places=3, coerce_to_string=False)
    stock_min = serializers.DecimalField(max_digits=12, decimal_places=3, coerce_to_string=False)

    def validate(self, attrs):
        category = attrs.get("category")

        if category is None and self.instance is not None:
            category = self.instance.category

        if category is None:
            return attrs

        settings_data, _ = validate_category_for_scope(category, "inventory")
        validate_budget_bucket(settings_data, attrs, self.instance)

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
        if self.instance is None and not attrs.get("last_purchase"):
            attrs["last_purchase"] = timezone.localdate()
        return attrs

    class Meta:
        model = Product
        fields = "__all__"


class ProductConsumptionSerializer(serializers.ModelSerializer):
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, coerce_to_string=False)

    class Meta:
        model = ProductConsumption
        fields = ["id", "product", "quantity", "date", "created_at"]


class ProductRestockSerializer(serializers.ModelSerializer):
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, coerce_to_string=False)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False, allow_null=True)

    class Meta:
        model = ProductRestock
        fields = ["id", "product", "quantity", "unit_cost", "date", "created_at"]


class ProductStatsSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    period_days = serializers.IntegerField()
    date_from = serializers.DateField()
    date_to = serializers.DateField()
    total_consumed = serializers.FloatField()
    total_restocked = serializers.FloatField()
    consumption_count = serializers.IntegerField()
    restock_count = serializers.IntegerField()
    avg_daily_consumption = serializers.FloatField()
    avg_monthly_consumption = serializers.FloatField()
    estimated_days_remaining = serializers.IntegerField(allow_null=True)
    estimated_monthly_cost = serializers.FloatField(allow_null=True)
    avg_restock_interval_days = serializers.FloatField(allow_null=True)
    current_stock = serializers.FloatField()
    unit = serializers.CharField()