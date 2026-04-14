from rest_framework import serializers
from .models import Income, Product

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Income
        fields = "__all__"


class MonthlyFinanceSummarySerializer(serializers.Serializer):
    month = serializers.IntegerField()
    year = serializers.IntegerField()
    total_income = serializers.FloatField()
    estimated_expenses = serializers.FloatField()
    expense_percentage = serializers.FloatField(allow_null=True)
    remaining_balance = serializers.FloatField()