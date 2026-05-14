from decimal import Decimal, InvalidOperation

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .filters import SavingsGoalFilter
from .models import SavingsGoal
from .serializers import SavingsGoalSerializer
from .services import add_contribution


class SavingsGoalViewSet(viewsets.ModelViewSet):
    queryset = SavingsGoal.objects.all()
    serializer_class = SavingsGoalSerializer
    filterset_class = SavingsGoalFilter

    @action(detail=True, methods=["post"])
    def contribute(self, request, pk=None):
        raw = request.data.get("amount")
        try:
            amount = Decimal(str(raw))
        except (InvalidOperation, TypeError, ValueError):
            raise ValidationError({"detail": "El monto debe ser un numero valido."})

        goal_instance = self.get_object()
        try:
            updated_goal = add_contribution(goal_instance.id, amount)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        return Response(self.get_serializer(updated_goal).data, status=status.HTTP_200_OK)
