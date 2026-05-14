from rest_framework.response import Response
from rest_framework.views import APIView

from .models import InventorySettings
from .serializers import InventorySettingsSerializer


class InventorySettingsView(APIView):
    serializer_class = InventorySettingsSerializer

    def get(self, request):
        settings_instance = InventorySettings.get_solo()
        serializer = InventorySettingsSerializer(settings_instance)
        return Response(serializer.data)

    def put(self, request):
        settings_instance = InventorySettings.get_solo()
        serializer = InventorySettingsSerializer(settings_instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        settings_instance = InventorySettings.get_solo()
        current_config = settings_instance.get_config()
        payload_config = request.data.get("config", {})
        serializer = InventorySettingsSerializer(
            settings_instance,
            data={"config": {**current_config, **payload_config}},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)