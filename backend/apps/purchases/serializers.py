from rest_framework import serializers

from apps.configuration.models import get_category_type
from apps.configuration.serializers import validate_budget_bucket, validate_category_for_scope

from .models import Product


class ProductSerializer(serializers.ModelSerializer):
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
        return attrs

    class Meta:
        model = Product
        fields = "__all__"