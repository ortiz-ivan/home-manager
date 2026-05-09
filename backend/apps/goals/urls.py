from rest_framework.routers import DefaultRouter

from .views import SavingsGoalViewSet

router = DefaultRouter()
router.register(r"savings-goals", SavingsGoalViewSet, basename="savings-goal")

urlpatterns = [*router.urls]
