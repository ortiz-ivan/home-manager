from rest_framework import serializers
from .models import Income, Product, VariableExpense


class ProductSerializer(serializers.ModelSerializer):
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