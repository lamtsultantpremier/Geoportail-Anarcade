# permissions.py
from rest_framework.permissions import BasePermission

class IsSuperAdmin(BasePermission):
    """Accès réservé uniquement aux Super-administrateurs."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class SuperAdminSeulement(BasePermission):
    message = "Réservé au Super-admin."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_active and u.is_superuser)

    