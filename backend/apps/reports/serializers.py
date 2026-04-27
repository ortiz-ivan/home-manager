from rest_framework import serializers

from .models import FinancialEvent, MonthlyClose


class BudgetBucketSummarySerializer(serializers.Serializer):
    needs = serializers.FloatField()
    wants = serializers.FloatField()
    savings = serializers.FloatField()


class BudgetRuleSummarySerializer(serializers.Serializer):
    targets = BudgetBucketSummarySerializer()
    actuals = BudgetBucketSummarySerializer()
    variance = BudgetBucketSummarySerializer()


class MonthlyCloseSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyClose
        fields = ["id", "month", "year", "notes", "summary_snapshot", "created_at"]
        read_only_fields = ["id", "summary_snapshot", "created_at"]


class FinancialEventSerializer(serializers.ModelSerializer):
    entity_label = serializers.CharField(source="get_entity_type_display", read_only=True)
    action_label = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = FinancialEvent
        fields = [
            "id",
            "entity_type",
            "entity_label",
            "action",
            "action_label",
            "entity_id",
            "title",
            "amount",
            "effective_date",
            "month",
            "year",
            "reason",
            "previous_data",
            "current_data",
            "metadata",
            "created_at",
        ]


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
    monthly_close = MonthlyCloseSerializer(allow_null=True)