from django.conf import settings
from rest_framework.permissions import BasePermission


class ApiKeyPermission(BasePermission):
    """
    Requires X-Api-Key header to match API_KEY setting.
    If API_KEY is empty, all requests are allowed (dev mode).
    """

    def has_permission(self, request, view):
        api_key = getattr(settings, "API_KEY", "")
        if not api_key:
            return True
        return request.headers.get("X-Api-Key") == api_key
