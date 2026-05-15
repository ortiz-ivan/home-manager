from rest_framework import serializers

from .models import SavingsGoal
from .services import get_goal_progress


class SavingsGoalSerializer(serializers.ModelSerializer):
    progress_pct = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()
    days_left = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()
    daily_required = serializers.SerializerMethodField()
    monthly_required = serializers.SerializerMethodField()

    class Meta:
        model = SavingsGoal
        fields = [
            "id",
            "name",
            "goal_type",
            "target_amount",
            "current_amount",
            "target_date",
            "notes",
            "is_active",
            "progress_pct",
            "remaining",
            "days_left",
            "is_completed",
            "daily_required",
            "monthly_required",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_target_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("El monto objetivo debe ser mayor a 0.")
        return value

    def validate_current_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("El monto actual no puede ser negativo.")
        return value

    def get_progress_pct(self, obj):
        return get_goal_progress(obj)["progress_pct"]

    def get_remaining(self, obj):
        return get_goal_progress(obj)["remaining"]

    def get_days_left(self, obj):
        return get_goal_progress(obj)["days_left"]

    def get_is_completed(self, obj):
        return get_goal_progress(obj)["is_completed"]

    def get_daily_required(self, obj):
        return get_goal_progress(obj)["daily_required"]

    def get_monthly_required(self, obj):
        return get_goal_progress(obj)["monthly_required"]
