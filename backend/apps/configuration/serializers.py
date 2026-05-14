from rest_framework import serializers

from .models import (
    InventorySettings,
    get_budget_bucket_values,
    get_category_settings,
    get_household_option_values,
    merge_inventory_settings,
)


def validate_category_for_scope(category, scope):
    settings_data = InventorySettings.get_solo().get_config()
    category_settings = get_category_settings(settings_data, category)

    if category_settings is None or category_settings.get("scope") != scope:
        raise serializers.ValidationError({
            "category": f"La categoria '{category}' no esta habilitada para {scope}."
        })

    return settings_data, category_settings


def validate_budget_bucket(settings_data, attrs, instance=None):
    allowed_values = set(get_budget_bucket_values(settings_data))
    budget_bucket = attrs.get("budget_bucket")

    if budget_bucket is None and instance is not None:
        budget_bucket = instance.budget_bucket

    if budget_bucket and budget_bucket not in allowed_values:
        raise serializers.ValidationError({
            "budget_bucket": f"La bolsa '{budget_bucket}' no existe en la configuracion."
        })


def validate_household_option(settings_data, attrs, field_name, settings_key, instance=None):
    allowed_values = set(get_household_option_values(settings_data, settings_key))
    value = attrs.get(field_name)

    if value is None and instance is not None:
        value = getattr(instance, field_name, None)

    if value and value not in allowed_values:
        raise serializers.ValidationError({
            field_name: f"El valor '{value}' no existe en la configuracion {settings_key}."
        })


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


class HouseholdOptionSettingsSerializer(serializers.Serializer):
    value = serializers.CharField(max_length=50)
    label = serializers.CharField(max_length=80)


class InventorySettingsConfigSerializer(serializers.Serializer):
    categories = InventoryCategorySettingsSerializer(many=True)
    units = InventoryUnitSettingsSerializer(many=True)
    budget_buckets = InventoryBudgetBucketSettingsSerializer(many=True)
    usage_frequency_weights = InventoryUsageFrequencyWeightsSerializer()
    thresholds = InventoryThresholdSettingsSerializer()
    currency = InventoryCurrencySettingsSerializer()
    monthly_close_day = serializers.IntegerField(min_value=1, max_value=31)
    alerts = InventoryAlertSettingsSerializer()
    household_task_categories = HouseholdOptionSettingsSerializer(many=True)
    household_task_areas = HouseholdOptionSettingsSerializer(many=True)
    household_task_priorities = HouseholdOptionSettingsSerializer(many=True)

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

    def _validate_option_list(self, value, field_name):
        seen = set()
        for item in value:
            option_value = item["value"]
            if option_value in seen:
                raise serializers.ValidationError({field_name: f"El valor '{option_value}' esta duplicado."})
            seen.add(option_value)
        return value

    def validate_household_task_categories(self, value):
        return self._validate_option_list(value, "household_task_categories")

    def validate_household_task_areas(self, value):
        return self._validate_option_list(value, "household_task_areas")

    def validate_household_task_priorities(self, value):
        return self._validate_option_list(value, "household_task_priorities")

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
        original_config = instance.config
        instance.config = merge_inventory_settings(original_config)
        try:
            return super().to_representation(instance)
        finally:
            instance.config = original_config

    def update(self, instance, validated_data):
        config = validated_data.get("config")
        if config is not None:
            instance.config = merge_inventory_settings(config)
        instance.save()
        return instance