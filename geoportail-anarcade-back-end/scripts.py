# python manage.py shell
from parcelles.views import ROLES, DROITS_DEFAUT, RoleDroit

# Sème uniquement ce qui manque sans supprimer l'existant
for r, ds in DROITS_DEFAUT.items():
    for d in ds:
        RoleDroit.objects.get_or_create(role=r, droit=d)