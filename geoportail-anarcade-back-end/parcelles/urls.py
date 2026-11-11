from parcelles import views
from parcelles.views import (
    liste_regions_avec_parcelles,
    liste_departements_avec_parcelles,
    liste_sous_prefectures_avec_parcelles,
    liste_localites_avec_parcelles,
    liste_quartiers_avec_parcelles,
    liste_parcelles,
    stats_parcelles,
    points_parcelles,
    polygones_parcelles,
    fiche_parcelle,
    recherche_parcelles,
    export_parcelles,
    liste_exploitants_api,
    fiche_exploitant,
    donnees_synthese,
    donnees_repartition,
    donnees_structure,
    donnees_profil,
    donnees_enquetes,
    donnees_recapitulatif,
    export_geometrie_parcelle,
    # ------------------------- Version 2 de l'application
    liste_regions_geojson,
    export_exploitants,
    imports_collection,
    import_detail,
    import_geojson,
    import_publier,
    import_annuler,
    import_apercu,
    liste_denombrements,
    stats_denombrements,
    filtres_denombrements,
    export_denombrements,
    options_geo_denombrements,
    options_geo_menages,
    stats_menages,
    liste_menages,
    export_menages,
    sig_arbre,
    export_sig,
    admin_tableau_bord,
    admin_exploitants,
    auth_login,
    auth_me,
    auth_logout,
    admin_utilisateurs,
    admin_utilisateur,
    admin_roles,
    admin_referentiels,
    admin_referentiel,
    admin_logs,
    admin_referentiel_item,
    admin_parametres,
    admin_sauvegardes,
    admin_sauvegarde,
    admin_versions,
    admin_version


    
    
)
"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path

urlpatterns = [
    # Filtres
    path(
        "filtres/regions/",
        liste_regions_avec_parcelles,
        name="regions-avec-parcelles",
    ),
    path(
        "filtres/departements/",
        liste_departements_avec_parcelles,
        name="departements-avec-parcelles",
    ),
    path(
        "filtres/sous-prefectures/",
        liste_sous_prefectures_avec_parcelles,
        name="sous-prefectures-avec-parcelles",
    ),
    path(
        "filtres/localites/",
        liste_localites_avec_parcelles,
        name="localites-avec-parcelles",
    ),
    path(
        "filtres/quartiers/",
        liste_quartiers_avec_parcelles,
        name="quartiers-avec-parcelles",
    ),
    path("parcelles/stats/", stats_parcelles, name="stats-parcelles"),
    path(
        "parcelles/",
        liste_parcelles,
        name="liste-parcelles",
    ),
    path("parcelles/points/", points_parcelles, name="points-parcelles"),
    path("parcelles/geojson/", polygones_parcelles, name="polygones-parcelles"),
    path("parcelles/<int:id_parc>/",fiche_parcelle,name="fiche-parcelle"),
    path("parcelles/recherche/",recherche_parcelles,name="recherche-parcelles"),
    path("parcelles/export/",export_parcelles,name="export-parcelles"),
    path("parcelles/<int:id_parc>/export/", export_geometrie_parcelle, name="export-geometrie-parcelle"),

    
    path("donnees/synthese/", donnees_synthese, name="donnees-synthese"),
    path("donnees/enquetes/", donnees_enquetes, name="donnees-enquetes"),
    path("donnees/repartition/", donnees_repartition, name="donnees-repartition"),
    path("donnees/structure/", donnees_structure, name="donnees-structure"),
    path("donnees/profil/", donnees_profil, name="donnees-profil"),
    path("donnees/recapitulatif/", donnees_recapitulatif, name="donnees-recapitulatif"),
    
    path("exploitants/<int:id_expl>/", fiche_exploitant, name="fiche-exploitant"),
    path("exploitants/", liste_exploitants_api, name="liste-exploitants"),
    # -------------- Version 2 de la plateforme ------------------------------------
    path('regions/geojson/',liste_regions_geojson,name="liste_region"),
    path("exploitants/export/", export_exploitants, name="export-exploitants"),

    #--------------- Version Import de parcelle---------------------------------------
    path("imports/", imports_collection, name="imports"),
    path("imports/<int:id_lot>/", import_detail, name="import-detail"),
    path("imports/<int:id_lot>/geojson/", import_geojson, name="import-geojson"),
    path("imports/<int:id_lot>/publier/", import_publier, name="import-publier"),
    path("imports/<int:id_lot>/annuler/", import_annuler, name="import-annuler"),

    # ---------------------- Version denombrement ---------------------
    path("denombrements/", liste_denombrements, name="liste-denombrements"),
    path("denombrements/stats/", stats_denombrements, name="stats-denombrements"),
    path("denombrements/filtres/", filtres_denombrements, name="filtres-denombrements"),
    path("denombrements/export/", export_denombrements, name="export-denombrements"),

    #---------------------- Version Parcelle -------------------------------
    path("menages/geo/<str:niveau>/", options_geo_menages, name="menages-geo"),
    path("menages/stats/", stats_menages, name="stats-menages"),
    path("menages/", liste_menages, name="liste-menages"),
    path("menages/export/", export_menages, name="export-menages"),

    #---------------------Version SIG ------------------------------
    path("sig/arbre/", sig_arbre, name="sig-arbre"),
    path("sig/export/", export_sig, name="sig-export"),

    # path('exploitants/<int:id>/',views.detail_exploitant,name="detail_exploitant")
    path("imports/<int:id_lot>/apercu/", import_apercu, name="import-apercu"),
    path("denombrements/geo/<str:niveau>/", options_geo_denombrements, name="denombrements-geo"),

    #-----------------------Administration de l'application ----------------------------
    path("admin-api/tableau-de-bord/", admin_tableau_bord, name="admin-tableau"),
    path("admin-api/exploitants/", admin_exploitants, name="admin-exploitants"),


    path("admin-api/auth/login/", auth_login, name="auth-login"),
    path("admin-api/auth/me/", auth_me, name="auth-me"),
    path("admin-api/auth/logout/", auth_logout, name="auth-logout"),
    path("admin-api/utilisateurs/", admin_utilisateurs, name="admin-utilisateurs"),
    path("admin-api/utilisateurs/<int:id_user>/", admin_utilisateur, name="admin-utilisateur"),
    path("admin-api/roles/", admin_roles, name="admin-roles"),
    path("admin-api/referentiels/", admin_referentiels, name="admin-referentiels"),
    path("admin-api/referentiels/<str:nom>/", admin_referentiel, name="admin-referentiel"),
    path("admin-api/referentiels/<str:nom>/<int:id_item>/", admin_referentiel_item, name="admin-referentiel-item"),
    path("admin-api/logs/", admin_logs, name="admin-logs"),
    path("admin-api/parametres/", admin_parametres, name="admin-parametres"),
    path("admin-api/sauvegardes/", admin_sauvegardes, name="admin-sauvegardes"),
    path("admin-api/sauvegardes/<str:nom>/", admin_sauvegarde, name="admin-sauvegarde"),

    #----- Version de l'application -----------------------------------
    path("admin-api/versions/", admin_versions, name="admin-versions"),
    path("admin-api/versions/<int:id_version>/", admin_version, name="admin-version"),
]
