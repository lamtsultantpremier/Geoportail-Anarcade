from .permissions import IsSuperAdmin, SuperAdminSeulement


import json
import os
from django.http import FileResponse
import re
from django.db.models import OuterRef, Subquery, CharField
from openpyxl import Workbook
from openpyxl.cell import WriteOnlyCell
from openpyxl.cell.cell import ILLEGAL_CHARACTERS_RE
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from django.db.models.functions import Coalesce

from django.db import connection
from django.db.models import Avg
import csv
from datetime import date

from django.db.models import Q,Count,Sum
from rest_framework.pagination import PageNumberPagination
from django.http import HttpResponse, JsonResponse, StreamingHttpResponse

from django.views.decorators.http import require_GET
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings
from .models import (
    Region,
    Departement,
    SousPrefecture,
    Localite,
    Quartier,
    ParcelleCorrecte,
    District,
    Enquete,
    Georeferencement,
    Exploitant,
    ParcelleIncorrecte,
    Denombrement, 
    MilieuResidence,
    Menage, 
    ZoneDenombrement,
    Denombrement, 
    PieceJustificatif,
    ParcelleInfo,
    AuthUser,
    Campagne, 
    ModeFaireValoir, 
    NiveauInstruction,
    RoleDroit,
    JournalActivite, 
    Parametre,
    AppVersion,
)

import re
import subprocess
from pathlib import Path
from django.contrib.auth import authenticate
from django.contrib.auth.models import Group, User
from rest_framework.authtoken.models import Token
from rest_framework.decorators import authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, BasePermission

from django.db.models import Func, TextField
from django.shortcuts import get_object_or_404
from parcelles.pagination import (
    ParcellePagination,
    ExploitantPagination,
    DenombrementPagination,
    MenagePagination)
from decimal import Decimal, InvalidOperation
from django.db.models import Case, Count, DecimalField, Sum, Value, When
from django.db.models.functions import Cast, Replace
from django.db.models import BooleanField, FloatField

from collections import Counter
from datetime import date

from django.db.models import IntegerField
from django.db.models.functions import TruncMonth

# Import for geometry
import io
import tempfile
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape
import shapefile  # pyshp


from django.db import IntegrityError, transaction
from django.utils import timezone
from .models import ImportLot, ImportParcelle



class AsGeoJSON(Func):
    function = "ST_AsGeoJSON"
    output_field = TextField()

def droit_ecriture(nom):
    """Lecture avec voir_donnees_validees ; écriture avec voir_donnees_validees ET `nom`."""
    class P(BasePermission):
        message = "Droit insuffisant."

        def has_permission(self, request, view):
            u = request.user
            if not (u and u.is_authenticated and u.is_active):
                return False
            if not a_droit(u, "voir_donnees_validees"):
                return False
            return request.method in ("GET", "HEAD", "OPTIONS") or a_droit(u, nom)
    return P


def droit(nom):
    """Classe de permission DRF : l'utilisateur connecté doit avoir ce droit."""
    class Permission(BasePermission):
        message = "Droit insuffisant."

        def has_permission(self, request, view):
            u = request.user
            return bool(u and u.is_authenticated and u.is_active and a_droit(u, nom))
    return Permission


@api_view(['GET'])
def district_avec_exploitants(request):
   districts=District.objects.filter(region__departement__sousprefecture__localite__quartier__menage__exploitant__isnull=False)\
                                    .annotate(geojson=AsGeoJSON("geo_dist"))\
                                    .values("id_dist", "lib_dist", "geo_dist","geojson")\
                                    .distinct()\
                                    .order_by("lib_dist")
   return Response([
       {
            "id_dist": district["id_dist"],
            "lib_dist": district["lib_dist"],
            # "geometry": json.loads(district["geojson"]) if district["geojson"] else None,
      }
    for district in districts
   ])

@api_view(['GET'])
def get_regions_from_district(request,id_dist):
    district= get_object_or_404(District,id_dist=id_dist)

    regions=Region.objects.filter(
         id_dist=district.id_dist,
         departement__sousprefecture__localite__quartier__menage__exploitant__isnull=False,
    ).annotate(geojson=AsGeoJSON("geom_reg"))\
    .values("id_reg", "lib_reg","geojson")\
    .distinct()\
    .order_by("lib_reg")

    return Response(

       {
        "district":{
            "id":district.id_dist,
            "nom":district.lib_dist
        },
        "regions":[{
        "id_reg":region["id_reg"],
        "lib_reg":region["lib_reg"],
        # "geometry":json.loads(region["geojson"]) if region["geojson"] else None
      }for region in regions]
      }
     

    )
@api_view(['GET'])
def get_departments_from_region(request,id_reg):

    region = get_object_or_404(Region,id_reg=id_reg)

    departements=Departement.objects.filter(
        id_reg=region.id_reg, 
        sousprefecture__localite__quartier__menage__exploitant__isnull=False,
    ).annotate(geojson=AsGeoJSON("geom_dept"))\
    .distinct()\
    .values("id_dept","lib_dept","geojson")

    return Response(
        
        {
            "region":{
                "id":region.id_reg,
                "nom":region.lib_reg
            },
            "departements":[
            {
            "id_dept": departement["id_dept"],
            "lib_dept":departement["lib_dept"],
        #   "geometry":json.loads(departement["geojson"]) if departement["geojson"] else None
          } for departement in departements
        ]}
    )
@api_view()
def get_sous_pref_from_departements(request,id_dept):
    departement = get_object_or_404(Departement, id_dept=id_dept)

    sousprefectures = (
        SousPrefecture.objects
        .filter(id_dept=departement.id_dept,
                localite__quartier__menage__exploitant__isnull=False,)
        .annotate(geojson=AsGeoJSON('geo_s_pref'))
        .distinct()
        .values("id_s_pref", "lib_s_pref","geojson")
        .order_by("lib_s_pref")
    )

    return Response({
        "departement": {
            "id": departement.id_dept,
            "nom": departement.lib_dept,
        },
        "sousprefectures": [{
            "id_sp":sousprefecture["id_s_pref"],
            "nom":sousprefecture["lib_s_pref"],
            # "geometry":json.loads(sousprefecture["geojson"]) if sousprefecture["geojson"] else None
        } for sousprefecture in sousprefectures 
        ],
    })

@api_view(['GET'])
def get_loc_from_sous_pref(request,id_spf):
    sous_prefecture = get_object_or_404(SousPrefecture,id_s_pref=id_spf)

    localites = Localite.objects\
                        .filter(id_s_pref=sous_prefecture.id_s_pref,
                                quartier__menage__exploitant__isnull=False)\
                        .annotate(geojson=AsGeoJSON("geo_loc"))\
                        .distinct()\
                        .values("id_loc",
                                "lib_loc",
                                "geojson",
                                "id_zone_denombrement",
                                "id_zone_denombrement__code_zone")\
                        .order_by("lib_loc")
    resultat = [
        {
            "id": localite["id_loc"],
            "nom": localite["lib_loc"],
            "code_zone_denombrement" : localite["id_zone_denombrement__code_zone"] if localite["id_zone_denombrement"] else None
        } for localite in localites
    ]
    return Response({
        "sous_prefecture":{
            "id":sous_prefecture.id_s_pref,
            "nom": sous_prefecture.lib_s_pref,
            },
        "localites":[
            {
                "id": localite["id_loc"],
                "nom": localite["lib_loc"],
                "code_zone_denombrement" : localite["id_zone_denombrement__code_zone"] if localite["id_zone_denombrement"] else None
            } for localite in localites
            ]      
    }
    )
@api_view(["GET"])
def quarter_from_locality(request, localite_id):
    localite = get_object_or_404(Localite, id_loc=localite_id)

    quartiers = (
        Quartier.objects
        .filter(
            id_loc=localite.id_loc,
            menage__exploitant__isnull=False,
        )
        .values("id_quar", "lib_quar")
        .distinct()
        .order_by("lib_quar")
    )

    return Response({
        "localite": {
            "id": localite.id_loc,
            "nom": localite.lib_loc,
        },
        "quartiers": list(quartiers),
    })

@api_view(["GET"])
def districts_concerned(request):
      districts = (
        District.objects
        .filter(
            region__departement__sousprefecture__localite__quartier__menage__exploitant__parcellecorrecte__isnull=False
        )
        .values("id_dist", "lib_dist")
        .distinct()
        .order_by("lib_dist")
    )

      return Response(list(districts))



@api_view(["GET"])
def parcelles_par_district(request, district_id):
    district = get_object_or_404(District, id_dist=district_id)

    parcelles = (
        ParcelleCorrecte.objects
        .filter(
            id_expl__id_men__id_quar__id_loc__id_s_pref__id_dept__id_reg__id_dist=district.id_dist
        )
        .select_related(
            "id_expl",
            "id_enqt",
            "id_expl__id_men",
        )
        .order_by("id_parc")
    )

    resultat = [
        {
            "id": parcelle.id_parc,
            "code": parcelle.code_parc,
            "annee_mise_place": parcelle.annee_mise_place,
            "geom_parc": parcelle.geom_parc,
            "superficie_tracee": parcelle.superficie_tracee,
            "exploitant": {
                "id": parcelle.id_expl.id_expl,
                "code": parcelle.id_expl.code_expl,
                "nom": parcelle.id_expl.nom_expl,
                "prenom": parcelle.id_expl.pren_expl,
                "contacts": parcelle.id_expl.contacts,
            },
            "enqueteur": (
                {
                    "id": parcelle.id_enqt.id_enqt,
                    "nom": parcelle.id_enqt.nom_pren_enqt,
                    "contact": parcelle.id_enqt.cont_enqt,
                }
                if parcelle.id_enqt
                else None
            ),
        }
        for parcelle in parcelles
    ]

    return Response({
        "district": {
            "id": district.id_dist,
            "nom": district.lib_dist,
        },
        "parcelles": resultat,
    })




# Chemin depuis ParcelleCorrecte jusqu'à chaque niveau géographique.
# Chaque chemin mène à la clé primaire de l'objet géographique.
CHEMINS_GEO = {
    "region": (
        "id_expl__id_men__id_quar__id_loc__id_s_pref"
        "__id_dept__id_reg__id_reg"
    ),
    "departement": (
        "id_expl__id_men__id_quar__id_loc__id_s_pref"
        "__id_dept__id_dept"
    ),
    "sous_prefecture": (
        "id_expl__id_men__id_quar__id_loc__id_s_pref"
        "__id_s_pref"
    ),
    "localite": (
        "id_expl__id_men__id_quar__id_loc__id_loc"
    ),
    "quartier": (
        "id_expl__id_men__id_quar__id_quar"
    ),
}

# Champs utilisés pour retrouver le nom et l'identifiant de chaque niveau.
MODELES_GEO = {
    "region": (Region, "id_reg", "lib_reg"),
    "departement": (Departement, "id_dept", "lib_dept"),
    "sous_prefecture": (SousPrefecture, "id_s_pref", "lib_s_pref"),
    "localite": (Localite, "id_loc", "lib_loc"),
    "quartier": (Quartier, "id_quar", "lib_quar"),
}

# Pour chaque filtre fourni, le chemin partant de ParcelleCorrecte.
CHEMINS_FILTRES = {
    "region_id": "id_expl__id_men__id_quar__id_loc__id_s_pref__id_dept__id_reg__id_reg",
    "departement_id": "id_expl__id_men__id_quar__id_loc__id_s_pref__id_dept__id_dept",
    "sous_prefecture_id": "id_expl__id_men__id_quar__id_loc__id_s_pref__id_s_pref",
    "localite_id": "id_expl__id_men__id_quar__id_loc__id_loc",
    "quartier_id": "id_expl__id_men__id_quar__id_quar",
}

SUPERFICIE_VALIDE = r"^[0-9]+([.,][0-9]+)?$"
DECIMAL_HA = DecimalField(max_digits=14, decimal_places=6)
def avec_superficie(queryset):
    """
    Ajoute `superficie_ha` : le texte "0,357" converti en nombre.
    Les valeurs absentes ou illisibles donnent NULL (pas d'erreur SQL).
    """
    return queryset.annotate(
        superficie_ha=Case(
            When(
                superficie_tracee__regex=SUPERFICIE_VALIDE,
                then=Cast(
                    Replace("superficie_tracee", Value(","), Value(".")),
                    DECIMAL_HA,
                ),
            ),
            default=None,
            output_field=DECIMAL_HA,
        )
    )


def lire_decimal(valeur):
    """Convertit un paramètre d'URL en Decimal, ou None s'il est invalide."""
    try:
        return Decimal(str(valeur).replace(",", "."))
    except (InvalidOperation, TypeError):
        return None




def liste_valeurs(params, cle):
    """'3,7,12' → ['3', '7', '12'] (seuls les entiers sont gardés)."""
    brut = params.get(cle, "") or ""
    return [v.strip() for v in brut.split(",") if v.strip().isdigit()]

def parcelles_filtrees(params):
    """Renvoie les parcelles correspondant aux filtres géographiques reçus."""
    queryset = ParcelleCorrecte.objects.select_related(
        "id_expl",
        "id_expl__id_men",
        "id_expl__id_men__id_quar",
        "id_expl__id_men__id_quar__id_loc",
        "id_expl__id_men__id_quar__id_loc__id_s_pref",
        "id_expl__id_men__id_quar__id_loc__id_s_pref__id_dept",
        "id_expl__id_men__id_quar__id_loc__id_s_pref__id_dept__id_reg",
        "id_enqt",
    )

    for parametre, chemin in CHEMINS_FILTRES.items():
        valeurs = liste_valeurs(params, parametre)
        if valeurs:
            queryset = queryset.filter(**{f"{chemin}__in": valeurs})

    queryset = avec_superficie(queryset)
    sup_min = lire_decimal(params.get("superficie_min"))
    sup_max = lire_decimal(params.get("superficie_max"))
    if sup_min is not None:
        queryset = queryset.filter(superficie_ha__gte=sup_min)
    if sup_max is not None:
        queryset = queryset.filter(superficie_ha__lte=sup_max)

    return queryset


def options_geographiques(request, niveau):
    """
    Endpoint interne commun aux listes de régions, départements,
    sous-préfectures, localités et quartiers.
    """
    if niveau not in MODELES_GEO:
        return Response({"detail": "Niveau géographique inconnu."}, status=400)

    # Les options sont calculées à partir des parcelles qui correspondent
    # aux filtres déjà sélectionnés.
    parcelles = parcelles_filtrees(request.query_params)
    chemin = CHEMINS_GEO[niveau]

    ids = (
        parcelles
        .values_list(chemin, flat=True)
        .distinct()
    )

    modele, champ_id, champ_nom = MODELES_GEO[niveau]

    objets = (
        modele.objects
        .filter(**{f"{champ_id}__in": ids})
        .values(champ_id, champ_nom)
        .order_by(champ_nom)
    )

    return Response([
        {
            "id": objet[champ_id],
            "nom": objet[champ_nom],
        }
        for objet in objets
    ])


@api_view(["GET"])
def liste_regions_avec_parcelles(request):
    return options_geographiques(request, "region")


@api_view(["GET"])
def liste_departements_avec_parcelles(request):
    return options_geographiques(request, "departement")


@api_view(["GET"])
def liste_sous_prefectures_avec_parcelles(request):
    return options_geographiques(request, "sous_prefecture")


@api_view(["GET"])
def liste_localites_avec_parcelles(request):
    return options_geographiques(request, "localite")


@api_view(["GET"])
def liste_quartiers_avec_parcelles(request):
    return options_geographiques(request, "quartier")


@api_view(["GET"])
def liste_parcelles(request):
    """
    Renvoie les parcelles correspondant aux filtres, avec les informations
    de l'exploitant, de l'enquêteur et la géométrie.
    """
    parcelles = (
        parcelles_filtrees(request.query_params)
        .annotate(geojson=AsGeoJSON("geom_parc"))
        .order_by("id_parc")
    )

    resultat = []

    pagination = ParcellePagination()
    page = pagination.paginate_queryset(parcelles,request)

    for parcelle in page:
        # ST_AsGeoJSON renvoie du JSON sous forme de texte.
        # json.loads le convertit en objet JSON dans la réponse de l'API.
        try:
            geometrie = json.loads(parcelle.geojson) if parcelle.geojson else None
        except (TypeError, json.JSONDecodeError):
            geometrie = None

        exploitant = parcelle.id_expl
        enqueteur = parcelle.id_enqt

        resultat.append({
            "id": parcelle.id_parc,
            "code": parcelle.code_parc,
            "annee_mise_place": parcelle.annee_mise_place,
            "superficie_tracee": parcelle.superficie_tracee,
            "geometry": geometrie,
            "exploitant": {
                "id": exploitant.id_expl,
                "code": exploitant.code_expl,
                "nom": exploitant.nom_expl,
                "prenom": exploitant.pren_expl,
                "contacts": exploitant.contacts,
            },
            "enqueteur": (
                {
                    "id": enqueteur.id_enqt,
                    "nom": enqueteur.nom_pren_enqt,
                    "contact": enqueteur.cont_enqt,
                }
                if enqueteur
                else None
            ),
        })

    return pagination.get_paginated_response(resultat)

@api_view(["GET"])
def stats_parcelles(request):
    """Compteurs globaux pour les filtres reçus."""
    resume = parcelles_filtrees(request.query_params).aggregate(
        parcelles=Count("id_parc"),
        exploitants=Count("id_expl", distinct=True),
        hectares=Sum("superficie_ha"),
    )
    return Response({
        "parcelles": resume["parcelles"],
        "exploitants": resume["exploitants"],
        "hectares": round(float(resume["hectares"] or 0), 2),
    })

# ── Carte ──────────────────────────────────────────────────────────

class CoordX(Func):
    """Longitude d'un point situé à l'intérieur de la parcelle."""
    template = "ST_X(ST_PointOnSurface(%(expressions)s))"
    output_field = FloatField()


class CoordY(Func):
    """Latitude d'un point situé à l'intérieur de la parcelle."""
    template = "ST_Y(ST_PointOnSurface(%(expressions)s))"
    output_field = FloatField()


class GeoJSONSimplifie(Func):
    """Géométrie allégée (tolérance ≈ 2 m, 6 décimales) pour l'affichage."""
    template = "ST_AsGeoJSON(ST_SimplifyPreserveTopology(%(expressions)s, 0.00002), 6)"
    output_field = TextField()


LIMITE_POLYGONES = 1500


@api_view(["GET"])
def points_parcelles(request):
    """
    Un point par parcelle (format compact) : [id, code, lng, lat].
    Respecte tous les filtres, sans pagination.
    """
    lignes = (
        parcelles_filtrees(request.query_params)
        .filter(geom_parc__isnull=False)
        .annotate(lng=CoordX("geom_parc"), lat=CoordY("geom_parc"))
        .values_list("id_parc", "code_parc", "lng", "lat")
        .order_by()
    )
    points = [
        [id_parc, code, round(lng, 5), round(lat, 5)]
        for id_parc, code, lng, lat in lignes
        if lng is not None and lat is not None
    ]
    return Response({"count": len(points), "points": points})


@api_view(["GET"])
def polygones_parcelles(request):
    """
    Polygones des parcelles qui touchent la zone `bbox=ouest,sud,est,nord`.
    Accepte les mêmes filtres que les autres endpoints.
    """
    try:
        ouest, sud, est, nord = (
            float(v) for v in request.query_params.get("bbox", "").split(",")
        )
    except ValueError:
        return Response({"detail": "bbox attendu : ouest,sud,est,nord"}, status=400)

    lignes = list(
        parcelles_filtrees(request.query_params)
        .filter(geom_parc__isnull=False)
        .extra(
            where=[
                "ST_Intersects(parcelle_correcte.geom_parc, "
                "ST_MakeEnvelope(%s, %s, %s, %s, 4326))"
            ],
            params=[ouest, sud, est, nord],
        )
        .annotate(geojson=GeoJSONSimplifie("geom_parc"))
        .values_list("id_parc", "code_parc", "geojson")
        .order_by("id_parc")[: LIMITE_POLYGONES + 1]
    )

    tronque = len(lignes) > LIMITE_POLYGONES
    features = [
        {
            "type": "Feature",
            "geometry": json.loads(geojson) if geojson else None,
            "properties": {"id": id_parc, "code": code},
        }
        for id_parc, code, geojson in lignes[:LIMITE_POLYGONES]
    ]
    return Response({
        "type": "FeatureCollection",
        "truncated": tronque,
        "features": features,
    })

# ── Fiche d'une parcelle ───────────────────────────────────────────

def _suivre(objet, *chemin):
    """Suit une chaîne d'attributs en s'arrêtant proprement sur un None."""
    for nom in chemin:
        if objet is None:
            return None
        objet = getattr(objet, nom, None)
    return objet


def _iso(date):
    return date.isoformat() if date else None


def _url_photo(lien):
    """Lien de photo utilisable par le navigateur (relatif à MEDIA_URL si besoin)."""
    if not lien or not lien.strip():
        return None
    lien = lien.strip()
    if lien.startswith(("http://", "https://")):
        return lien
    return settings.MEDIA_URL.rstrip("/") + "/" + lien.lstrip("/")


# (clé de sortie, champ de parcelle_info, champ équivalent de parcelle_correcte)
CHAMPS_DETAIL_PARCELLE = [
    ("surface_utilisee", "surface_utilise", "surface_utilise"),
    ("jachere", "superficie_mise_en_jachere", "surface_mis_en_jachere"),
    ("en_production", "superficie_en_production", "superficie_en_production"),
    ("non_en_production", "superficie_non_en_production", "superficie_non_en_production"),
    ("culture_principale", "anarcade_culture_principal", "anarcade_culture_principal"),
    ("culture_associee", "culture_associe", "culture_associe"),
    ("nb_entretiens", "nb_entretiens_par_campagne", "nb_entretiens_par_campagne"),
    ("provenance_plants", "provenance_materiel_vegetal", "provenance_materiel_vegetal"),
    ("certification", "certification", "certification"),
    ("acces_conseil", "access_service_conseil", "access_service_conseil"),
    ("service_conseil", "service_conseil_utilise", "service_conseil_utilise"),
    ("rehabilitation", "rehabilitation_effectue", "rehabilitation_effectue"),
    ("sup_rehabilitee", "superficie_rehabilite", "superficie_rehabilite"),
    ("engrais", "utilisation_engrais", "utilisation_engrais"),
    ("phyto", "traitement_phytosanitaire", "traitement_phytosanitaire"),
    ("prix_engrais", "prix_engrais", "prix_engrais"),
    ("prix_entretien", "prix_entretien_parcelle", "prix_entretien_parcelle"),
    ("prix_pesticide", "prix_persticide", "prix_persticide"),
    ("prix_materiel", "prix_materiel_agricole", "prix_materiel_agricole"),
    ("effectif_permanent", "effectif_permanent", "effectif_permanent"),
    ("frequence_permanent", "frequence_permanent", None),
    ("salaire_permanent", "salaire_main_oeuvre_permanent", "salaire_main_oeuvre_permanent"),
    ("effectif_contractuel", "effectif_contractuel", "effectif_contractuel"),
    ("frequence_contractuel", "nb_frequence_contractuel", "nb_frequence_contractuel"),
    ("zone_interdite", "parcelle_zone_interdite", "parcelle_zone_interdite"),
]


def _details_parcelle(parcelle, info):
    """Détails agronomiques : parcelle_info en priorité, parcelle_correcte en secours."""
    out = {}
    for cle, champ_info, champ_correcte in CHAMPS_DETAIL_PARCELLE:
        valeur = getattr(info, champ_info, None) if info else None
        if valeur in (None, "") and champ_correcte:
            valeur = getattr(parcelle, champ_correcte, None)
        out[cle] = valeur
    return out


@api_view(["GET"])
def fiche_parcelle(request, id_parc):
    """Parcelle + localisation + exploitant + enquêteur + enquête, en un appel."""
    queryset = (
        avec_superficie(ParcelleCorrecte.objects)
        .select_related(
            "id_mode",
            "id_enqt",
            "id_expl",
            "id_expl__id_niv",
            "id_expl__id_men",
            "id_expl__id_men__id_quar__id_loc__id_s_pref"
            "__id_dept__id_reg__id_dist",
        )
        .annotate(lng=CoordX("geom_parc"), lat=CoordY("geom_parc"),geojson=GeoJSONSimplifie("geom_parc"),)
    )
    parcelle = get_object_or_404(queryset, id_parc=id_parc)

    exploitant = parcelle.id_expl
    enqueteur = parcelle.id_enqt
    menage = exploitant.id_men
    quartier = _suivre(menage, "id_quar")
    localite = _suivre(quartier, "id_loc")
    sous_pref = _suivre(localite, "id_s_pref")
    departement = _suivre(sous_pref, "id_dept")
    region = _suivre(departement, "id_reg")
    district = _suivre(region, "id_dist")

    # Enquête menée auprès de cet exploitant (par cet enquêteur s'il est connu)
    enquetes = Enquete.objects.filter(id_expl=exploitant.id_expl)
    if enqueteur:
        enquetes = enquetes.filter(id_enqt=enqueteur.id_enqt)
    enquete = enquetes.order_by("-date_enq").first()

    georef = (
        Georeferencement.objects.filter(id_parc=parcelle.id_parc)
        .order_by("-date_geor")
        .first()
    )

    return Response({
        "parcelle": {
            "id": parcelle.id_parc,
            "code": parcelle.code_parc,
            "annee_mise_place": parcelle.annee_mise_place,
            "superficie_ha": (
                float(parcelle.superficie_ha)
                if parcelle.superficie_ha is not None else None
            ),
            "mode_faire_valoir": _suivre(parcelle, "id_mode", "lib_mode"),
            "date_georeferencement": _iso(georef.date_geor) if georef else None,
            "lng": parcelle.lng,
            "lat": parcelle.lat,
            "geometrie": json.loads(parcelle.geojson) if parcelle.geojson else None,
        },
        "localisation": {
            "district": _suivre(district, "lib_dist"),
            "region": _suivre(region, "lib_reg"),
            "departement": _suivre(departement, "lib_dept"),
            "sous_prefecture": _suivre(sous_pref, "lib_s_pref"),
            "localite": _suivre(localite, "lib_loc"),
            "quartier": _suivre(quartier, "lib_quar"),
        },
        "exploitant": {
            "id": exploitant.id_expl,
            "code": exploitant.code_expl,
            "nom": exploitant.nom_expl,
            "prenom": exploitant.pren_expl,
            "date_naissance": _iso(exploitant.date_nais),
            "lieu_naissance": exploitant.lieu_nais,
            "pays_naissance": exploitant.pays_nais,
            "situation_matrimoniale": exploitant.situa_mat,
            "profession": exploitant.profession,
            "nationalite": exploitant.nationalite,
            "contacts": exploitant.contacts,
            "niveau_instruction": _suivre(exploitant, "id_niv", "lib_niv"),
            "code_menage": _suivre(menage, "code_men"),
            "photo_url": _url_photo(exploitant.lien_photo),
        },
        "enqueteur": (
            {
                "id": enqueteur.id_enqt,
                "code": enqueteur.code_enqt,
                "nom_complet": enqueteur.nom_pren_enqt,
                "contact": enqueteur.cont_enqt,
            }
            if enqueteur else None
        ),
        "enquete": (
            {
                "date": _iso(enquete.date_enq),
                "numero_questionnaire": enquete.num_questionnaire,
            }
            if enquete else None
        ),
       
    })

# ── Recherche ──────────────────────────────────────────────────────

@api_view(["GET"])
def recherche_parcelles(request):
    """
    Cherche dans le code parcelle, le nom/prénom/code de l'exploitant et la localité.
    Chaque mot saisi doit se retrouver quelque part ("kouassi erick" fonctionne).
    Respecte les filtres reçus. 10 résultats au maximum.
    """
    terme = request.query_params.get("q", "").strip()
    if len(terme) < 2:
        return Response({"results": []})

    queryset = parcelles_filtrees(request.query_params).filter(geom_parc__isnull=False)
    for mot in terme.split()[:5]:
        queryset = queryset.filter(
            Q(code_parc__icontains=mot)
            | Q(id_expl__code_expl__icontains=mot)
            | Q(id_expl__nom_expl__icontains=mot)
            | Q(id_expl__pren_expl__icontains=mot)
            | Q(id_expl__id_men__id_quar__id_loc__lib_loc__icontains=mot)
        )

    lignes = (
        queryset
        .annotate(lng=CoordX("geom_parc"), lat=CoordY("geom_parc"))
        .values(
            "id_parc", "code_parc",
            "id_expl__nom_expl", "id_expl__pren_expl",
            "id_expl__id_men__id_quar__id_loc__lib_loc",
            "lng", "lat",
        )
        .order_by("code_parc")[:10]
    )

    return Response({
        "results": [
            {
                "id": l["id_parc"],
                "code": l["code_parc"],
                "nom": l["id_expl__nom_expl"],
                "prenom": l["id_expl__pren_expl"],
                "localite": l["id_expl__id_men__id_quar__id_loc__lib_loc"],
                "lng": l["lng"],
                "lat": l["lat"],
            }
            for l in lignes
        ]
    })

# ── Export ─────────────────────────────────────────────────────────

LIMITE_EXPORT_GEOJSON = 5000
CHEMIN_LOC = "id_expl__id_men__id_quar__id_loc"
CHEMIN_SP = f"{CHEMIN_LOC}__id_s_pref"

ENTETES_CSV = [
    "Code parcelle", "Superficie (ha)", "Année de mise en place",
    "Code exploitant", "Nom", "Prénom", "Téléphone exploitant",
    "Enquêteur", "Téléphone enquêteur",
    "Région", "Département", "Sous-préfecture", "Localité", "Quartier",
]

CHAMPS_CSV = [
    "code_parc", "superficie_ha", "annee_mise_place",
    "id_expl__code_expl", "id_expl__nom_expl", "id_expl__pren_expl", "id_expl__contacts",
    "id_enqt__nom_pren_enqt", "id_enqt__cont_enqt",
    f"{CHEMIN_SP}__id_dept__id_reg__lib_reg",
    f"{CHEMIN_SP}__id_dept__lib_dept",
    f"{CHEMIN_SP}__lib_s_pref",
    f"{CHEMIN_LOC}__lib_loc",
    "id_expl__id_men__id_quar__lib_quar",
]


class _Echo:
    """Pseudo-fichier : csv.writer y 'écrit' et récupère la ligne formatée."""
    def write(self, valeur):
        return valeur


def _cellule(valeur):
    """Texte propre pour Excel ; neutralise les débuts de formule (= + - @)."""
    if valeur is None:
        return ""
    texte = str(valeur)
    return "'" + texte if texte[:1] in ("=", "+", "-", "@") else texte


@require_GET
def export_parcelles(request):
    """
    Export des parcelles filtrées.
    ?fmt=csv (défaut) : toutes les parcelles, en flux.
    ?fmt=geojson     : 5 000 parcelles au maximum, avec géométrie.
    Note : le paramètre ne s'appelle pas `format`, réservé par Django REST framework.
    """
    fmt = request.GET.get("fmt", "csv")
    queryset = parcelles_filtrees(request.GET).order_by("id_parc")
    jour = date.today().isoformat()

    if fmt == "geojson":
        lignes = list(
            queryset.filter(geom_parc__isnull=False)
            .annotate(geojson=AsGeoJSON("geom_parc"))
            .values_list(
                "code_parc", "superficie_ha", "annee_mise_place",
                "id_expl__code_expl", "id_expl__nom_expl", "id_expl__pren_expl",
                "geojson",
            )[: LIMITE_EXPORT_GEOJSON + 1]
        )
        tronque = len(lignes) > LIMITE_EXPORT_GEOJSON
        features = [
            {
                "type": "Feature",
                "geometry": json.loads(geojson) if geojson else None,
                "properties": {
                    "code": code,
                    "superficie_ha": float(sup) if sup is not None else None,
                    "annee_mise_place": annee,
                    "code_exploitant": code_expl,
                    "nom": nom,
                    "prenom": prenom,
                },
            }
            for code, sup, annee, code_expl, nom, prenom, geojson
            in lignes[:LIMITE_EXPORT_GEOJSON]
        ]
        reponse = HttpResponse(
            json.dumps({"type": "FeatureCollection", "truncated": tronque, "features": features}),
            content_type="application/geo+json",
        )
        reponse["Content-Disposition"] = f'attachment; filename="parcelles_anacarde_{jour}.geojson"'
        return reponse

    # CSV : séparateur ; et BOM UTF-8 pour qu'Excel (français) lise bien les accents
    lignes = queryset.values_list(*CHAMPS_CSV).iterator(chunk_size=2000)

    def flux():
        ecrivain = csv.writer(_Echo(), delimiter=";")
        yield "\ufeff"
        yield ecrivain.writerow(ENTETES_CSV)
        for ligne in lignes:
            ligne = list(ligne)
            if ligne[1] is not None:
                ligne[1] = str(ligne[1]).replace(".", ",")   # superficie : virgule décimale
            yield ecrivain.writerow([_cellule(v) for v in ligne])

    reponse = StreamingHttpResponse(flux(), content_type="text/csv; charset=utf-8")
    reponse["Content-Disposition"] = f'attachment; filename="parcelles_anacarde_{jour}.csv"'
    return reponse


# ── Exploitants ────────────────────────────────────────────────────

CHEMIN_QUARTIER = "id_men__id_quar__lib_quar"


def exploitants_avec_parcelles():
    """Exploitants ayant au moins une parcelle validée, avec leurs totaux."""
    return (
        Exploitant.objects
        .annotate(nb_parcelles=Count("parcellecorrecte"))
        .filter(nb_parcelles__gt=0)
    )


CHEMINS_FILTRES_EXPLOITANT = {
    "region_id": "id_men__id_quar__id_loc__id_s_pref__id_dept__id_reg__id_reg",
    "departement_id": "id_men__id_quar__id_loc__id_s_pref__id_dept__id_dept",
    "sous_prefecture_id": "id_men__id_quar__id_loc__id_s_pref__id_s_pref",
    "localite_id": "id_men__id_quar__id_loc__id_loc",
}

def exploitants_filtres(params):
    """Exploitants (avec parcelles validées) selon la recherche `q` et les filtres géographiques."""
    queryset = exploitants_avec_parcelles()

    terme = params.get("q", "").strip()
    for mot in terme.split()[:5]:
        queryset = queryset.filter(
            Q(nom_expl__icontains=mot)
            | Q(pren_expl__icontains=mot)
            | Q(code_expl__icontains=mot)
            | Q(contacts__icontains=mot)
            | Q(**{f"{CHEMIN_QUARTIER}__icontains": mot})
        )

    for parametre, chemin in CHEMINS_FILTRES_EXPLOITANT.items():
        valeurs = liste_valeurs(params, parametre)
        if valeurs:
            queryset = queryset.filter(**{f"{chemin}__in": valeurs})
    return queryset

@api_view(["GET"])
def liste_exploitants_api(request):
    """
    Liste paginée des exploitants (avec parcelles validées).
    Paramètres : q (recherche), page, page_size.
    """
    queryset = exploitants_filtres(request.query_params)

    queryset = queryset.select_related("id_men__id_quar").order_by(
        "nom_expl", "pren_expl", "id_expl"
    )

    pagination = ExploitantPagination()
    page = pagination.paginate_queryset(queryset, request)

    resultat = [
        {
            "id": e.id_expl,
            "code": e.code_expl,
            "nom": e.nom_expl,
            "prenom": e.pren_expl,
            "contacts": e.contacts,
            "quartier": (
                e.id_men.id_quar.lib_quar
                if e.id_men and e.id_men.id_quar else None
            ),
            "nb_parcelles": e.nb_parcelles,
        }
        for e in page
    ]
    return pagination.get_paginated_response(resultat)

# ── Fiche exploitant ───────────────────────────────────────────────

@api_view(["GET"])
def fiche_exploitant(request, id_expl):
    """Identité d'un exploitant, indicateurs et liste de ses parcelles validées."""
    exploitant = get_object_or_404(
        Exploitant.objects.select_related(
            "id_niv",
            "id_men__id_quar__id_loc__id_s_pref__id_dept__id_reg__id_dist",
            "id_men__id_quar__id_loc__id_zone_denombrement",
        ),
        id_expl=id_expl,
    )

    parcelles = list(
        avec_superficie(ParcelleCorrecte.objects.filter(id_expl=exploitant.id_expl))
        .select_related("id_mode", "id_enqt")
        .annotate(
            lng=CoordX("geom_parc"),
            lat=CoordY("geom_parc"),
            geojson=GeoJSONSimplifie("geom_parc"),
        )
        .order_by("code_parc")
    )

    ids_parcelles = [p.id_parc for p in parcelles]

    infos = {}
    for inf in ParcelleInfo.objects.filter(
        code_parcel__in=[p.code_parc for p in parcelles]
    ).order_by("id_parcel"):
        infos[inf.code_parcel] = inf          # en cas de doublon, la ligne la plus récente gagne

    dates_georeferencement = {}
    for g in (
        Georeferencement.objects
        .filter(id_parc__in=ids_parcelles)
        .order_by("id_parc", "-date_geor")
        .values("id_parc", "date_geor")
    ):
        dates_georeferencement.setdefault(g["id_parc"], g["date_geor"])

    menage = exploitant.id_men
    quartier = _suivre(menage, "id_quar")
    localite = _suivre(quartier, "id_loc")
    sous_pref = _suivre(localite, "id_s_pref")
    departement = _suivre(sous_pref, "id_dept")
    region = _suivre(departement, "id_reg")

    # Localisation propre à chaque parcelle : une requête pour toutes
    lieux = {
        l["id_parc"]: l
        for l in (
            ParcelleCorrecte.objects.filter(id_expl=exploitant.id_expl)
            .values(
                "id_parc",
                "id_expl__id_men__id_quar__id_loc__id_s_pref__lib_s_pref",
                "id_expl__id_men__id_quar__id_loc__id_s_pref__id_dept__lib_dept",
                "id_expl__id_men__id_quar__id_loc__id_s_pref__id_dept__id_reg__lib_reg",
            )
        )
    }
    cle_sp = "id_expl__id_men__id_quar__id_loc__id_s_pref__lib_s_pref"
    cle_dept = "id_expl__id_men__id_quar__id_loc__id_s_pref__id_dept__lib_dept"
    cle_reg = "id_expl__id_men__id_quar__id_loc__id_s_pref__id_dept__id_reg__lib_reg"

    liste = []
    for p in parcelles:
        lieu = lieux.get(p.id_parc, {})

        enqueteur = _suivre(p, "id_enqt")

        liste.append({
            "id": p.id_parc,
            "code": p.code_parc,
            "superficie_ha": (
                float(p.superficie_ha)
                if p.superficie_ha is not None
                else None
            ),
            "annee_mise_place": p.annee_mise_place,
            "mode_faire_valoir": _suivre(p, "id_mode", "lib_mode"),
            "region": lieu.get(cle_reg),
            "departement": lieu.get(cle_dept),
            "sous_prefecture": lieu.get(cle_sp),
            "lng": p.lng,
            "lat": p.lat,
            "geometrie": json.loads(p.geojson) if p.geojson else None,

            "enqueteur": {
                "code": _suivre(enqueteur, "code_enqt"),
                "nom": _suivre(enqueteur, "nom_pren_enqt"),
                "contact": _suivre(enqueteur, "cont_enqt"),
            } if enqueteur else None,

            "date_georeferencement": _iso(
                dates_georeferencement.get(p.id_parc)
            ),

            "details": _details_parcelle(p, infos.get(p.code_parc)),
        })

    superficie_totale = sum(p["superficie_ha"] or 0 for p in liste)
    sous_prefectures = sorted({p["sous_prefecture"] for p in liste if p["sous_prefecture"]})
    departements = sorted({p["departement"] for p in liste if p["departement"]})
    regions = sorted({p["region"] for p in liste if p["region"]})

    data = {
        "exploitant": {
            "id": exploitant.id_expl,
            "code": exploitant.code_expl,
            "nom": exploitant.nom_expl,
            "prenom": exploitant.pren_expl,
            "date_naissance": _iso(exploitant.date_nais),
            "lieu_naissance": exploitant.lieu_nais,
            "pays_naissance": exploitant.pays_nais,
            "nationalite": exploitant.nationalite,
            "situation_matrimoniale": exploitant.situa_mat,
            "profession": exploitant.profession,
            "niveau_instruction": _suivre(exploitant, "id_niv", "lib_niv"),
            "contacts": exploitant.contacts,
            "code_menage": _suivre(menage, "code_men"),
            "photo_url": _url_photo(exploitant.lien_photo),
        },
        "residence": {
            "quartier": _suivre(quartier, "lib_quar"),
            "localite": _suivre(localite, "lib_loc"),
            "sous_prefecture": _suivre(sous_pref, "lib_s_pref"),
            "departement": _suivre(departement, "lib_dept"),
            "region": _suivre(region, "lib_reg"),
        },
        "menage": {
            "nom_chef": _suivre(menage, "nom_chef"),
            "prenom_chef": _suivre(menage, "pren_chef"),
            "contact_chef": _suivre(menage, "cont_chef"),
            "nb_enfants": _suivre(menage, "nb_enfant"),
            "nb_femmes": _suivre(menage, "nb_femme"),
        },
        "indicateurs": {
            "nb_parcelles": len(liste),
            "nb_localisees": sum(1 for p in liste if p["geometrie"]),
            "superficie_totale_ha": round(superficie_totale, 2),
            "regions": regions,
            "departements": departements,
            "sous_prefectures": sous_prefectures,
        },
        "parcelles": liste,
    }

    e = exploitant
    district = _suivre(region, "id_dist")
    denomb = (
        Denombrement.objects.filter(id_men=menage.id_men)
        .select_related("id_milieu_residence").order_by("-id_denomb").first()
    ) if menage else None

    data["exploitant"].update({
        "sexe": e.sexe,
        "formation_agricole": e.formation_agricole,
        "justificatif_identite": e.justificatif_identite,
        "numero_justificatif": e.numero_justicatif,
        "nb_justificatifs": e.nb_justificatif_identite,
        "beneficie_cmu": e.benificie_cmu,
        "numero_securite_sociale": e.numero_securite_social,
        "compte_mobile": e.compte_mobile,
        "photo_cmu": e.photo_cmu,
        "photo_chemin": e.lien_photo,
    })

    data["residence"].update({
        "district": _suivre(district, "lib_dist"),
        "zone": _suivre(localite, "id_zone_denombrement", "code_zone"),
        "milieu": _suivre(denomb, "id_milieu_residence", "lib_mil"),
    })

    data["menage"].update({
        "code": _suivre(menage, "code_men"),
        "nb_personnes": _suivre(menage, "nb_personne_menage"),
        "nb_en_charge": _suivre(menage, "nb_personne_en_charge"),
        "nb_scolarises": _suivre(menage, "nb_enfant_scolarise"),
        "a_exploitant": _suivre(menage, "a_exploitant_anarcade"),
        "nb_exploitants_reel": (
            Exploitant.objects.filter(id_men=menage.id_men).count() if menage else None
        ),
        "distance_sante": _suivre(menage, "distance_infr_sante"),
        "distance_ecole": _suivre(menage, "distance_etabl_scol"),
    })

    data["habitat"] = {
        "type_batiment": _suivre(menage, "type_batiment"),
        "murs": _suivre(menage, "materiaux_principal_murs"),
        "toit": _suivre(menage, "materiaux_principal_toit"),
        "sanitaire": _suivre(menage, "type_sanitaire"),
        "combustible": _suivre(menage, "source_combustible"),
        "eclairage": _suivre(menage, "source_eclairage"),
        "eau": _suivre(menage, "source_eau"),
    }
    data["quartier_services"] = {
        "reseau": _suivre(quartier, "reseau_accessible"),
        "internet": _suivre(quartier, "acces_internet"),
        "infr_sante": _suivre(quartier, "infrastr_sante"),
        "banque": _suivre(quartier, "structure_bancaire"),
    }

    data["socio"] = {
        "compte_bancaire": e.a_compte_bancaire,
        "raison_absence_compte": e.raison_absence_compte_bancaire,
        "montant_mensuel": e.montant_mensuel_transaction,
        "montant_max": e.montant_max_transaction,
        "depense_sante": e.depense_sante,
        "mobile_money": e.a_deja_utilise_compte_mobile_money,
        "raison_absence_mobile_money": e.raison_absence_compte_mobile_money,
        "membre_organisation": e.appartient_a_organisation_producteur,
        "type_organisation": e.type_organisation,
        "specialisation": e.specialisation_organisation,
        "tontine": e.participe_a_tontine,
        "type_tontine": e.type_tontine,
        "montant_tontine": e.montant_tontine,
        "batiment_stockage": e.a_batiment_stockage,
        "capacite_stockage": e.capacite_stockage,
        "machine_agricole": e.a_machine_agricole,
        "machine_agricole_detail": e.machine_agricole,
        "sechage": e.equipement_sechage,
        "brouettes": e.nb_brouette, "machettes": e.nb_machette,
        "atomisateurs": e.nb_atomisateur, "balances": e.nb_bascule,
        "tronconneuses": e.nb_tronconneuse, "automobiles": e.nb_atomobile,
        "motocyclettes": e.nb_motocyclette, "tricycles": e.nb_tricycle,
        "animaux_trait": e.nb_animaux_trait, "charrettes": e.nb_charette,
        "bicyclettes": e.nb_bicyclette, "autres_materiels": e.nb_autre_materiel,
    }

    data["pieces"] = [
        {
            "type": p.type_piece, "numero": p.numero_piece, "chemin": p.chemin_photo,
            "photo_url": _url_photo(p.chemin_photo),
            "date": p.date_enregistrement.isoformat() if p.date_enregistrement else None,
        }
        for p in PieceJustificatif.objects.filter(id_expl=e.id_expl).order_by("-date_enregistrement")
    ]
    data["exploitant"]["photo_cmu_url"] = _url_photo(e.photo_cmu)
    return Response(data)





# ── Données : synthèse ─────────────────────────────────────────────

def _vide(champ):
    """Valeur absente : NULL ou texte vide."""
    return Q(**{f"{champ}__isnull": True}) | Q(**{champ: ""})


@api_view(["GET"])
def donnees_synthese(request):
    """Indicateurs clés et fiabilité des données, pour les filtres reçus."""
    parcelles = parcelles_filtrees(request.query_params)

    p = parcelles.aggregate(
        parcelles=Count("id_parc"),
        exploitants=Count("id_expl", distinct=True),
        hectares=Sum("superficie_ha"),
        moyenne=Avg("superficie_ha"),
        sans_superficie=Count("id_parc", filter=Q(superficie_ha__isnull=True)),
        sans_enqueteur=Count("id_parc", filter=Q(id_enqt__isnull=True)),
        sans_geometrie=Count("id_parc", filter=Q(geom_parc__isnull=True)),
    )

    exploitants = Exploitant.objects.filter(id_expl__in=parcelles.values("id_expl"))
    e = exploitants.aggregate(
        total=Count("id_expl"),
        sans_contact=Count("id_expl", filter=_vide("contacts")),
        sans_nom=Count("id_expl", filter=_vide("nom_expl")),
        sans_menage=Count("id_expl", filter=Q(id_men__isnull=True)),
    )

    # Taux de validation : global (la table des parcelles rejetées n'a pas de localisation)
    correctes = ParcelleCorrecte.objects.count()
    incorrectes = ParcelleIncorrecte.objects.count()

    def taux(n, total):
        return round(100 * n / total, 1) if total else 0

    return Response({
        "indicateurs": {
            "parcelles": p["parcelles"],
            "exploitants": p["exploitants"],
            "hectares": round(float(p["hectares"] or 0), 2),
            "superficie_moyenne": round(float(p["moyenne"] or 0), 2),
        },
        "qualite": {
            "parcelles": p["parcelles"],
            "sans_superficie": p["sans_superficie"],
            "sans_enqueteur": p["sans_enqueteur"],
            "sans_geometrie": p["sans_geometrie"],
            "exploitants": e["total"],
            "sans_contact": e["sans_contact"],
            "sans_nom": e["sans_nom"],
            "sans_menage": e["sans_menage"],
        },
        "validation": {
            "correctes": correctes,
            "incorrectes": incorrectes,
            "taux": taux(correctes, correctes + incorrectes),
        },
    })

# ── Données : répartition géographique ─────────────────────────────

# niveau affiché → (champ identifiant, champ nom, libellé)
NIVEAUX_REPARTITION = {
    "region": (
        f"{CHEMIN_SP}__id_dept__id_reg__id_reg",
        f"{CHEMIN_SP}__id_dept__id_reg__lib_reg",
        "Région",
    ),
    "departement": (
        f"{CHEMIN_SP}__id_dept__id_dept",
        f"{CHEMIN_SP}__id_dept__lib_dept",
        "Département",
    ),
    "sous_prefecture": (
        f"{CHEMIN_SP}__id_s_pref",
        f"{CHEMIN_SP}__lib_s_pref",
        "Sous-préfecture",
    ),
    "localite": (
        f"{CHEMIN_LOC}__id_loc",
        f"{CHEMIN_LOC}__lib_loc",
        "Localité",
    ),
}


@api_view(["GET"])
def donnees_repartition(request):
    """
    Parcelles, exploitants et hectares par zone.
    Le niveau s'adapte aux filtres : sans région on groupe par région,
    avec une région par département, etc.
    """
    p = request.query_params
    if not p.get("region_id"):
        niveau = "region"
    elif not p.get("departement_id"):
        niveau = "departement"
    elif not p.get("sous_prefecture_id"):
        niveau = "sous_prefecture"
    else:
        niveau = "localite"

    champ_id, champ_nom, libelle = NIVEAUX_REPARTITION[niveau]

    lignes = (
        parcelles_filtrees(p)
        .order_by()
        .values(champ_id, champ_nom)
        .annotate(
            parcelles=Count("id_parc"),
            exploitants=Count("id_expl", distinct=True),
            hectares=Sum("superficie_ha"),
        )
        .order_by("-parcelles")
    )

    return Response({
        "niveau": niveau,
        "libelle": libelle,
        "rows": [
            {
                "id": l[champ_id],
                "nom": l[champ_nom],
                "parcelles": l["parcelles"],
                "exploitants": l["exploitants"],
                "hectares": round(float(l["hectares"] or 0), 2),
            }
            for l in lignes
        ],
    })

# ── Données : structure des exploitations ──────────────────────────

ANNEE_MIN_VALIDE = 1950

CLASSES_SUPERFICIE = [
    ("Moins de 1 ha", None, 1),
    ("1 à 3 ha", 1, 3),
    ("3 à 5 ha", 3, 5),
    ("5 à 10 ha", 5, 10),
    ("Plus de 10 ha", 10, None),
]


def _borne(lo, hi):
    q = Q(superficie_ha__isnull=False)
    if lo is not None:
        q &= Q(superficie_ha__gte=lo)
    if hi is not None:
        q &= Q(superficie_ha__lt=hi)
    return q


@api_view(["GET"])
def donnees_structure(request):
    parcelles = parcelles_filtrees(request.query_params)
    annee = date.today().year

    # Années plausibles uniquement : les valeurs aberrantes sont ignorées
    valide = Q(annee_mise_place__gte=ANNEE_MIN_VALIDE, annee_mise_place__lte=annee)
    ages = [
        ("Moins de 5 ans", valide & Q(annee_mise_place__gt=annee - 5)),
        ("5 à 15 ans", valide & Q(annee_mise_place__lte=annee - 5, annee_mise_place__gt=annee - 15)),
        ("15 à 30 ans", valide & Q(annee_mise_place__lte=annee - 15, annee_mise_place__gt=annee - 30)),
        ("Plus de 30 ans", valide & Q(annee_mise_place__lte=annee - 30)),
    ]

    agg = {f"s{i}": Count("id_parc", filter=_borne(lo, hi))
           for i, (_, lo, hi) in enumerate(CLASSES_SUPERFICIE)}
    agg.update({f"a{i}": Count("id_parc", filter=q) for i, (_, q) in enumerate(ages)})
    r = parcelles.aggregate(**agg)

    # Nombre de parcelles par exploitant
    par_exploitant = Counter(
        parcelles.order_by().values("id_expl").annotate(n=Count("id_parc")).values_list("n", flat=True)
    )
    exploitants = [
        {"label": str(n) if n < 5 else "5 et plus",
         "exploitants": sum(c for k, c in par_exploitant.items() if (k == n if n < 5 else k >= 5))}
        for n in range(1, 6)
    ]

    foncier = (
        parcelles.order_by()
        .values("id_mode__lib_mode")
        .annotate(parcelles=Count("id_parc"), hectares=Sum("superficie_ha"))
        .order_by("-parcelles")
    )

    return Response({
        "superficie": [
            {"label": lib, "parcelles": r[f"s{i}"]}
            for i, (lib, _, _) in enumerate(CLASSES_SUPERFICIE)
        ],
        "parcelles_par_exploitant": exploitants,
        "age_vergers": [
            {"label": lib, "parcelles": r[f"a{i}"]} for i, (lib, _) in enumerate(ages)
        ],
        "foncier": [
            {
                "label": f["id_mode__lib_mode"] or "Non renseigné",
                "parcelles": f["parcelles"],
                "hectares": round(float(f["hectares"] or 0), 2),
            }
            for f in foncier
        ],
    })
# ── Données : profil des exploitants ───────────────────────────────

TRANCHES_AGE = [
    ("Moins de 30 ans", 15, 29),
    ("30 à 44 ans", 30, 44),
    ("45 à 59 ans", 45, 59),
    ("60 ans et plus", 60, 110),
]
ENFANTS_MAX = 25


def _repartition_champ(queryset, champ):
    lignes = (
        queryset.order_by()
        .values(champ)
        .annotate(n=Count("id_expl"))
        .order_by("-n")
    )
    return [{"label": l[champ] or "Non renseigné", "exploitants": l["n"]} for l in lignes]



@api_view(["GET"])
def donnees_profil(request):
    parcelles = parcelles_filtrees(request.query_params)
    exploitants = Exploitant.objects.filter(id_expl__in=parcelles.values("id_expl"))

    # Âge : dates plausibles uniquement
    aujourdhui = date.today()

    def naissance(age):
        try:
            return aujourdhui.replace(year=aujourdhui.year - age)
        except ValueError:  # 29 février
            return aujourdhui.replace(year=aujourdhui.year - age, day=28)

    agg = {}
    for i, (_, mini, maxi) in enumerate(TRANCHES_AGE):
        agg[f"t{i}"] = Count(
            "id_expl",
            filter=Q(
                date_nais__lte=naissance(mini),
                date_nais__gt=naissance(maxi + 1),
                date_nais__gte=date(1900, 1, 1),
            ),
        )
    ages = exploitants.aggregate(**agg)

    # Taille du ménage : texte → entier, valeurs invalides ignorées
    menages = (
        exploitants
        .filter(id_men__nb_enfant__regex=r"^[0-9]{1,2}$")
        .annotate(enfants=Cast("id_men__nb_enfant", IntegerField()))
        .filter(enfants__lte=ENFANTS_MAX)
    )
    par_enfants = Counter(menages.values_list("enfants", flat=True))
    enfants = [{"label": str(n), "exploitants": c} for n, c in sorted(par_enfants.items())]
    total_menages = sum(par_enfants.values())
    moyenne = (
        round(sum(n * c for n, c in par_enfants.items()) / total_menages, 1)
        if total_menages else None
    )

    return Response({
        "age": [
            {"label": lib, "exploitants": ages[f"t{i}"]}
            for i, (lib, _, _) in enumerate(TRANCHES_AGE)
        ],
        "instruction": _repartition_champ(exploitants, "id_niv__lib_niv"),
        "situation": _repartition_champ(exploitants, "situa_mat"),
        "enfants": enfants,
        "enfants_moyenne": moyenne,
    })

# ── Données : suivi des enquêtes ───────────────────────────────────

ENQUETE_DATE_MIN = date(2010, 1, 1)
LIMITE_ENQUETEURS = 50


def _mois_suivant(d):
    return date(d.year + (d.month == 12), d.month % 12 + 1, 1)


@api_view(["GET"])
def donnees_enquetes(request):
    parcelles = parcelles_filtrees(request.query_params)
    aujourdhui = date.today()

    # Enquêtes menées auprès des exploitants de la zone (dates plausibles uniquement)
    enquetes = Enquete.objects.filter(
        id_expl__in=parcelles.values("id_expl"),
        date_enq__gte=ENQUETE_DATE_MIN,
        date_enq__lte=aujourdhui,
    )

    comptes = {
        l["mois"]: l["n"]
        for l in enquetes.order_by()
        .annotate(mois=TruncMonth("date_enq"))
        .values("mois")
        .annotate(n=Count("id_enq"))
    }
    par_mois = []
    if comptes:
        mois, fin = min(comptes), max(comptes)
        while mois <= fin:
            par_mois.append({"mois": mois.strftime("%Y-%m"), "enquetes": comptes.get(mois, 0)})
            mois = _mois_suivant(mois)

    # Parcelles par enquêteur
    avec_enqueteur = parcelles.filter(id_enqt__isnull=False).order_by()
    lignes = list(
        avec_enqueteur
        .values("id_enqt", "id_enqt__nom_pren_enqt", "id_enqt__code_enqt")
        .annotate(
            parcelles=Count("id_parc"),
            exploitants=Count("id_expl", distinct=True),
            hectares=Sum("superficie_ha"),
        )
        .order_by("-parcelles")
    )
    total_parcelles = sum(l["parcelles"] for l in lignes)

    return Response({
        "resume": {
            "enquetes": sum(comptes.values()),
            "enqueteurs": len(lignes),
            "parcelles_avec_enqueteur": total_parcelles,
        },
        "par_mois": par_mois,
        "enqueteurs": [
            {
                "id": l["id_enqt"],
                "nom": l["id_enqt__nom_pren_enqt"],
                "code": l["id_enqt__code_enqt"],
                "parcelles": l["parcelles"],
                "exploitants": l["exploitants"],
                "hectares": round(float(l["hectares"] or 0), 2),
            }
            for l in lignes[:LIMITE_ENQUETEURS]
        ],
    })

    # ── Données : tableau récapitulatif ────────────────────────────────

@api_view(["GET"])
def donnees_recapitulatif(request):
    p = request.query_params
    if not p.get("region_id"):
        niveau = "region"
    elif not p.get("departement_id"):
        niveau = "departement"
    elif not p.get("sous_prefecture_id"):
        niveau = "sous_prefecture"
    else:
        niveau = "localite"

    champ_id, champ_nom, libelle = NIVEAUX_REPARTITION[niveau]
    base = parcelles_filtrees(p)

    def mesures():
        return dict(
            parcelles=Count("id_parc"),
            exploitants=Count("id_expl", distinct=True),
            hectares=Sum("superficie_ha"),
            moyenne=Avg("superficie_ha"),
            sans_enqueteur=Count("id_parc", filter=Q(id_enqt__isnull=True)),
            sans_superficie=Count("id_parc", filter=Q(superficie_ha__isnull=True)),
            sans_contact=Count("id_expl", distinct=True, filter=_vide("id_expl__contacts")),
        )

    def mise_en_forme(m):
        return {
            "parcelles": m["parcelles"],
            "exploitants": m["exploitants"],
            "hectares": round(float(m["hectares"] or 0), 2),
            "moyenne": round(float(m["moyenne"] or 0), 2),
            "sans_enqueteur": m["sans_enqueteur"],
            "sans_superficie": m["sans_superficie"],
            "sans_contact": m["sans_contact"],
        }

    lignes = (
        base.order_by()
        .values(champ_id, champ_nom)
        .annotate(**mesures())
        .order_by("-parcelles")
    )

    return Response({
        "niveau": niveau,
        "libelle": libelle,
        "rows": [
            {"id": l[champ_id], "nom": l[champ_nom], **mise_en_forme(l)}
            for l in lignes
        ],
        "total": mise_en_forme(base.order_by().aggregate(**mesures())),
    })

# ── Export de la géométrie d'une parcelle ──────────────────────────

def _attributs_export(parcelle):
    """Attributs identiques dans les trois formats (noms ≤ 10 caractères pour le DBF)."""
    expl = parcelle.id_expl
    return {
        "code": parcelle.code_parc,
        "sup_ha": float(parcelle.superficie_ha) if parcelle.superficie_ha is not None else None,
        "annee": parcelle.annee_mise_place,
        "code_expl": expl.code_expl,
        "nom_expl": ((expl.nom_expl or "") + " " + (expl.pren_expl or "")).strip() or None,
    }


def _kml(geometrie, attrs):
    def anneau(coords):
        return " ".join(f"{x},{y},0" for x, y in coords)

    def polygone(rings):
        exterieur = anneau(rings[0])
        trous = "".join(
            f"<innerBoundaryIs><LinearRing><coordinates>{anneau(r)}</coordinates></LinearRing></innerBoundaryIs>"
            for r in rings[1:]
        )
        return (
            "<Polygon><outerBoundaryIs><LinearRing>"
            f"<coordinates>{exterieur}</coordinates></LinearRing></outerBoundaryIs>{trous}</Polygon>"
        )

    polys = (
        [geometrie["coordinates"]] if geometrie["type"] == "Polygon" else geometrie["coordinates"]
    )
    corps = "".join(polygone(p) for p in polys)
    forme = corps if len(polys) == 1 else f"<MultiGeometry>{corps}</MultiGeometry>"

    donnees = "".join(
        f'<Data name="{k}"><value>{xml_escape(str(v))}</value></Data>'
        for k, v in attrs.items() if v is not None
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>'
        f"<name>{xml_escape(attrs['code'])}</name>"
        '<Style id="p"><LineStyle><color>ff452f14</color><width>2</width></LineStyle>'
        "<PolyStyle><color>664f9a4f</color></PolyStyle></Style>"
        f"<Placemark><name>{xml_escape(attrs['code'])}</name><styleUrl>#p</styleUrl>"
        f"<ExtendedData>{donnees}</ExtendedData>{forme}</Placemark>"
        "</Document></kml>"
    )


# def _shapefile_zip(geometrie, attrs):
    """Shapefile (WGS 84) zippé : .shp .shx .dbf .prj .cpg."""
    # from osgeo import ogr, osr

    srs = osr.SpatialReference()
    srs.ImportFromEPSG(4326)
    srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)  # x = longitude

    nom = "".join(c if c.isalnum() or c in "-_" else "_" for c in attrs["code"])

    with tempfile.TemporaryDirectory() as dossier:
        pilote = ogr.GetDriverByName("ESRI Shapefile")
        source = pilote.CreateDataSource(dossier)
        couche = source.CreateLayer(nom, srs, ogr.wkbMultiPolygon, ["ENCODING=UTF-8"])

        couche.CreateField(ogr.FieldDefn("code", ogr.OFTString))
        couche.CreateField(ogr.FieldDefn("sup_ha", ogr.OFTReal))
        couche.CreateField(ogr.FieldDefn("annee", ogr.OFTInteger))
        couche.CreateField(ogr.FieldDefn("code_expl", ogr.OFTString))
        couche.CreateField(ogr.FieldDefn("nom_expl", ogr.OFTString))

        objet = ogr.Feature(couche.GetLayerDefn())
        for cle, valeur in attrs.items():
            if valeur is not None:
                objet.SetField(cle, valeur)

        forme = ogr.CreateGeometryFromJson(json.dumps(geometrie))
        forme = ogr.ForceToMultiPolygon(forme)
        objet.SetGeometry(forme)
        couche.CreateFeature(objet)
        objet = None
        source = None  # écrit et ferme les fichiers

        tampon = io.BytesIO()
        with zipfile.ZipFile(tampon, "w", zipfile.ZIP_DEFLATED) as z:
            for fichier in sorted(Path(dossier).iterdir()):
                z.write(fichier, fichier.name)
    return tampon.getvalue()

WKT_WGS84 = (
    'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",'
    'SPHEROID["WGS_1984",6378137.0,298.257223563]],'
    'PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]'
)


def _anneau_oriente(anneau, horaire):
    """Un shapefile exige : contour extérieur horaire, trous antihoraires."""
    aire = sum(
        (x2 - x1) * (y2 + y1)
        for (x1, y1), (x2, y2) in zip(anneau, anneau[1:])
    )
    # aire > 0 : sens horaire
    est_horaire = aire > 0
    return anneau if est_horaire == horaire else anneau[::-1]


def _shapefile_zip(geometrie, attrs):
    """Shapefile (WGS 84) zippé : .shp .shx .dbf .prj .cpg."""
    polys = (
        [geometrie["coordinates"]] if geometrie["type"] == "Polygon"
        else geometrie["coordinates"]
    )

    # Tous les anneaux de tous les polygones, bien orientés, dans une seule forme
    parties = []
    for rings in polys:
        for i, anneau in enumerate(rings):
            points = [(float(x), float(y)) for x, y, *_ in anneau]
            parties.append(_anneau_oriente(points, horaire=(i == 0)))

    nom = "".join(c if c.isalnum() or c in "-_" else "_" for c in attrs["code"])

    shp, shx, dbf = io.BytesIO(), io.BytesIO(), io.BytesIO()
    w = shapefile.Writer(shp=shp, shx=shx, dbf=dbf, shapeType=shapefile.POLYGON,
                         encoding="utf-8")
    w.field("code", "C", size=40)
    w.field("sup_ha", "N", size=16, decimal=6)
    w.field("annee", "N", size=6, decimal=0)
    w.field("code_expl", "C", size=40)
    w.field("nom_expl", "C", size=80)

    w.poly(parties)
    w.record(
        attrs["code"],
        attrs["sup_ha"],
        attrs["annee"],
        attrs["code_expl"],
        attrs["nom_expl"],
    )
    w.close()

    tampon = io.BytesIO()
    with zipfile.ZipFile(tampon, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(f"{nom}.shp", shp.getvalue())
        z.writestr(f"{nom}.shx", shx.getvalue())
        z.writestr(f"{nom}.dbf", dbf.getvalue())
        z.writestr(f"{nom}.prj", WKT_WGS84)
        z.writestr(f"{nom}.cpg", "UTF-8")
    return tampon.getvalue()


@require_GET
def export_geometrie_parcelle(request, id_parc):
    """Géométrie exacte d'une parcelle : ?fmt=geojson | kml | shp."""
    fmt = request.GET.get("fmt", "geojson").lower()
    if fmt not in ("geojson", "kml", "shp"):
        return JsonResponse({"detail": "fmt attendu : geojson, kml ou shp"}, status=400)

    queryset = (
        avec_superficie(ParcelleCorrecte.objects)
        .select_related("id_expl")
        .annotate(geojson=AsGeoJSON("geom_parc"))
    )
    parcelle = get_object_or_404(queryset, id_parc=id_parc)
    if not parcelle.geojson:
        return JsonResponse({"detail": "Cette parcelle n'a pas de contour."}, status=404)

    geometrie = json.loads(parcelle.geojson)
    attrs = _attributs_export(parcelle)
    base = "".join(c if c.isalnum() or c in "-_" else "_" for c in parcelle.code_parc)

    if fmt == "geojson":
        contenu = json.dumps({
            "type": "FeatureCollection",
            "features": [{"type": "Feature", "geometry": geometrie, "properties": attrs}],
        })
        reponse = HttpResponse(contenu, content_type="application/geo+json")
        nom = f"{base}.geojson"
    elif fmt == "kml":
        reponse = HttpResponse(
            _kml(geometrie, attrs),
            content_type="application/vnd.google-earth.kml+xml",
        )
        nom = f"{base}.kml"
    else:
        try:
            contenu = _shapefile_zip(geometrie, attrs)
        except ImportError:
            return JsonResponse(
                {"detail": "GDAL n'est pas installé sur le serveur : export SHP indisponible."},
                status=501,
            )
        reponse = HttpResponse(_shapefile_zip(geometrie, attrs), content_type="application/zip")
        nom = f"{base}_shp.zip"

    reponse["Content-Disposition"] = f'attachment; filename="{nom}"'
    return reponse


# ------------------------- REGIONS ------------------------------------------------
@api_view(["GET"])
def liste_regions_geojson(request):
    regions = (
        Region.objects
        .filter(geom_reg__isnull=False)
        .annotate(geojson=AsGeoJSON("geom_reg"))
        .values("id_reg", "lib_reg", "geojson")
        .order_by("lib_reg")
    )

    features = []

    for region in regions:
        if not region["geojson"]:
            continue

        features.append({
            "type": "Feature",
            "geometry": json.loads(region["geojson"]),
            "properties": {
                "id_reg": region["id_reg"],
                "lib_reg": region["lib_reg"],
            },
        })

    return Response({
        "type": "FeatureCollection",
        "features": features,
    })




# ── Export complet des exploitants ─────────────────────────────────

M = "id_expl__id_men"   # ménage, depuis ParcelleCorrecte

# (en-tête, champ). Partie « exploitant » : répétée sur chaque ligne.
COLONNES_EXPLOITANT = [
    ("Code exploitant", "id_expl__code_expl"),
    ("Nom", "id_expl__nom_expl"),
    ("Prénom(s)", "id_expl__pren_expl"),
    ("Date de naissance", "id_expl__date_nais"),
    ("Lieu de naissance", "id_expl__lieu_nais"),
    ("Pays de naissance", "id_expl__pays_nais"),
    ("Nationalité", "id_expl__nationalite"),
    ("Situation matrimoniale", "id_expl__situa_mat"),
    ("Profession", "id_expl__profession"),
    ("Niveau d'instruction", "id_expl__id_niv__lib_niv"),
    ("Téléphone", "id_expl__contacts"),
    ("Nom (personne déclarée)", "id_expl__nom_declare"),
    ("Prénom(s) (personne déclarée)", "id_expl__pren_declare"),
    ("Contact (personne déclarée)", "id_expl__cont_declare"),
    ("Code ménage", f"{M}__code_men"),
    ("Nom du chef de ménage", f"{M}__nom_chef"),
    ("Prénom(s) du chef de ménage", f"{M}__pren_chef"),
    ("Contact du chef de ménage", f"{M}__cont_chef"),
    ("Nombre d'enfants", f"{M}__nb_enfant"),
    ("Nombre de femmes", f"{M}__nb_femme"),
    ("Région", f"{CHEMIN_SP}__id_dept__id_reg__lib_reg"),
    ("Département", f"{CHEMIN_SP}__id_dept__lib_dept"),
    ("Sous-préfecture", f"{CHEMIN_SP}__lib_s_pref"),
    ("Localité", f"{CHEMIN_LOC}__lib_loc"),
    ("Quartier", f"{M}__id_quar__lib_quar"),
]

COLONNES_PARCELLE = [
    ("Code parcelle", "code_parc"),
    ("Superficie (ha)", "superficie_ha"),
    ("Année de mise en place", "annee_mise_place"),
    ("Mode de faire-valoir", "id_mode__lib_mode"),
    ("Date de géoréférencement", "date_geor"),
    ("Enquêteur", "id_enqt__nom_pren_enqt"),
    ("Code enquêteur", "id_enqt__code_enqt"),
    ("Contact enquêteur", "id_enqt__cont_enqt"),
    ("Date de l'enquête", "date_enq"),
    ("N° de questionnaire", "num_quest"),
]

CHAMPS_EXPORT = [c for _, c in COLONNES_EXPLOITANT + COLONNES_PARCELLE]
N_EXPL = len(COLONNES_EXPLOITANT)
IDX_SUPERFICIE = N_EXPL + 1


def _valeur_csv(v):
    if v is None:
        return ""
    if isinstance(v, date):
        return v.strftime("%d/%m/%Y")
    if isinstance(v, (Decimal, float)):
        return str(v).replace(".", ",")
    return _cellule(v)


def _valeur_xlsx(v):
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, str):
        return ILLEGAL_CHARACTERS_RE.sub("", _cellule(v))
    return v


def _entete_xlsx(ws, titres):
    cellules = []
    for titre in titres:
        c = WriteOnlyCell(ws, value=titre)
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="1F6B45")
        c.alignment = Alignment(vertical="center", wrap_text=True)
        cellules.append(c)
    ws.append(cellules)
    for i in range(1, len(titres) + 1):
        ws.column_dimensions[get_column_letter(i)].width = 20
    ws.freeze_panes = "A2"


def _libelles_filtres(params):
    """Filtres appliqués, en clair, pour la feuille « Informations »."""
    noms = {
        "region_id": ("region", "Région"),
        "departement_id": ("departement", "Département"),
        "sous_prefecture_id": ("sous_prefecture", "Sous-préfecture"),
        "localite_id": ("localite", "Localité"),
    }
    lignes = []
    for cle, (niveau, libelle) in noms.items():
        valeurs = liste_valeurs(params, cle)
        if not valeurs:
            continue
        modele, champ_id, champ_nom = MODELES_GEO[niveau]
        noms_zones = list(
            modele.objects.filter(**{f"{champ_id}__in": valeurs})
            .order_by(champ_nom).values_list(champ_nom, flat=True)
        )
        lignes.append((libelle, ", ".join(noms_zones) or ", ".join(valeurs)))
    if params.get("q", "").strip():
        lignes.append(("Recherche", params["q"].strip()))
    return lignes or [("Filtres", "Aucun (tous les exploitants)")]


@require_GET
def export_exploitants(request):
    """
    Export complet des exploitants filtrés : ?fmt=xlsx (défaut) | csv
    Accepte les mêmes paramètres que la liste : q, region_id, departement_id,
    sous_prefecture_id, localite_id.
    """
    fmt = request.GET.get("fmt", "xlsx").lower()
    if fmt not in ("csv", "xlsx"):
        return JsonResponse({"detail": "fmt attendu : xlsx ou csv"}, status=400)

    ids = exploitants_filtres(request.GET).order_by().values("id_expl")
    parcelles = (
        avec_superficie(ParcelleCorrecte.objects.filter(id_expl__in=ids))
        .annotate(
            date_geor=Subquery(
                Georeferencement.objects.filter(id_parc=OuterRef("id_parc"))
                .order_by("-date_geor").values("date_geor")[:1]
            ),
            date_enq=Subquery(
                Enquete.objects.filter(id_expl=OuterRef("id_expl"))
                .order_by("-date_enq").values("date_enq")[:1]
            ),
            num_quest=Subquery(
                Enquete.objects.filter(id_expl=OuterRef("id_expl"))
                .order_by("-date_enq").values("num_questionnaire")[:1]
            ),
        )
        .order_by("id_expl__nom_expl", "id_expl__pren_expl", "id_expl__id_expl", "code_parc")
        .values_list(*CHAMPS_EXPORT)
    )
    jour = date.today().isoformat()

    # ── CSV : tableau unique, une ligne par parcelle ──
    if fmt == "csv":
        def flux():
            ecrivain = csv.writer(_Echo(), delimiter=";")
            yield "\ufeff"
            yield ecrivain.writerow([t for t, _ in COLONNES_EXPLOITANT + COLONNES_PARCELLE])
            for ligne in parcelles.iterator(chunk_size=2000):
                yield ecrivain.writerow([_valeur_csv(v) for v in ligne])

        reponse = StreamingHttpResponse(flux(), content_type="text/csv; charset=utf-8")
        reponse["Content-Disposition"] = f'attachment; filename="exploitants_{jour}.csv"'
        return reponse

    # ── Excel : Informations / Exploitants / Parcelles ──
    lignes = list(parcelles.iterator(chunk_size=2000))

    exploitants = {}   # code exploitant → [valeurs, nb parcelles, superficie totale]
    for r in lignes:
        e = exploitants.setdefault(r[0], [list(r[:N_EXPL]), 0, 0.0])
        e[1] += 1
        e[2] += float(r[IDX_SUPERFICIE] or 0)

    wb = Workbook(write_only=True)

    info = wb.create_sheet("Informations")
    info.column_dimensions["A"].width = 26
    info.column_dimensions["B"].width = 50
    info.append(["Export des exploitants · Géoportail Anacarde"])
    info.append(["Date d'export", date.today().strftime("%d/%m/%Y")])
    for libelle, valeur in _libelles_filtres(request.GET):
        info.append([libelle, valeur])
    info.append(["Exploitants", len(exploitants)])
    info.append(["Parcelles", len(lignes)])
    info.append(["Superficie totale (ha)", round(sum(e[2] for e in exploitants.values()), 2)])

    ws_e = wb.create_sheet("Exploitants")
    titres_e = [t for t, _ in COLONNES_EXPLOITANT] + ["Nombre de parcelles", "Superficie totale (ha)"]
    _entete_xlsx(ws_e, titres_e)
    for valeurs, nb, sup in exploitants.values():
        ws_e.append([_valeur_xlsx(v) for v in valeurs] + [nb, round(sup, 2)])
    ws_e.auto_filter.ref = f"A1:{get_column_letter(len(titres_e))}{len(exploitants) + 1}"

    ws_p = wb.create_sheet("Parcelles")
    titres_p = ["Code exploitant", "Nom", "Prénom(s)"] + [t for t, _ in COLONNES_PARCELLE]
    _entete_xlsx(ws_p, titres_p)
    for r in lignes:
        ws_p.append([_valeur_xlsx(v) for v in (*r[:3], *r[N_EXPL:])])
    ws_p.auto_filter.ref = f"A1:{get_column_letter(len(titres_p))}{len(lignes) + 1}"

    tampon = io.BytesIO()
    wb.save(tampon)
    reponse = HttpResponse(
        tampon.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    reponse["Content-Disposition"] = f'attachment; filename="exploitants_{jour}.xlsx"'
    return reponse


# ── Import de parcelles validées ───────────────────────────────────

HA_MIN, HA_MAX = 0.01, 500
CHEVAUCHEMENT_MAX = 0.5
CODE_MAX = 50
LIMITE_LOT = 20000


def _jeton_ok(request):
    """Protection provisoire : si IMPORT_TOKEN est défini, l'en-tête X-Import-Token doit correspondre."""
    attendu = getattr(settings, "IMPORT_TOKEN", "")
    return not attendu or request.headers.get("X-Import-Token") == attendu


def _code_exploitant(code, props):
    for cle in ("code_exploitant", "code_expl"):
        v = props.get(cle)
        if v is not None and str(v).strip():
            return str(v).strip()
    return code[:-2] if code and len(code) > 2 else None


def _annee(props):
    for cle in ("annee_mise_place", "annee"):
        try:
            n = int(str(props.get(cle)).strip())
        except (TypeError, ValueError):
            continue
        if ANNEE_MIN_VALIDE <= n <= date.today().year:
            return n
    return None


def _analyser_geometrie(geojson_txt):
    """(valide_à_l_origine, géométrie corrigée en GeoJSON, superficie en ha). Lève une exception si illisible."""
    with transaction.atomic(), connection.cursor() as cur:   # savepoint : une erreur SQL ne casse pas le lot
        cur.execute(
            """
            WITH t AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326) AS g),
                 v AS (SELECT ST_IsValid(g) AS ok,
                              ST_Multi(ST_CollectionExtract(ST_MakeValid(g), 3)) AS m FROM t)
            SELECT ok, ST_AsGeoJSON(m), ST_Area(m::geography) / 10000.0 FROM v
            """,
            [geojson_txt],
        )
        ok, corrige, ha = cur.fetchone()
    return ok, corrige, Decimal(str(ha or 0))


def _chevauche(geojson_txt, exclure_code=None):
    """Nombre de parcelles existantes recouvertes à plus de 50 % (0 si le calcul échoue)."""
    try:
        with transaction.atomic(), connection.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) FROM parcelle_correcte p,
                     (SELECT ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326) AS g) t
                WHERE p.geom_parc && t.g AND ST_Intersects(p.geom_parc, t.g)
                  AND (%s IS NULL OR p.code_parc <> %s)
                  AND ST_Area(ST_Intersection(p.geom_parc, t.g)::geography)
                      > %s * ST_Area(t.g::geography)
                """,
                [geojson_txt, exclure_code, exclure_code, float(param("chevauchement"))],
            )
            return cur.fetchone()[0]
    except Exception:
        return 0
    """Nombre de parcelles existantes recouvertes à plus de 50 % (0 si le calcul échoue)."""
    try:
        with transaction.atomic(), connection.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) FROM parcelle_correcte p,
                     (SELECT ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326) AS g) t
                WHERE p.geom_parc && t.g AND ST_Intersects(p.geom_parc, t.g)
                  AND ST_Area(ST_Intersection(p.geom_parc, t.g)::geography)
                      > %s * ST_Area(t.g::geography)
                """,
                [geojson_txt, CHEVAUCHEMENT_MAX],
            )
            return cur.fetchone()[0]
    except Exception:
        return 0


def _valider_lot(lot, items):
    prepares = []
    for i, item in enumerate(items):
        props = item.get("properties") if isinstance(item.get("properties"), dict) else {}
        code = str(item.get("code") or "").strip() or None
        prepares.append((i, code, props, item.get("geometry")))

    codes = [c for _, c, _, _ in prepares if c]
    vus = Counter(codes)
    en_base = set(ParcelleCorrecte.objects.filter(code_parc__in=codes).values_list("code_parc", flat=True))
    codes_expl = {_code_exploitant(c, p) for _, c, p, _ in prepares} - {None}
    expl = dict(Exploitant.objects.filter(code_expl__in=codes_expl).values_list("code_expl", "id_expl"))

    lignes, compte = [], Counter()
    for i, code, props, geom in prepares:
        msgs = []

        def erreur(t): msgs.append({"niveau": "erreur", "texte": t})
        def avert(t): msgs.append({"niveau": "avertissement", "texte": t})

        doublon = False
        if not code:
            erreur("Code de parcelle manquant.")
        elif len(code) > CODE_MAX:
            erreur(f"Code trop long (plus de {CODE_MAX} caractères).")
        elif vus[code] > 1:
            erreur("Code en double dans ce fichier.")
        elif code in en_base:
            doublon = True
            avert("Une parcelle portant ce code existe déjà : remplacement à confirmer à la publication.")

        id_expl = expl.get(_code_exploitant(code, props)) if code else None
        if code and id_expl is None:
            erreur("Exploitant introuvable pour ce code.")

        geojson, ha = "", None
        if not isinstance(geom, dict) or geom.get("type") not in ("Polygon", "MultiPolygon"):
            erreur("Géométrie absente ou qui n'est pas un polygone.")
        else:
            try:
                ok, corrige, ha = _analyser_geometrie(json.dumps(geom))
                if not corrige or ha <= 0:
                    erreur("Géométrie vide ou impossible à réparer.")
                else:
                    geojson = corrige
                    if not ok:
                        avert("Géométrie invalide à l'origine : réparée automatiquement.")
                    if not (float(param("ha_min")) <= ha <= float(param("ha_max"))):
                        avert(f"Superficie inhabituelle ({ha:.2f} ha).")
                    if _chevauche(corrige, exclure_code=code if doublon else None):
                        avert("Chevauche une parcelle déjà enregistrée.")
            except Exception:
                erreur("Géométrie illisible.")

        statut = ("erreur" if any(m["niveau"] == "erreur" for m in msgs)
                  else "doublon" if doublon
                  else "avertissement" if msgs else "valide")
        compte[statut] += 1
        
        lignes.append(ImportParcelle(
            lot=lot, rang=i, code=code, geojson=geojson or json.dumps(geom or {}),
            proprietes=props, statut=statut, messages=msgs, id_expl=id_expl,
            superficie_ha=ha if geojson else None,
        ))

    ImportParcelle.objects.bulk_create(lignes, batch_size=500)
    lot.nb_total = len(lignes)
    lot.nb_valides = compte["valide"]
    lot.nb_avertissements = compte["avertissement"]
    lot.nb_erreurs = compte["erreur"]
    lot.nb_doublons = compte["doublon"]
    lot.save()


def _resume_lot(lot):
    return {
        "id": lot.id, "fichier": lot.nom_fichier, "format": lot.format, "statut": lot.statut,
        "cree_le": lot.cree_le.isoformat(),
        "publie_le": lot.publie_le.isoformat() if lot.publie_le else None,
        "total": lot.nb_total, "valides": lot.nb_valides,
        "avertissements": lot.nb_avertissements, "erreurs": lot.nb_erreurs,
        "doublons": lot.nb_doublons,
    }


@api_view(["GET", "POST"])
@permission_classes([droit_ecriture("importer")])  
def imports_collection(request):
    if request.method == "GET":
        return Response([_resume_lot(l) for l in ImportLot.objects.all()[:50]])

    # if not _jeton_ok(request):
    #     return Response({"detail": "Import non autorisé."}, status=403)
    items = request.data.get("items")
    if not isinstance(items, list) or not items:
        return Response({"detail": "Aucune parcelle à importer."}, status=400)
    if len(items) > LIMITE_LOT:
        return Response({"detail": f"Maximum {LIMITE_LOT} parcelles par fichier."}, status=400)

    with transaction.atomic():
        lot = ImportLot.objects.create(
            nom_fichier=str(request.data.get("fichier", "import"))[:255],
            format=str(request.data.get("format", ""))[:20],
        )
        _valider_lot(lot, items)
    return Response(_resume_lot(lot), status=201)


@api_view(["GET", "DELETE"])
@permission_classes([droit_ecriture("importer")])  
def import_detail(request, id_lot):
    lot = get_object_or_404(ImportLot, pk=id_lot)
    if request.method == "DELETE":
        # if not _jeton_ok(request):
        #     return Response({"detail": "Non autorisé."}, status=403)
        if lot.statut == "publie":
            return Response({"detail": "Annulez d'abord la publication."}, status=409)
        lot.delete()
        return Response(status=204)
    return Response(_resume_lot(lot))


@api_view(["GET"])
@permission_classes([droit("voir_donnees_validees")])
def import_geojson(request, id_lot):
    lot = get_object_or_404(ImportLot, pk=id_lot)
    features = []
    for p in lot.parcelles.all():
        try:
            geometrie = json.loads(p.geojson)
        except ValueError:
            continue
        if geometrie.get("type") not in ("Polygon", "MultiPolygon"):
            continue
        features.append({
            "type": "Feature", "geometry": geometrie,
            "properties": {
                "rang": p.rang, "code": p.code, "statut": p.statut, "messages": p.messages,
                "superficie_ha": float(p.superficie_ha) if p.superficie_ha is not None else None,
                "proprietes": p.proprietes,
            },
        })
    return Response({"type": "FeatureCollection", "features": features})

@api_view(["POST"])
@permission_classes([droit_ecriture("publier")])
def import_publier(request, id_lot):
    # if not _jeton_ok(request):
    #     return Response({"detail": "Non autorisé."}, status=403)
    lot = get_object_or_404(ImportLot, pk=id_lot)
    if lot.statut != "brouillon":
        return Response({"detail": "Ce lot n'est pas un brouillon."}, status=409)

    remplacer = request.data.get("remplacer", [])
    if not isinstance(remplacer, list) or not all(isinstance(r, int) for r in remplacer):
        return Response({"detail": "Liste « remplacer » invalide."}, status=400)
    confirmes = set(remplacer)

    bilan = Counter()
    with transaction.atomic(), connection.cursor() as cur:      # tout ou rien
        for p in lot.parcelles.exclude(statut="erreur").order_by("rang"):
            cur.execute(
                "SELECT id_parc, code_parc, annee_mise_place, superficie_tracee, id_expl, "
                "ST_AsGeoJSON(geom_parc) FROM parcelle_correcte WHERE code_parc = %s FOR UPDATE",
                [p.code],
            )
            existante = cur.fetchone()
            sup = f"{p.superficie_ha:.6f}".replace(".", ",") if p.superficie_ha is not None else None
            annee = _annee(p.proprietes)

            # Cas 1 : nouvelle parcelle → insertion
            if existante is None:
                cur.execute(
                    """
                    INSERT INTO parcelle_correcte
                        (code_parc, annee_mise_place, geom_parc, superficie_tracee, id_expl)
                    VALUES (%s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326), %s, %s)
                    RETURNING id_parc
                    """,
                    [p.code, annee, p.geojson, sup, p.id_expl],
                )
                p.id_parc_publie = cur.fetchone()[0]
                p.statut = "publiee"
                p.save()
                bilan["inserees"] += 1
                continue

            id_existant = existante[0]

            # Cas 2b : doublon non confirmé → on garde l'ancienne, on rejette la nouvelle
            if p.rang not in confirmes:
                p.statut = "conservee"
                p.id_parc_remplace = id_existant
                p.messages = [*p.messages, {"niveau": "avertissement",
                              "texte": "Parcelle existante conservée : la nouvelle n'a pas été publiée."}]
                p.save()
                bilan["conservees"] += 1
                continue

            # Cas 2a : doublon confirmé → remplacement, id_parc conservé
            p.ancienne_version = {
                "annee_mise_place": existante[2],
                "superficie_tracee": existante[3],
                "id_expl": existante[4],
                "geometrie": existante[5],
            }
            cur.execute(
                """
                UPDATE parcelle_correcte
                   SET annee_mise_place = %s,
                       geom_parc = ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326),
                       superficie_tracee = %s,
                       id_expl = %s
                 WHERE id_parc = %s
                """,
                [annee, p.geojson, sup, p.id_expl, id_existant],
            )
            p.id_parc_publie = id_existant
            p.id_parc_remplace = id_existant
            p.statut = "remplacee"
            p.save()
            bilan["remplacees"] += 1

        if bilan["inserees"] + bilan["remplacees"] == 0:
            transaction.set_rollback(True)
            return Response({"detail": "Rien à publier : aucune insertion ni remplacement."}, status=409)

        lot.statut = "publie"
        lot.publie_le = timezone.now()
        lot.save()
        journaliser(request, "lot_publie", f"Lot #{lot.id}", lot.nom_fichier)

    return Response({**_resume_lot(lot), **bilan})

@api_view(["POST"])
@permission_classes([droit_ecriture("publier")])
def import_annuler(request, id_lot):
    # if not _jeton_ok(request):
    #     return Response({"detail": "Non autorisé."}, status=403)
    lot = get_object_or_404(ImportLot, pk=id_lot)
    if lot.statut != "publie":
        return Response({"detail": "Ce lot n'est pas publié."}, status=409)

    inserees = list(lot.parcelles.filter(statut="publiee").values_list("id_parc_publie", flat=True))
    remplacees = list(lot.parcelles.filter(statut="remplacee"))
    try:
        with transaction.atomic(), connection.cursor() as cur:
            for p in remplacees:
                v = p.ancienne_version or {}
                cur.execute(
                    """
                    UPDATE parcelle_correcte
                       SET annee_mise_place = %s,
                           geom_parc = ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326),
                           superficie_tracee = %s,
                           id_expl = %s
                     WHERE id_parc = %s
                    """,
                    [v.get("annee_mise_place"), v.get("geometrie"),
                     v.get("superficie_tracee"), v.get("id_expl"), p.id_parc_remplace],
                )
                p.statut, p.id_parc_publie = "doublon", None
                p.save()
            if inserees:
                cur.execute("DELETE FROM parcelle_correcte WHERE id_parc = ANY(%s)", [inserees])
            lot.parcelles.filter(statut="publiee").update(statut="valide", id_parc_publie=None)
            lot.parcelles.filter(statut="conservee").update(statut="doublon", id_parc_remplace=None)
            lot.statut = "annule"
            lot.save()
    except IntegrityError:
        return Response(
            {"detail": "Des données (géoréférencement, etc.) référencent déjà ces parcelles : annulation impossible."},
            status=409,
        )
    return Response(_resume_lot(lot))

@api_view(["GET"])
@permission_classes([droit("voir_donnees_validees")])
def import_apercu(request, id_lot):
    """Doublons du lot, avec la parcelle existante à côté de la nouvelle (pour confirmation)."""
    lot = get_object_or_404(ImportLot, pk=id_lot)
    if lot.statut != "brouillon":
        return Response({"detail": "Ce lot n'est pas un brouillon."}, status=409)

    doublons = list(lot.parcelles.filter(statut="doublon"))
    existants = {
        p["code_parc"]: p
        for p in avec_superficie(ParcelleCorrecte.objects.filter(code_parc__in=[d.code for d in doublons]))
        .values("id_parc", "code_parc", "annee_mise_place", "superficie_ha", "id_expl__code_expl")
    }
    return Response({
        "a_inserer": lot.parcelles.filter(statut__in=["valide", "avertissement"]).count(),
        "erreurs": lot.parcelles.filter(statut="erreur").count(),
        "doublons": [
            {
                "rang": d.rang,
                "code": d.code,
                "nouvelle": {
                    "superficie_ha": float(d.superficie_ha) if d.superficie_ha is not None else None,
                    "annee": _annee(d.proprietes),
                },
                "existante": (
                    {
                        "id": e["id_parc"],
                        "superficie_ha": float(e["superficie_ha"]) if e["superficie_ha"] is not None else None,
                        "annee": e["annee_mise_place"],
                        "code_exploitant": e["id_expl__code_expl"],
                    }
                    if (e := existants.get(d.code)) else None
                ),
            }
            for d in doublons
        ],
    })

# ── Dénombrements ──────────────────────────────────────────────────

CHEMIN_REGION_Q = "id_loc__id_s_pref__id_dept__id_reg"
OUI = r"^(oui|yes|true|1)$"
NON = r"^(non|no|false|0)$"

COLONNES_DENOMB = [
    ("id", "ID"), ("uuid", "UUID"), ("num_questionnaire", "N° questionnaire"),
    ("date_enquete", "Date enquête"),
    ("enqueteur_nom", "Enquêteur (nom et prénom)"), ("enqueteur_contact", "Contact enquêteur"),
    ("gps", "Coordonnées GPS"), ("district", "District"), ("region", "Région"),
    ("departement", "Département"), ("sous_prefecture", "Sous-préfecture"),
    ("secteur", "Secteur administratif"), ("zone", "Zone dénombrement"),
    ("localite", "Localité"), ("quartier", "Quartier / Campement"),
    ("milieu", "Milieu résidence"), ("code_menage", "Code ménage"),
    ("nb_exploitants", "Nb exploitants"), ("a_exploitant", "A exploitant"),
    ("nom_chef", "Nom chef ménage"), ("prenom_chef", "Prénom chef ménage"),
    ("contact_chef", "Contact chef ménage"),
    ("exploitant_present", "Exploitant présent ?"), ("est_representant", "Représentant ?"),
    ("nom_representant", "Nom représentant"), ("prenom_representant", "Prénom représentant"),
    ("contact_representant", "Contact représentant"),
    ("statut", "Statut"), ("source", "Source"), ("cree_le", "Créé le"),
]

# paramètre → chemin depuis Quartier jusqu'à l'identifiant du niveau
CHAMPS_GEO_DENOMB = {
    "region_id": "id_loc__id_s_pref__id_dept__id_reg__id_reg",
    "departement_id": "id_loc__id_s_pref__id_dept__id_dept",
    "sous_prefecture_id": "id_loc__id_s_pref__id_s_pref",
    "localite_id": "id_loc__id_loc",
}

def denombrements_filtres(params):
    qs = Denombrement.objects.all()

    for mot in params.get("q", "").strip().split()[:5]:
        qs = qs.filter(
            Q(nom_chef_menage__icontains=mot) | Q(prenom_chef_menage__icontains=mot)
            | Q(num_questionnaire__icontains=mot) | Q(uuid__icontains=mot)
            | Q(code_men__icontains=mot) | Q(id_men__code_men__icontains=mot)
            | Q(nom_prenom_enqt__icontains=mot)
            | Q(id_quar__lib_quar__icontains=mot) | Q(id_men__id_quar__lib_quar__icontains=mot)
            | Q(id_quar__id_loc__lib_loc__icontains=mot)
            | Q(id_men__id_quar__id_loc__lib_loc__icontains=mot)
        )

    # Filtres géographiques multiples (valeurs séparées par des virgules)
    for param, champ in CHAMPS_GEO_DENOMB.items():
        valeurs = liste_valeurs(params, param)
        if valeurs:
            qs = qs.filter(
                Q(**{f"id_quar__{champ}__in": valeurs})
                | Q(**{f"id_men__id_quar__{champ}__in": valeurs})
            )

    statut = (params.get("statut") or "").strip()
    if statut:
        qs = qs.filter(statut=statut)

    milieux = liste_valeurs(params, "milieu_id")
    if milieux:
        qs = qs.filter(id_milieu_residence__in=milieux)

    ids = liste_valeurs(params, "ids")[:50000]
    if ids:
        qs = qs.filter(id_denomb__in=ids)
    return qs


def avec_details_denomb(qs):
    """Charge la géographie et ajoute les infos tirées des exploitants du ménage."""
    geo = "id_loc__id_s_pref__id_dept__id_reg__id_dist"
    zone = "id_loc__id_zone_denombrement"
    tous = Exploitant.objects.filter(id_men=OuterRef("id_men")).order_by("id_expl")
    avec_repr = tous.exclude(nom_representant__isnull=True).exclude(nom_representant="")
    nb = (Exploitant.objects.filter(id_men=OuterRef("id_men")).order_by()
          .values("id_men").annotate(n=Count("id_expl")).values("n"))

    return qs.select_related(
        "id_milieu_residence", "id_men",
        f"id_quar__{geo}", f"id_quar__{zone}",
        f"id_men__id_quar__{geo}", f"id_men__id_quar__{zone}",
    ).annotate(
        nb_enregistres=Coalesce(Subquery(nb, output_field=IntegerField()), 0),
        est_repr=Coalesce(
            Subquery(avec_repr.values("exploitant_est_representant")[:1]),
            Subquery(tous.values("exploitant_est_representant")[:1]),
            output_field=CharField(),
        ),
        nom_repr=Subquery(avec_repr.values("nom_representant")[:1]),
        pren_repr=Subquery(avec_repr.values("prenom_representant")[:1]),
        cont_repr=Subquery(avec_repr.values("contact_representant")[:1]),
    )


def _ligne_denombrement(d):
    q = d.id_quar or _suivre(d.id_men, "id_quar")
    loc = _suivre(q, "id_loc")
    sp = _suivre(loc, "id_s_pref")
    dept = _suivre(sp, "id_dept")
    reg = _suivre(dept, "id_reg")
    return {
        "id": d.id_denomb,
        "uuid": d.uuid,
        "num_questionnaire": d.num_questionnaire,
        "date_enquete": d.date_enqt,
        "enqueteur_nom": d.nom_prenom_enqt,
        "enqueteur_contact": d.contact_enqt,
        "gps": d.coordonnee_gps,
        "district": _suivre(reg, "id_dist", "lib_dist"),
        "region": _suivre(reg, "lib_reg"),
        "departement": _suivre(dept, "lib_dept"),
        "sous_prefecture": _suivre(sp, "lib_s_pref"),
        "secteur": d.secteur_administratif,
        "zone": _suivre(loc, "id_zone_denombrement", "code_zone"),
        "localite": _suivre(loc, "lib_loc"),
        "quartier": _suivre(q, "lib_quar"),
        "milieu": _suivre(d.id_milieu_residence, "lib_mil"),
        "code_menage": d.code_men or _suivre(d.id_men, "code_men"),
        "nb_exploitants": d.nb_exploitant,
        "a_exploitant": d.a_exploitant,
        "nom_chef": d.nom_chef_menage,
        "prenom_chef": d.prenom_chef_menage,
        "contact_chef": d.contact_chef_menage,
        "exploitant_present": "Oui" if d.nb_enregistres > 0 else "Non",
        "est_representant": d.est_repr,
        "nom_representant": d.nom_repr,
        "prenom_representant": d.pren_repr,
        "contact_representant": d.cont_repr,
        "statut": d.statut,
        "source": d.source,
        "cree_le": d.date_creation,
    }


@api_view(["GET"])
def liste_denombrements(request):
    qs = avec_details_denomb(denombrements_filtres(request.query_params)).order_by("-id_denomb")
    pagination = DenombrementPagination()
    page = pagination.paginate_queryset(qs, request)
    return pagination.get_paginated_response([_ligne_denombrement(d) for d in page])


@api_view(["GET"])
def stats_denombrements(request):
    r = denombrements_filtres(request.query_params).aggregate(
        fiches=Count("id_denomb"),
        avec_exploitant=Count("id_denomb", filter=Q(a_exploitant__iregex=OUI)),
        sans_exploitant=Count("id_denomb", filter=Q(a_exploitant__iregex=NON)),
        validees=Count("id_denomb", filter=Q(statut__istartswith="valid")),
        exploitants=Sum(Case(
            When(nb_exploitant__regex=r"^[0-9]{1,3}$", then=Cast("nb_exploitant", IntegerField())),
            default=0, output_field=IntegerField(),
        )),
    )
    sans_exploitant=r["fiches"]-r["avec_exploitant"]
    return Response({
        "fiches": r["fiches"], "avec_exploitant": r["avec_exploitant"],"sans_exploitant":r["sans_exploitant"],
        "validees": r["validees"], "exploitants": r["exploitants"] or 0,
    })


@api_view(["GET"])
def filtres_denombrements(request):
    statuts = sorted(
        Denombrement.objects.exclude(statut__isnull=True).exclude(statut="")
        .order_by().values_list("statut", flat=True).distinct()
    )
    regions = (
        Region.objects.filter(
            Q(departement__sousprefecture__localite__quartier__denombrement__isnull=False)
            | Q(departement__sousprefecture__localite__quartier__menage__denombrement__isnull=False)
        ).distinct().order_by("lib_reg").values("id_reg", "lib_reg")
    )
    return Response({
        "statuts": statuts,
        "regions": list(regions),
        "milieux": list(MilieuResidence.objects.order_by("lib_mil").values("id_milieu", "lib_mil")),
    })


@csrf_exempt
@require_http_methods(["GET", "POST"])
def export_denombrements(request):
    """?fmt=xlsx (défaut) | csv. Filtres et `ids` (liste d'identifiants) en GET ou POST."""
    params = request.POST if request.method == "POST" else request.GET
    fmt = params.get("fmt", "xlsx").lower()
    if fmt not in ("xlsx", "csv"):
        return JsonResponse({"detail": "fmt attendu : xlsx ou csv"}, status=400)

    qs = avec_details_denomb(denombrements_filtres(params)).order_by("-id_denomb")
    titres = [t for _, t in COLONNES_DENOMB]
    cles = [k for k, _ in COLONNES_DENOMB]
    jour = date.today().isoformat()

    def valeurs(d):
        ligne = _ligne_denombrement(d)
        return [ligne[k] for k in cles]

    if fmt == "csv":
        def flux():
            ecrivain = csv.writer(_Echo(), delimiter=";")
            yield "\ufeff"
            yield ecrivain.writerow(titres)
            for d in qs.iterator(chunk_size=2000):
                yield ecrivain.writerow([_cellule(v) for v in valeurs(d)])
        rep = StreamingHttpResponse(flux(), content_type="text/csv; charset=utf-8")
        rep["Content-Disposition"] = f'attachment; filename="denombrements_{jour}.csv"'
        return rep

    wb = Workbook(write_only=True)
    ws = wb.create_sheet("Dénombrements")
    _entete_xlsx(ws, titres)
    n = 0
    for d in qs.iterator(chunk_size=2000):
        ws.append([_valeur_xlsx(v) for v in valeurs(d)])
        n += 1
    ws.auto_filter.ref = f"A1:{get_column_letter(len(titres))}{n + 1}"
    tampon = io.BytesIO()
    wb.save(tampon)
    rep = HttpResponse(
        tampon.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    rep["Content-Disposition"] = f'attachment; filename="denombrements_{jour}.xlsx"'
    return rep


@api_view(["GET"])
def options_geo_denombrements(request, niveau):
    """Zones présentes dans les dénombrements, restreintes aux filtres déjà cochés."""
    modeles = {
        "regions": (Region, "id_reg", "lib_reg", "region_id"),
        "departements": (Departement, "id_dept", "lib_dept", "departement_id"),
        "sous-prefectures": (SousPrefecture, "id_s_pref", "lib_s_pref", "sous_prefecture_id"),
        "localites": (Localite, "id_loc", "lib_loc", "localite_id"),
    }
    if niveau not in modeles:
        return Response({"detail": "Niveau inconnu."}, status=400)
    modele, champ_id, champ_nom, param = modeles[niveau]

    # On ignore le filtre du niveau demandé : on veut toutes ses options possibles
    params = request.query_params.copy()
    for cle in ("q", "statut", "milieu_id", param):
        params.pop(cle, None)
    # Les niveaux inférieurs ne restreignent pas les niveaux supérieurs
    ordre = ["region_id", "departement_id", "sous_prefecture_id", "localite_id"]
    for cle in ordre[ordre.index(param):]:
        params.pop(cle, None)

    qs = denombrements_filtres(params)
    chemin = CHAMPS_GEO_DENOMB[param]
    ids = set(qs.values_list(f"id_quar__{chemin}", flat=True)) | set(
        qs.values_list(f"id_men__id_quar__{chemin}", flat=True)
    )
    ids.discard(None)
    objets = (modele.objects.filter(**{f"{champ_id}__in": ids})
              .order_by(champ_nom).values(champ_id, champ_nom))
    return Response([{"id": o[champ_id], "nom": o[champ_nom]} for o in objets])


# ── Ménages ────────────────────────────────────────────────────────

# paramètre → chemin depuis Menage jusqu'à l'identifiant du niveau
CHAMPS_GEO_MENAGE = {
    "region_id": "id_quar__id_loc__id_s_pref__id_dept__id_reg__id_reg",
    "departement_id": "id_quar__id_loc__id_s_pref__id_dept__id_dept",
    "sous_prefecture_id": "id_quar__id_loc__id_s_pref__id_s_pref",
    "zone_id": "id_quar__id_loc__id_zone_denombrement__id_zone",
    "localite_id": "id_quar__id_loc__id_loc",
}
ORDRE_GEO_MENAGE = list(CHAMPS_GEO_MENAGE)


def menages_filtres(params):
    qs = Menage.objects.all()

    # Recherche : code ménage, nom ou prénom d'un exploitant du ménage
    for mot in params.get("q", "").strip().split()[:5]:
        qs = qs.filter(
            Q(code_men__icontains=mot)
            | Q(id_men__in=Exploitant.objects.filter(
                Q(nom_expl__icontains=mot) | Q(pren_expl__icontains=mot)
            ).values("id_men"))
        )

    for param, chemin in CHAMPS_GEO_MENAGE.items():
        valeurs = liste_valeurs(params, param)
        if valeurs:
            qs = qs.filter(**{f"{chemin}__in": valeurs})

    ids = liste_valeurs(params, "ids")[:50000]
    if ids:
        qs = qs.filter(id_men__in=ids)
    return qs


def avec_details_menage(qs):
    nb = (Exploitant.objects.filter(id_men=OuterRef("id_men")).order_by()
          .values("id_men").annotate(n=Count("id_expl")).values("n"))
    geo = "id_loc__id_s_pref__id_dept__id_reg__id_dist"
    return qs.select_related(
        f"id_quar__{geo}", "id_quar__id_loc__id_zone_denombrement"
    ).annotate(nb_reel=Coalesce(Subquery(nb, output_field=IntegerField()), 0))


def _ligne_menage(m):
    q = m.id_quar
    loc = _suivre(q, "id_loc")
    sp = _suivre(loc, "id_s_pref")
    dept = _suivre(sp, "id_dept")
    reg = _suivre(dept, "id_reg")
    return {
        "id": m.id_men, "code_menage": m.code_men,
        "nom_chef": m.nom_chef, "prenom_chef": m.pren_chef, "contact_chef": m.cont_chef,
        "nb_enfants": m.nb_enfant, "nb_femmes": m.nb_femme,
        "nb_personne_en_charge": m.nb_personne_en_charge,
        "nb_personne_menage": m.nb_personne_menage,
        "nb_enfant_scolarise": m.nb_enfant_scolarise,
        "type_batiment": m.type_batiment,
        "materiaux_murs": m.materiaux_principal_murs,
        "materiaux_toit": m.materiaux_principal_toit,
        "type_sanitaire": m.type_sanitaire,
        "source_combustible": m.source_combustible,
        "source_eclairage": m.source_eclairage,
        "source_eau": m.source_eau,
        "nb_exploitant": m.nb_exploitant,
        "a_exploitant": m.a_exploitant_anarcade,
        "distance_sante": m.distance_infr_sante,
        "distance_ecole": m.distance_etabl_scol,
        "quartier": _suivre(q, "lib_quar"),
        "reseau": _suivre(q, "reseau_accessible"),
        "internet": _suivre(q, "acces_internet"),
        "infr_sante": _suivre(q, "infrastr_sante"),
        "banque": _suivre(q, "structure_bancaire"),
        "localite": _suivre(loc, "lib_loc"),
        "zone": _suivre(loc, "id_zone_denombrement", "code_zone"),
        "sous_prefecture": _suivre(sp, "lib_s_pref"),
        "departement": _suivre(dept, "lib_dept"),
        "region": _suivre(reg, "lib_reg"),
        "district": _suivre(reg, "id_dist", "lib_dist"),
        "nb_exploitants_reel": m.nb_reel,
    }


@api_view(["GET"])
def liste_menages(request):
    qs = avec_details_menage(menages_filtres(request.query_params)).order_by("code_men")
    pagination = MenagePagination()
    page = pagination.paginate_queryset(qs, request)
    return pagination.get_paginated_response([_ligne_menage(m) for m in page])


@api_view(["GET", "POST"])
def stats_menages(request):
    params = request.data if request.method == "POST" else request.query_params
    base = menages_filtres(params)
    total = base.count()

    #Exploitant réelement enregistré
    exploitants = Exploitant.objects.filter(id_men__in=base.values("id_men"))
    nb_exploitant = exploitants.count()
    avec = exploitants.order_by().values("id_men").distinct().count()
    # total = base.count()
    avec_plusieurs_exploitant=(
        exploitants
        .values("id_men")
        .annotate(nb=Count("id_expl"))
        .filter(nb__gt=2)
        .count()
        )
                    
    # avec = base.filter(
    #     exploitant__isnull=False          # si related_name par défaut
    # ).distinct().count()
    # ou plus explicite :
    # avec = base.filter(id_men__in=Exploitant.objects.values("id_men")).count()

    return Response({
        "total": total,
        "avec":total - avec_plusieurs_exploitant,
        "sans": total - avec,
        "exploitants":nb_exploitant,
        "avec_plusieurs":avec_plusieurs_exploitant
    })



@api_view(["GET"])
def options_geo_menages(request, niveau):
    """Zones présentes dans les ménages, restreintes aux niveaux déjà cochés au-dessus."""
    niveaux = {
        "regions": (Region, "id_reg", "lib_reg", "region_id"),
        "departements": (Departement, "id_dept", "lib_dept", "departement_id"),
        "sous-prefectures": (SousPrefecture, "id_s_pref", "lib_s_pref", "sous_prefecture_id"),
        "zones": (ZoneDenombrement, "id_zone", "code_zone", "zone_id"),
        "localites": (Localite, "id_loc", "lib_loc", "localite_id"),
    }
    if niveau not in niveaux:
        return Response({"detail": "Niveau inconnu."}, status=400)
    modele, champ_id, champ_nom, param = niveaux[niveau]

    params = request.query_params.copy()
    params.pop("q", None)
    for cle in ORDRE_GEO_MENAGE[ORDRE_GEO_MENAGE.index(param):]:
        params.pop(cle, None)

    ids = set(menages_filtres(params).values_list(CHAMPS_GEO_MENAGE[param], flat=True))
    ids.discard(None)
    objets = (modele.objects.filter(**{f"{champ_id}__in": ids})
              .order_by(champ_nom).values(champ_id, champ_nom))
    return Response([{"id": o[champ_id], "nom": o[champ_nom]} for o in objets])

COLONNES_MENAGE = [
    ("code_menage", "Code ménage"), ("nom_chef", "Nom chef"), ("prenom_chef", "Prénom chef"),
    ("contact_chef", "Contact chef"), ("nb_enfants", "Nb enfants"), ("nb_femmes", "Nb femmes"),
    ("nb_personne_en_charge", "Nb personne en charge"), ("nb_personne_menage", "Nb personne ménage"),
    ("nb_enfant_scolarise", "Nb enfant scolarisé"), ("type_batiment", "Type bâtiment"),
    ("materiaux_murs", "Matériaux murs"), ("materiaux_toit", "Matériaux toit"),
    ("type_sanitaire", "Type sanitaire"), ("source_combustible", "Source combustible"),
    ("source_eclairage", "Source éclairage"), ("source_eau", "Source eau"),
    ("nb_exploitant", "Nb exploitant"), ("a_exploitant", "A exploitant anacarde"),
    ("distance_sante", "Distance infr. santé"), ("distance_ecole", "Distance étab. scolaire"),
    ("quartier", "Quartier"), ("reseau", "Réseau accessible"), ("internet", "Accès internet"),
    ("infr_sante", "Infr. santé (quartier)"), ("banque", "Structure bancaire"),
    ("localite", "Localité"), ("zone", "Zone dénombrement"), ("sous_prefecture", "Sous-préfecture"),
    ("departement", "Département"), ("region", "Région"), ("district", "District"),
    ("nb_exploitants_reel", "Nb exploitants du ménage"),
]


@csrf_exempt
@require_http_methods(["GET", "POST"])
def export_menages(request):
    """?fmt=xlsx (défaut) | csv. Filtres et `ids` (liste d'identifiants), en GET ou POST."""
    params = request.POST if request.method == "POST" else request.GET
    fmt = params.get("fmt", "xlsx").lower()
    if fmt not in ("xlsx", "csv"):
        return JsonResponse({"detail": "fmt attendu : xlsx ou csv"}, status=400)

    qs = avec_details_menage(menages_filtres(params)).order_by("code_men")
    titres = [t for _, t in COLONNES_MENAGE]
    cles = [k for k, _ in COLONNES_MENAGE]
    jour = date.today().isoformat()

    def valeurs(m):
        ligne = _ligne_menage(m)
        return [ligne[k] for k in cles]

    if fmt == "csv":
        def flux():
            ecrivain = csv.writer(_Echo(), delimiter=";")
            yield "\ufeff"
            yield ecrivain.writerow(titres)
            for m in qs.iterator(chunk_size=2000):
                yield ecrivain.writerow([_cellule(v) for v in valeurs(m)])
        rep = StreamingHttpResponse(flux(), content_type="text/csv; charset=utf-8")
        rep["Content-Disposition"] = f'attachment; filename="menages_{jour}.csv"'
        return rep

    wb = Workbook(write_only=True)
    ws = wb.create_sheet("Ménages")
    _entete_xlsx(ws, titres)
    n = 0
    for m in qs.iterator(chunk_size=2000):
        ws.append([_valeur_xlsx(v) for v in valeurs(m)])
        n += 1
    ws.auto_filter.ref = f"A1:{get_column_letter(len(titres))}{n + 1}"
    tampon = io.BytesIO()
    wb.save(tampon)
    rep = HttpResponse(
        tampon.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    rep["Content-Disposition"] = f'attachment; filename="menages_{jour}.xlsx"'
    return rep

# ── SIG : téléchargements massifs par circonscription ──────────────

NIVEAUX_SIG = ["district", "region", "departement", "sous_prefecture", "localite", "quartier"]
LABEL_NIVEAU = {"district": "District", "region": "Région", "departement": "Département",
                "sous_prefecture": "Sous-préfecture", "localite": "Localité", "quartier": "Quartier"}


class GeoJSON6(Func):
    """Géométrie exacte, 6 décimales (≈ 10 cm)."""
    template = "ST_AsGeoJSON(%(expressions)s, 6)"
    output_field = TextField()


@api_view(["GET"])
def sig_arbre(request):
    """Arbre administratif à plat : [id, id_parent, nom] par niveau."""
    return Response({
        "district": list(District.objects.order_by("lib_dist").values_list("id_dist", "lib_dist")),
        "region": list(Region.objects.order_by("lib_reg").values_list("id_reg", "id_dist", "lib_reg")),
        "departement": list(Departement.objects.order_by("lib_dept").values_list("id_dept", "id_reg", "lib_dept")),
        "sous_prefecture": list(SousPrefecture.objects.order_by("lib_s_pref").values_list("id_s_pref", "id_dept", "lib_s_pref")),
        "localite": list(Localite.objects.order_by("lib_loc").values_list("id_loc", "id_s_pref", "lib_loc")),
        "quartier": list(Quartier.objects.filter(id_loc__isnull=False).order_by("lib_quar")
                         .values_list("id_quar", "id_loc", "lib_quar")),
    })


def resoudre_circonscriptions(params):
    """
    Nœuds cochés → zones couvertes. Un nœud couvre tout son sous-arbre.
    Renvoie des ensembles d'identifiants : district, region, departement,
    sous_prefecture, localite (couvertes) et quartier (cochés directement).
    """
    sel = {n: [int(v) for v in liste_valeurs(params, n)] for n in NIVEAUX_SIG}
    reg = set(sel["region"])
    if sel["district"]:
        reg |= set(Region.objects.filter(id_dist__in=sel["district"]).values_list("id_reg", flat=True))
    dep = set(sel["departement"])
    if reg:
        dep |= set(Departement.objects.filter(id_reg__in=reg).values_list("id_dept", flat=True))
    sp = set(sel["sous_prefecture"])
    if dep:
        sp |= set(SousPrefecture.objects.filter(id_dept__in=dep).values_list("id_s_pref", flat=True))
    loc = set(sel["localite"])
    if sp:
        loc |= set(Localite.objects.filter(id_s_pref__in=sp).values_list("id_loc", flat=True))
    return {"district": set(sel["district"]), "region": reg, "departement": dep,
            "sous_prefecture": sp, "localite": loc, "quartier": set(sel["quartier"])}


def q_circonscription(c, prefixes):
    """Filtre « situé dans la sélection », à partir d'un ou plusieurs chemins vers Quartier."""
    cond = None
    for p in prefixes:
        part = Q(**{f"{p}__in": list(c["quartier"])}) | Q(**{f"{p}__id_loc__in": list(c["localite"])})
        cond = part if cond is None else cond | part
    return cond


class Couche:
    """champs : (nom court ≤ 10 car., titre, type C/N/F) ; lignes() : ([valeurs], géométrie GeoJSON texte | None)."""
    def __init__(self, nom, champs, lignes, label=0):
        self.nom, self.champs, self.lignes, self.label = nom, champs, lignes, label


# ── Rubriques géospatiales ──

ADMIN_SIG = [
    ("district", District, "id_dist", "lib_dist", "geo_dist", None),
    ("region", Region, "id_reg", "lib_reg", "geom_reg", "id_dist__lib_dist"),
    ("departement", Departement, "id_dept", "lib_dept", "geom_dept", "id_reg__lib_reg"),
    ("sous_prefecture", SousPrefecture, "id_s_pref", "lib_s_pref", "geo_s_pref", "id_dept__lib_dept"),
    ("localite", Localite, "id_loc", "lib_loc", "geo_loc", "id_s_pref__lib_s_pref"),
    ("quartier", Quartier, "id_quar", "lib_quar", None, "id_loc__lib_loc"),   # pas de géométrie
]


def couches_decoupage(c):
    couches = []
    for niveau, modele, f_id, f_nom, f_geom, f_parent in ADMIN_SIG:
        if niveau == "quartier":
            qs = modele.objects.filter(Q(id_quar__in=list(c["quartier"])) | Q(id_loc__in=list(c["localite"])))
        else:
            qs = modele.objects.filter(**{f"{f_id}__in": list(c[niveau])})
        qs = qs.order_by(f_nom)
        if not qs.exists():
            continue
        cols = [f_id, f_nom] + ([f_parent] if f_parent else [])
        if f_geom:
            qs = qs.annotate(geojson=GeoJSON6(f_geom))
            cols.append("geojson")

        def lignes(qs=qs, cols=cols, niveau=niveau, f_parent=f_parent, f_geom=f_geom):
            for r in qs.values_list(*cols).iterator(chunk_size=500):
                yield ([LABEL_NIVEAU[niveau], r[0], r[1], r[2] if f_parent else None],
                       r[-1] if f_geom else None)

        couches.append(Couche(niveau, [("niveau", "Niveau", "C"), ("id", "Identifiant", "N"),
                                       ("nom", "Nom", "C"), ("parent", "Parent", "C")], lignes, label=2))
    return couches


def couche_parcelles(c, statuts):
    base = "id_expl__id_men__id_quar"
    loc, sp = f"{base}__id_loc", f"{base}__id_loc__id_s_pref"
    cond = q_circonscription(c, [base])
    champs = [("code", "Code parcelle", "C"), ("statut", "Statut", "C"), ("sup_ha", "Superficie (ha)", "F"),
              ("annee", "Année", "N"), ("code_expl", "Code exploitant", "C"), ("nom_expl", "Exploitant", "C"),
              ("region", "Région", "C"), ("departem", "Département", "C"), ("sous_pref", "Sous-préfecture", "C"),
              ("localite", "Localité", "C"), ("quartier", "Quartier", "C"), ("zone_int", "Zone interdite", "C")]

    def lignes():
        for modele, statut in ((ParcelleCorrecte, "correcte"), (ParcelleIncorrecte, "incorrecte")):
            if statut not in statuts:
                continue
            cols = ["code_parc", "superficie_ha", "annee_mise_place", "id_expl__code_expl",
                    "id_expl__nom_expl", "id_expl__pren_expl",
                    f"{sp}__id_dept__id_reg__lib_reg", f"{sp}__id_dept__lib_dept",
                    f"{sp}__lib_s_pref", f"{loc}__lib_loc", f"{base}__lib_quar"]
            if modele is ParcelleCorrecte:
                cols.append("parcelle_zone_interdite")
            qs = (avec_superficie(modele.objects.filter(cond, geom_parc__isnull=False))
                  .annotate(geojson=GeoJSON6("geom_parc")).order_by("id_parc")
                  .values_list(*cols, "geojson"))
            for r in qs.iterator(chunk_size=1000):
                nom = ((r[4] or "") + " " + (r[5] or "")).strip() or None
                zone = r[11] if modele is ParcelleCorrecte else None
                yield [r[0], statut, r[1], r[2], r[3], nom, r[6], r[7], r[8], r[9], r[10], zone], r[-1]

    return [Couche("parcelles", champs, lignes)]


# ── Rubriques attributaires : (titres, générateur de lignes) ──

def rubrique_menages(c):
    qs = avec_details_menage(Menage.objects.filter(q_circonscription(c, ["id_quar"]))).order_by("code_men")
    cles = [k for k, _ in COLONNES_MENAGE]

    def lignes():
        for m in qs.iterator(chunk_size=3000):   # chunk un peu plus gros
            ligne = _ligne_menage(m)
            yield [ligne[k] for k in cles]
    return [t for _, t in COLONNES_MENAGE], lignes()


def rubrique_denombrements(c):
    cond = q_circonscription(c, ["id_quar", "id_men__id_quar"])
    qs = avec_details_denomb(Denombrement.objects.filter(cond)).order_by("id_denomb")
    cles = [k for k, _ in COLONNES_DENOMB]

    def lignes():
        for d in qs.iterator(chunk_size=2000):
            ligne = _ligne_denombrement(d)
            yield [ligne[k] for k in cles]
    return [t for _, t in COLONNES_DENOMB], lignes()


# Données d'identité et de pièces : volontairement exclues de l'export de masse
EXPL_EXCLUS = {"lien_photo", "justificatif_identite", "numero_justicatif", "nb_justificatif_identite",
               "numero_securite_social", "photo_cmu"}


def rubrique_exploitants(c):
    champs = [f.name for f in Exploitant._meta.concrete_fields
              if not f.is_relation and f.name not in EXPL_EXCLUS]
    titres = [n.replace("_", " ").capitalize() for n in champs] + [
        "Niveau d'instruction", "Code ménage", "Quartier", "Localité", "Sous-préfecture",
        "Département", "Région", "District", "Nb parcelles"]
    qs = (Exploitant.objects.filter(q_circonscription(c, ["id_men__id_quar"]))
          .select_related("id_niv", "id_men__id_quar__id_loc__id_s_pref__id_dept__id_reg__id_dist")
          .annotate(nb_parcelles=Count("parcellecorrecte")).order_by("code_expl"))

    def lignes():
        for e in qs.iterator(chunk_size=2000):
            q = _suivre(e.id_men, "id_quar")
            loc = _suivre(q, "id_loc")
            sp = _suivre(loc, "id_s_pref")
            dept = _suivre(sp, "id_dept")
            reg = _suivre(dept, "id_reg")
            yield [getattr(e, n) for n in champs] + [
                _suivre(e.id_niv, "lib_niv"), _suivre(e.id_men, "code_men"), _suivre(q, "lib_quar"),
                _suivre(loc, "lib_loc"), _suivre(sp, "lib_s_pref"), _suivre(dept, "lib_dept"),
                _suivre(reg, "lib_reg"), _suivre(reg, "id_dist", "lib_dist"), e.nb_parcelles]
    return titres, lignes()


# ── Écriture des formats ──

def _json_defaut(o):
    return float(o) if isinstance(o, Decimal) else str(o)


def _xml(v):
    return xml_escape(re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", "" if v is None else str(v)))


def _flux_geojson(couches):
    yield '{"type":"FeatureCollection","features":['
    premier = True
    for c in couches:
        noms = [k for k, _, _ in c.champs]
        for valeurs, geom in c.lignes():
            props = json.dumps(dict(zip(noms, valeurs)), default=_json_defaut, ensure_ascii=False)
            yield ("" if premier else ",") + f'{{"type":"Feature","properties":{props},"geometry":{geom or "null"}}}'
            premier = False
    yield "]}"


def _kml_geom(g):
    t = g.get("type")
    if t == "Point":
        return f"<Point><coordinates>{g['coordinates'][0]},{g['coordinates'][1]}</coordinates></Point>"
    if t not in ("Polygon", "MultiPolygon"):
        return ""
    ring = lambda r: " ".join(f"{x},{y}" for x, y, *_ in r)
    polys = [g["coordinates"]] if t == "Polygon" else g["coordinates"]
    parts = []
    for rings in polys:
        trous = "".join(f"<innerBoundaryIs><LinearRing><coordinates>{ring(r)}</coordinates></LinearRing></innerBoundaryIs>"
                        for r in rings[1:])
        parts.append(f"<Polygon><outerBoundaryIs><LinearRing><coordinates>{ring(rings[0])}</coordinates>"
                     f"</LinearRing></outerBoundaryIs>{trous}</Polygon>")
    return parts[0] if len(parts) == 1 else f"<MultiGeometry>{''.join(parts)}</MultiGeometry>"


def _flux_kml(couches):
    yield ('<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document>'
           '<Style id="p"><LineStyle><color>ff452f14</color><width>2</width></LineStyle>'
           '<PolyStyle><color>664f9a4f</color></PolyStyle></Style>')
    for c in couches:
        yield f"<Folder><name>{_xml(c.nom)}</name>"
        for valeurs, geom in c.lignes():
            data = "".join(f'<Data name="{k}"><value>{_xml(v)}</value></Data>'
                           for (k, _, _), v in zip(c.champs, valeurs) if v is not None)
            forme = _kml_geom(json.loads(geom)) if geom else ""
            yield (f"<Placemark><name>{_xml(valeurs[c.label])}</name><styleUrl>#p</styleUrl>"
                   f"<ExtendedData>{data}</ExtendedData>{forme}</Placemark>")
        yield "</Folder>"
    yield "</Document></kml>"


def _parties_polygone(g):
    polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
    parties = []
    for rings in polys:
        for i, anneau in enumerate(rings):
            pts = [(float(x), float(y)) for x, y, *_ in anneau]
            parties.append(_anneau_oriente(pts, horaire=(i == 0)))
    return parties


def _ecrire_shp(dossier, base, couche):
    """Écrit base.shp/.shx/.dbf/.prj/.cpg. Renvoie False si la couche est vide."""
    it = iter(couche.lignes())
    tampon, forme = [], None
    for valeurs, geom in it:                     # on attend la 1re géométrie pour fixer le type
        g = json.loads(geom) if geom else None
        tampon.append((valeurs, g))
        if g is not None:
            forme = shapefile.POINT if g["type"] == "Point" else shapefile.POLYGON
            break
    if not tampon:
        return False

    w = shapefile.Writer(os.path.join(dossier, base), shapeType=forme or shapefile.POLYGON, encoding="utf-8")
    for nom, _, kind in couche.champs:
        if kind == "N":
            w.field(nom, "N", size=18, decimal=0)
        elif kind == "F":
            w.field(nom, "N", size=18, decimal=6)
        else:
            w.field(nom, "C", size=100)

    def ajouter(valeurs, g):
        if g is None:
            w.null()
        elif g["type"] == "Point" and forme == shapefile.POINT:
            w.point(float(g["coordinates"][0]), float(g["coordinates"][1]))
        elif g["type"] in ("Polygon", "MultiPolygon") and forme == shapefile.POLYGON:
            w.poly(_parties_polygone(g))
        else:
            w.null()
        w.record(*[float(v) if isinstance(v, Decimal) else v for v in valeurs])

    for valeurs, g in tampon:
        ajouter(valeurs, g)
    for valeurs, geom in it:
        ajouter(valeurs, json.loads(geom) if geom else None)
    w.close()

    with open(os.path.join(dossier, f"{base}.prj"), "w") as f:
        f.write(WKT_WGS84)
    with open(os.path.join(dossier, f"{base}.cpg"), "w") as f:
        f.write("UTF-8")
    return True


def _reponse_shp(couches, nom):
    tmp = tempfile.TemporaryFile()               # supprimé à la fermeture par FileResponse
    ecrit = False
    with tempfile.TemporaryDirectory() as dossier:
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
            for c in couches:
                base = re.sub(r"[^A-Za-z0-9_-]+", "_", c.nom)
                if _ecrire_shp(dossier, base, c):
                    ecrit = True
                    for ext in ("shp", "shx", "dbf", "prj", "cpg"):
                        z.write(os.path.join(dossier, f"{base}.{ext}"), f"{base}.{ext}")
    if not ecrit:
        tmp.close()
        return JsonResponse({"detail": "Aucune donnée dans cette sélection."}, status=404)
    tmp.seek(0)
    return FileResponse(tmp, as_attachment=True, filename=nom, content_type="application/zip")


def _reponse_attributs(titres, lignes, fmt, base):
    if fmt == "csv":
        def flux():
            ecr = csv.writer(_Echo(), delimiter=";")
            yield "\ufeff"
            yield ecr.writerow(titres)
            for l in lignes:
                yield ecr.writerow([_valeur_csv(v) for v in l])
        rep = StreamingHttpResponse(flux(), content_type="text/csv; charset=utf-8")
        rep["Content-Disposition"] = f'attachment; filename="{base}.csv"'
        return rep

    wb = Workbook(write_only=True)
    ws = wb.create_sheet("Données")
    _entete_xlsx(ws, titres)
    n = 0
    for l in lignes:
        ws.append([_valeur_xlsx(v) for v in l])
        n += 1
    ws.auto_filter.ref = f"A1:{get_column_letter(len(titres))}{n + 1}"
    tampon = io.BytesIO()
    wb.save(tampon)
    rep = HttpResponse(tampon.getvalue(),
                       content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    rep["Content-Disposition"] = f'attachment; filename="{base}.xlsx"'
    return rep


@csrf_exempt                      # lecture seule : aucune donnée n'est modifiée
@require_http_methods(["POST"])
def export_sig(request):
    """
    POST rubrique=decoupage|parcelles|menages|exploitants|denombrements, fmt, 
    et les nœuds cochés : district, region, departement, sous_prefecture, localite, quartier
    (identifiants séparés par des virgules). Parcelles : statuts=correcte,incorrecte.
    """
    p = request.POST
    rubrique, fmt = p.get("rubrique", ""), p.get("fmt", "").lower()
    geo = rubrique in ("decoupage", "parcelles")
    if not geo and rubrique not in ("menages", "exploitants", "denombrements"):
        return JsonResponse({"detail": "Rubrique inconnue."}, status=400)
    if fmt not in (("geojson", "kml", "shp") if geo else ("xlsx", "csv")):
        return JsonResponse({"detail": "Format non disponible pour cette rubrique."}, status=400)

    c = resoudre_circonscriptions(p)
    if not any(c.values()):
        return JsonResponse({"detail": "Aucune circonscription sélectionnée."}, status=400)
    base = f"{rubrique}_{date.today().isoformat()}"

    if geo:
        if rubrique == "decoupage":
            couches = couches_decoupage(c)
        else:
            statuts = {s for s in (p.get("statuts") or "").split(",") if s in ("correcte", "incorrecte")}
            if not statuts:
                return JsonResponse({"detail": "Choisissez au moins un statut de parcelle."}, status=400)
            couches = couche_parcelles(c, statuts)
        if not couches:
            return JsonResponse({"detail": "Aucune donnée dans cette sélection."}, status=404)

        if fmt == "shp":
            return _reponse_shp(couches, f"{base}_shp.zip")
        if fmt == "kml":
            rep = StreamingHttpResponse(_flux_kml(couches), content_type="application/vnd.google-earth.kml+xml")
            rep["Content-Disposition"] = f'attachment; filename="{base}.kml"'
            return rep
        rep = StreamingHttpResponse(_flux_geojson(couches), content_type="application/geo+json")
        rep["Content-Disposition"] = f'attachment; filename="{base}.geojson"'
        return rep

    construire = {"menages": rubrique_menages, "exploitants": rubrique_exploitants,
                  "denombrements": rubrique_denombrements}[rubrique]
    titres, lignes = construire(c)
    return _reponse_attributs(titres, lignes, fmt, base)




    # ── Administration ─────────────────────────────────────────────────

def _depuis(dt):
    """'il y a 12 min' à partir d'une date."""
    if not dt:
        return None
    s = max(int((timezone.now() - dt).total_seconds()), 0)
    if s < 3600:
        return f"il y a {max(s // 60, 1)} min"
    if s < 86400:
        return f"il y a {s // 3600} h"
    return f"il y a {s // 86400} j"


@api_view(["GET"])
@permission_classes([droit("acces_admin")])
def admin_tableau_bord(request):
    parcelles = ParcelleCorrecte.objects
    anomalies = (
        avec_superficie(ParcelleCorrecte.objects).filter(superficie_ha__isnull=True).count()
        + parcelles.filter(geom_parc__isnull=True).count()
        + parcelles.filter(id_enqt__isnull=True).count()
        + Exploitant.objects.filter(_vide("contacts")).count()
    )

    activite = []
    for lot in ImportLot.objects.order_by("-cree_le")[:4]:
        if lot.statut == "publie":
            titre, genre = f"Import de {lot.nb_valides + lot.nb_avertissements} parcelles publié", "ok"
        elif lot.statut == "annule":
            titre, genre = "Publication annulée", "alerte"
        else:
            titre, genre = f"Import en brouillon : {lot.nom_fichier}", "import"
        activite.append({"titre": titre, "detail": f"Lot #{lot.id} · {_depuis(lot.publie_le or lot.cree_le)}", "genre": genre})
    if anomalies:
        activite.append({"titre": f"{anomalies} anomalies détectées",
                         "detail": "Superficie, contour, enquêteur ou contact manquants", "genre": "alerte"})

    utilisateurs = []
    for u in User.objects.prefetch_related("groups").order_by("-last_login", "-date_joined")[:6]:
        utilisateurs.append({
            "id": u.id, "nom": f"{u.first_name} {u.last_name}".strip() or u.username, "email": u.email,
            "role": role_de(u), "actif": u.is_active,
            "derniere_connexion": u.last_login.isoformat() if u.last_login else None})

    return Response({
        "compteurs": {
            "exploitants": Exploitant.objects.count(),
            "parcelles": parcelles.count(),
            "menages": Menage.objects.count(),
            "enquetes": Enquete.objects.count(),
            "imports": ImportLot.objects.count(),
            "utilisateurs": AuthUser.objects.count(),
            "anomalies": anomalies,
        },
        "utilisateurs": utilisateurs,
        "activite": activite,
        "mis_a_jour": timezone.now().isoformat(),
    })


@api_view(["GET"])
@permission_classes([droit("acces_admin")])
def admin_exploitants(request):
    """Tableau « Tous les exploitants » : filtres district et statut, pagination."""
    sans_contour = Count("parcellecorrecte", filter=Q(parcellecorrecte__geom_parc__isnull=True))
    qs = (
        Exploitant.objects
        .select_related("id_men__id_quar__id_loc__id_s_pref__id_dept__id_reg__id_dist")
        .annotate(nb=Count("parcellecorrecte"), sans_contour=sans_contour)
        .filter(nb__gt=0)
    )
    districts = liste_valeurs(request.query_params, "district_id")
    if districts:
        qs = qs.filter(id_men__id_quar__id_loc__id_s_pref__id_dept__id_reg__id_dist__in=districts)
    statut = request.query_params.get("statut", "")
    if statut == "valide":
        qs = qs.filter(sans_contour=0)
    elif statut == "erreur_gps":
        qs = qs.filter(sans_contour__gt=0)
    for mot in request.query_params.get("q", "").strip().split()[:5]:
        qs = qs.filter(Q(nom_expl__icontains=mot) | Q(pren_expl__icontains=mot) | Q(code_expl__icontains=mot))

    # superficie par exploitant en une requête
    sup = dict(
        avec_superficie(ParcelleCorrecte.objects).values("id_expl")
        .annotate(s=Sum("superficie_ha")).values_list("id_expl", "s")
    )
    pagination = ExploitantPagination()
    page = pagination.paginate_queryset(qs.order_by("code_expl"), request)
    lignes = []
    for e in page:
        dist = _suivre(e.id_men, "id_quar", "id_loc", "id_s_pref", "id_dept", "id_reg", "id_dist")
        lignes.append({
            "id": e.id_expl, "code": e.code_expl, "nom": e.nom_expl, "prenom": e.pren_expl,
            "contacts": e.contacts, "district": _suivre(dist, "lib_dist"),
            "parcelles": e.nb, "superficie": round(float(sup.get(e.id_expl) or 0), 2),
            "statut": "erreur_gps" if e.sans_contour else "valide",
        })
    return pagination.get_paginated_response(lignes)


# ── Droits, rôles, journal ─────────────────────────────────────────
PAGES = ["voir_denombrement", "voir_menage", "voir_carte", "voir_exploitants", "voir_statistique"]

ROLES = ["Super-admin", "Admin", "Superviseur", "Enquêteur","Client"]

DROITS_TOUS = ["voir_guide"] 

DROITS = [
    ("acces_admin", "Accéder au back-office"),
    ("voir_donnees", "Consulter les données"),
    ("exporter", "Exporter les données"),
    ("importer", "Importer des fichiers"),
    ("publier", "Publier ou annuler un lot"),
    ("gerer_utilisateurs", "Gérer utilisateurs et rôles"),
    ("gerer_referentiels", "Gérer les référentiels"),
    ("voir_logs", "Consulter les logs"),
    ("parametres", "Modifier les paramètres"),
    ("sauvegardes", "Gérer les sauvegardes"),
    ("voir_guide", "Voir le guide d'aide"),

    #----------------DROITS DES CLIENTS ---------------------
    ("voir_denombrement", "Voir le dénombrement"),
    ("voir_menage", "Voir les ménages"),
    ("voir_carte", "Voir la carte"),
    ("voir_exploitants", "Voir les exploitants"),
    ("voir_statistique", "Voir les statistiques"),
    ("voir_donnees_validees", "Voir les données validées"),
]

CODES_DROITS = [c for c, _ in DROITS]

DROITS_DEFAUT = {
    "Admin": ["acces_admin", "voir_donnees", "exporter", "importer", "publier", "gerer_referentiels", "voir_logs",*PAGES,"voir_donnees_validees","voir_guide"],
    "Superviseur": ["voir_donnees", "exporter", "importer",*PAGES,"voir_guide"],
    "Enquêteur": ["voir_donnees",*PAGES,"voir_guide"],
    "Client":["voir_donnees", *PAGES,"voir_donnees","voir_guide"],

}


def _semer_droits():
    """Remplit les droits par défaut des rôles jamais semés (sans écraser ceux déjà réglés)."""
    ligne = Parametre.objects.filter(cle="roles_semes").first()
    deja = set(filter(None, (ligne.valeur if ligne else "").split(",")))
    manquants = [r for r in DROITS_DEFAUT if r not in deja]
    if not manquants:
        return
    for role in manquants:
        if not RoleDroit.objects.filter(role=role).exists():
            RoleDroit.objects.bulk_create([RoleDroit(role=role, droit=d) for d in DROITS_DEFAUT[role]])
    Parametre.objects.update_or_create(
        cle="roles_semes", defaults={"valeur": ",".join(sorted(deja | set(manquants)))})


def role_de(u):
    if u.is_superuser:
        return "Super-admin"
    noms = {g.name for g in u.groups.all()}
    return next((r for r in ROLES[1:] if r in noms), "Utilisateur")


def droits_de(u):
    if u.is_superuser:
        return CODES_DROITS
    _semer_droits()
    role = role_de(u)
    # Sans ligne pour ce droit dans la matrice, il est accordé : décocher l'enregistre explicitement
    ligne = Parametre.objects.filter(cle="droits_tous_semes").first()
    deja = set(filter(None, (ligne.valeur if ligne else "").split(",")))
    for d in DROITS_TOUS:
        if d not in deja:
            for r in ROLES[1:]:
                RoleDroit.objects.get_or_create(role=r, droit=d)
            deja.add(d)
            Parametre.objects.update_or_create(
                cle="droits_tous_semes", defaults={"valeur": ",".join(sorted(deja))})
    return list(RoleDroit.objects.filter(role=role).values_list("droit", flat=True))


def a_droit(u, droit):
    return droit in droits_de(u)

def droit_import(request, nom_action=None):
    u = request.user
    return bool(u and u.is_authenticated and u.is_active and a_droit(u, nom_action))



# class DonneesValideesPermission(BasePermission):
#     """Lecture : voir_donnees_validees. Import : importer. Publication / annulation : publier."""
#     message = "Droit insuffisant."

#     def has_permission(self, request, view):
#         u = request.user
#         if not (u and u.is_authenticated and u.is_active):
#             return False
#         requis = getattr(view, "cls", None)  # inutilisé : le droit est fixé par le décorateur ci-dessous
#         return a_droit(u, "voir_donnees_validees")



def journaliser(request, action, cible="", detail="", utilisateur=None):
    u = getattr(request, "user", None)
    nom = utilisateur if utilisateur is not None else (u.username if u and u.is_authenticated else "")
    JournalActivite.objects.create(
        utilisateur=nom, action=action, cible=str(cible)[:200], detail=detail,
        ip=request.META.get("REMOTE_ADDR"))


def _json_user(u):
    return {
        "id": u.id, "username": u.username, "prenom": u.first_name, "nom_famille": u.last_name,
        "nom": f"{u.first_name} {u.last_name}".strip() or u.username, "email": u.email,
        "role": role_de(u), "actif": u.is_active,
        "derniere_connexion": u.last_login.isoformat() if u.last_login else None,
    }


def _poser_role(u, role):
    u.groups.clear()
    u.is_superuser = role == "Super-admin"
    u.is_staff = role in ("Super-admin", "Admin")
    u.save(update_fields=["is_superuser", "is_staff"])
    if role in ROLES[1:]:
        u.groups.add(Group.objects.get_or_create(name=role)[0])


# ── Connexion ──

@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def auth_login(request):
    nom = str(request.data.get("username", "")).strip()
    u = authenticate(username=nom, password=str(request.data.get("password", "")))
    if not u or not u.is_active:
        journaliser(request, "connexion_echec", nom, utilisateur=nom)
        return Response({"detail": "Identifiant ou mot de passe incorrect."}, status=400)
    token, _ = Token.objects.get_or_create(user=u)
    u.last_login = timezone.now()
    u.save(update_fields=["last_login"])
    journaliser(request, "connexion", nom, utilisateur=nom)
    return Response({"token": token.key, "user": {**_json_user(u), "droits": droits_de(u)}})


@api_view(["GET"])
@permission_classes([droit("voir_donnees")])
def auth_me(request):
    return Response({**_json_user(request.user), "droits": droits_de(request.user)})


@api_view(["POST"])
@permission_classes([droit("voir_donnees")])
def auth_logout(request):
    Token.objects.filter(user=request.user).delete()
    journaliser(request, "deconnexion", request.user.username)
    return Response(status=204)


# ── Utilisateurs ──

@api_view(["GET", "POST"])
@permission_classes([droit("gerer_utilisateurs")])
def admin_utilisateurs(request):
    if request.method == "GET":
        qs = User.objects.prefetch_related("groups").order_by("username")
        for mot in request.query_params.get("q", "").strip().split()[:4]:
            qs = qs.filter(Q(username__icontains=mot) | Q(first_name__icontains=mot)
                           | Q(last_name__icontains=mot) | Q(email__icontains=mot))
        pagination = ExploitantPagination()
        page = pagination.paginate_queryset(qs, request)
        return pagination.get_paginated_response([_json_user(u) for u in page])

    d = request.data
    username, mdp, role = str(d.get("username", "")).strip(), str(d.get("password", "")), d.get("role", "Enquêteur")
    if not username:
        return Response({"detail": "Identifiant obligatoire."}, status=400)
    if len(mdp) < 8:
        return Response({"detail": "Mot de passe : 8 caractères minimum."}, status=400)
    if role not in ROLES:
        return Response({"detail": "Rôle inconnu."}, status=400)
    if role == "Super-admin" and not request.user.is_superuser:
        return Response({"detail": "Seul un Super-admin peut créer un Super-admin."}, status=403)
    if User.objects.filter(username__iexact=username).exists():
        return Response({"detail": "Cet identifiant existe déjà."}, status=409)
    u = User.objects.create_user(
        username=username, password=mdp, email=str(d.get("email", "")).strip(),
        first_name=str(d.get("prenom", "")).strip(), last_name=str(d.get("nom_famille", "")).strip())
    _poser_role(u, role)
    journaliser(request, "utilisateur_cree", username, f"Rôle : {role}")
    return Response(_json_user(u), status=201)


@api_view(["PATCH", "DELETE"])
@permission_classes([droit("gerer_utilisateurs")])
def admin_utilisateur(request, id_user):
    u = get_object_or_404(User, pk=id_user)
    moi = request.user
    dernier_super = u.is_superuser and User.objects.filter(is_superuser=True, is_active=True).count() <= 1
    if u.is_superuser and not moi.is_superuser:
        return Response({"detail": "Seul un Super-admin peut modifier un Super-admin."}, status=403)

    if request.method == "DELETE":
        if u.pk == moi.pk:
            return Response({"detail": "Vous ne pouvez pas supprimer votre propre compte."}, status=409)
        if dernier_super:
            return Response({"detail": "Impossible de supprimer le dernier Super-admin."}, status=409)
        nom = u.username
        u.delete()
        journaliser(request, "utilisateur_supprime", nom)
        return Response(status=204)

    d = request.data
    if "role" in d:
        if d["role"] not in ROLES:
            return Response({"detail": "Rôle inconnu."}, status=400)
        if d["role"] == "Super-admin" and not moi.is_superuser:
            return Response({"detail": "Seul un Super-admin peut attribuer ce rôle."}, status=403)
        if d["role"] != role_de(u) and (u.pk == moi.pk or (dernier_super and d["role"] != "Super-admin")):
            return Response({"detail": "Ce changement de rôle n'est pas autorisé pour ce compte."}, status=409)
    if "actif" in d and not d["actif"] and (u.pk == moi.pk or dernier_super):
        return Response({"detail": "Ce compte ne peut pas être suspendu."}, status=409)

    for champ, attr in (("prenom", "first_name"), ("nom_famille", "last_name"), ("email", "email")):
        if champ in d:
            setattr(u, attr, str(d[champ]).strip())
    if "actif" in d:
        u.is_active = bool(d["actif"])
    if d.get("password"):
        if len(str(d["password"])) < 8:
            return Response({"detail": "Mot de passe : 8 caractères minimum."}, status=400)
        u.set_password(str(d["password"]))
        Token.objects.filter(user=u).delete()          # déconnecte ses sessions
    u.save()
    if "role" in d:
        _poser_role(u, d["role"])
    journaliser(request, "utilisateur_modifie", u.username, ", ".join(k for k in d if k != "password"))
    return Response(_json_user(u))


# ── Rôles et permissions ──

@api_view(["GET", "PUT"])
@permission_classes([droit("gerer_utilisateurs")])
def admin_roles(request):
    _semer_droits()
    if request.method == "PUT":
        for role in ROLES[1:]:
            if role in request.data:
                valides = [x for x in request.data[role] if x in CODES_DROITS]
                with transaction.atomic():
                    RoleDroit.objects.filter(role=role).delete()
                    RoleDroit.objects.bulk_create([RoleDroit(role=role, droit=x) for x in valides])
        journaliser(request, "roles_modifies", "permissions")

    par_groupe = dict(Group.objects.annotate(n=Count("user")).values_list("name", "n"))
    par_groupe["Super-admin"] = User.objects.filter(is_superuser=True).count()
    return Response({
        "droits": [{"code": c, "label": l} for c, l in DROITS],
        "roles": [{
            "nom": r, "modifiable": r != "Super-admin", "utilisateurs": par_groupe.get(r, 0),
            "droits": CODES_DROITS if r == "Super-admin"
            else list(RoleDroit.objects.filter(role=r).values_list("droit", flat=True)),
        } for r in ROLES],
    })


# ── Référentiels ──

REFERENTIELS = {
    "campagnes": (Campagne, "id_campag", "annee", "Campagnes"),
    "milieux": (MilieuResidence, "id_milieu", "lib_mil", "Milieux de résidence"),
    "modes": (ModeFaireValoir, "id_mode", "lib_mode", "Modes de faire-valoir"),
    "niveaux": (NiveauInstruction, "id_niv", "lib_niv", "Niveaux d'instruction"),
}


def _utilise(obj):
    return any(getattr(obj, r.get_accessor_name()).exists()
               for r in obj._meta.related_objects if r.one_to_many)


@api_view(["GET"])
@permission_classes([droit("gerer_referentiels")])
def admin_referentiels(request):
    return Response([{"code": c, "label": lab, "total": m.objects.count()}
                     for c, (m, _, _, lab) in REFERENTIELS.items()])


@api_view(["GET", "POST"])
@permission_classes([droit("gerer_referentiels")])
def admin_referentiel(request, nom):
    if nom not in REFERENTIELS:
        return Response({"detail": "Référentiel inconnu."}, status=404)
    modele, pk, champ, _ = REFERENTIELS[nom]
    if request.method == "POST":
        libelle = str(request.data.get("libelle", "")).strip()
        if not libelle:
            return Response({"detail": "Libellé obligatoire."}, status=400)
        try:
            obj = modele.objects.create(**{champ: libelle})
        except IntegrityError:
            return Response({"detail": "Cette valeur existe déjà."}, status=409)
        journaliser(request, "referentiel_ajoute", nom, libelle)
        return Response({"id": getattr(obj, pk), "libelle": libelle}, status=201)
    return Response([{"id": i, "libelle": l}
                     for i, l in modele.objects.order_by(champ).values_list(pk, champ)])


@api_view(["PATCH", "DELETE"])
@permission_classes([droit("gerer_referentiels")])
def admin_referentiel_item(request, nom, id_item):
    if nom not in REFERENTIELS:
        return Response({"detail": "Référentiel inconnu."}, status=404)
    modele, pk, champ, _ = REFERENTIELS[nom]
    obj = get_object_or_404(modele, **{pk: id_item})
    if request.method == "DELETE":
        if _utilise(obj):
            return Response({"detail": "Cette valeur est utilisée par des données : suppression refusée."}, status=409)
        valeur = getattr(obj, champ)
        obj.delete()
        journaliser(request, "referentiel_supprime", nom, str(valeur))
        return Response(status=204)
    libelle = str(request.data.get("libelle", "")).strip()
    if not libelle:
        return Response({"detail": "Libellé obligatoire."}, status=400)
    setattr(obj, champ, libelle)
    try:
        obj.save()
    except IntegrityError:
        return Response({"detail": "Cette valeur existe déjà."}, status=409)
    journaliser(request, "referentiel_modifie", nom, libelle)
    return Response({"id": id_item, "libelle": libelle})


# ── Journal ──

@api_view(["GET"])
@permission_classes([droit("voir_logs")])
def admin_logs(request):
    qs = JournalActivite.objects.all()
    for mot in request.query_params.get("q", "").strip().split()[:4]:
        qs = qs.filter(Q(utilisateur__icontains=mot) | Q(cible__icontains=mot) | Q(detail__icontains=mot))
    if request.query_params.get("action"):
        qs = qs.filter(action=request.query_params["action"])
    pagination = ExploitantPagination()
    page = pagination.paginate_queryset(qs, request)

    # Comptes concernés par cette page, en une seule requête
    comptes = {u.username: u for u in
               User.objects.filter(username__in={l.utilisateur for l in page}).prefetch_related("groups")}

    resultats = []
    for l in page:
        u = comptes.get(l.utilisateur)
        resultats.append({
            "id": l.id, "date": l.date.isoformat(), "utilisateur": l.utilisateur,
            "role": role_de(u) if u else None,
            "prenom": u.first_name if u else None,
            "nom_famille": u.last_name if u else None,
            "action": l.action, "cible": l.cible, "detail": l.detail, "ip": l.ip,
        })
    rep = pagination.get_paginated_response(resultats)
    rep.data["actions"] = list(JournalActivite.objects.order_by().values_list("action", flat=True).distinct())
    return rep


# ── Paramètres ──

PARAMETRES = {
    "organisation": ("Nom de l'organisation", "Géoportail Anacarde", "texte"),
    "campagne": ("Campagne en cours", str(date.today().year), "texte"),
    "ha_min": ("Superficie minimale plausible d'une parcelle (ha)", "0.01", "nombre"),
    "ha_max": ("Superficie maximale plausible d'une parcelle (ha)", "500", "nombre"),
    "chevauchement": ("Seuil de chevauchement signalé (0 à 1)", "0.5", "ratio"),
}

def param(cle):
    ligne = Parametre.objects.filter(cle=cle).first()
    return ligne.valeur if ligne and ligne.valeur != "" else PARAMETRES[cle][1]


@api_view(["GET", "PUT"])
@permission_classes([droit("parametres")])
def admin_parametres(request):
    if request.method == "PUT":
        for cle, valeur in request.data.items():
            if cle not in PARAMETRES:
                continue
            valeur = str(valeur).strip().replace(",", ".") if PARAMETRES[cle][2] != "texte" else str(valeur).strip()
            if PARAMETRES[cle][2] != "texte":
                try:
                    n = float(valeur)
                except ValueError:
                    return Response({"detail": f"« {PARAMETRES[cle][0]} » doit être un nombre."}, status=400)
                if n < 0 or (PARAMETRES[cle][2] == "ratio" and n > 1):
                    return Response({"detail": f"Valeur hors limites : {PARAMETRES[cle][0]}."}, status=400)
            Parametre.objects.update_or_create(cle=cle, defaults={"valeur": valeur})
        journaliser(request, "parametres_modifies", "parametres", ", ".join(request.data.keys()))
    return Response([{"cle": c, "label": l, "type": t, "valeur": param(c)} for c, (l, _, t) in PARAMETRES.items()])


# ── Sauvegardes ──

DOSSIER_SAUVEGARDES = Path(getattr(settings, "BACKUP_DIR", Path(settings.BASE_DIR) / "sauvegardes"))
NOM_SAUVEGARDE = re.compile(r"^[\w.-]+\.dump$")


@api_view(["GET", "POST"])
@permission_classes([droit("sauvegardes")])
def admin_sauvegardes(request):
    DOSSIER_SAUVEGARDES.mkdir(parents=True, exist_ok=True)
    if request.method == "POST":
        bd = connection.settings_dict
        nom = f"anacarde_{timezone.now():%Y%m%d_%H%M%S}.dump"
        cmd = ["pg_dump", "-Fc", "-h", str(bd.get("HOST") or "localhost"), "-p", str(bd.get("PORT") or 5432),
               "-U", bd["USER"], "-f", str(DOSSIER_SAUVEGARDES / nom), bd["NAME"]]
        try:
            r = subprocess.run(cmd, env={**os.environ, "PGPASSWORD": str(bd.get("PASSWORD") or "")},
                               capture_output=True, text=True, timeout=1800)
        except FileNotFoundError:
            return Response({"detail": "pg_dump est introuvable sur le serveur (installe les outils client PostgreSQL)."}, status=501)
        if r.returncode != 0:
            (DOSSIER_SAUVEGARDES / nom).unlink(missing_ok=True)
            return Response({"detail": f"Échec de pg_dump : {r.stderr.strip()[:300]}"}, status=500)
        journaliser(request, "sauvegarde_creee", nom)
    fichiers = sorted(DOSSIER_SAUVEGARDES.glob("*.dump"), key=lambda f: f.stat().st_mtime, reverse=True)
    return Response([{"nom": f.name, "taille": f.stat().st_size,
                      "date": timezone.datetime.fromtimestamp(f.stat().st_mtime, timezone.get_current_timezone()).isoformat()}
                     for f in fichiers])


@api_view(["GET", "DELETE"])
@permission_classes([droit("sauvegardes")])
def admin_sauvegarde(request, nom):
    chemin = DOSSIER_SAUVEGARDES / nom
    if not NOM_SAUVEGARDE.match(nom) or not chemin.is_file():
        return Response({"detail": "Sauvegarde introuvable."}, status=404)
    if request.method == "DELETE":
        chemin.unlink()
        journaliser(request, "sauvegarde_supprimee", nom)
        return Response(status=204)
    journaliser(request, "sauvegarde_telechargee", nom)
    return FileResponse(open(chemin, "rb"), as_attachment=True, filename=nom)


# ── Versions de l'application ──────────────────────────────────────

TYPES_VERSION = ("majeure", "mineure", "patch")
ENVIRONNEMENTS = ("production", "preproduction", "developpement", "archivee")
FORMAT_VERSION = re.compile(r"^v?\d+\.\d+\.\d+([-.][\w.]+)?$")


def _json_version(v):
    return {"id": v.id, "numero": v.numero, "type": v.type, "environnement": v.environnement,
            "date": v.date_sortie.isoformat(), "notes": v.notes}


def _lire_version(d, existant=None):
    """Valide le corps de la requête. Renvoie (champs, erreur)."""
    numero = str(d.get("numero", existant.numero if existant else "")).strip()
    if not FORMAT_VERSION.match(numero):
        return None, "Numéro invalide : attendu comme v2.4.2 (trois nombres séparés par des points)."
    if not numero.startswith("v"):
        numero = "v" + numero
    type_ = d.get("type", existant.type if existant else "")
    env = d.get("environnement", existant.environnement if existant else "")
    if type_ not in TYPES_VERSION:
        return None, "Type inconnu."
    if env not in ENVIRONNEMENTS:
        return None, "Environnement inconnu."
    try:
        jour = date.fromisoformat(str(d.get("date", existant.date_sortie.isoformat() if existant else "")))
    except ValueError:
        return None, "Date invalide."
    doublon = AppVersion.objects.filter(numero__iexact=numero)
    if existant:
        doublon = doublon.exclude(pk=existant.pk)
    if doublon.exists():
        return None, f"La version {numero} existe déjà."
    return {"numero": numero, "type": type_, "environnement": env, "date_sortie": jour,
            "notes": str(d.get("notes", "")).strip()[:5000]}, None


def _un_seul_en_production(version):
    if version.environnement == "production":
        AppVersion.objects.filter(environnement="production").exclude(pk=version.pk).update(environnement="archivee")


@api_view(["GET", "POST"])
@permission_classes([droit("parametres")])
def admin_versions(request):
    if request.method == "GET":
        return Response([_json_version(v) for v in AppVersion.objects.all()])
    champs, erreur = _lire_version(request.data)
    if erreur:
        return Response({"detail": erreur}, status=400)
    with transaction.atomic():
        v = AppVersion.objects.create(**champs)
        _un_seul_en_production(v)
    journaliser(request, "version_creee", v.numero, f"{v.type} · {v.environnement}")
    return Response(_json_version(v), status=201)


@api_view(["PATCH", "DELETE"])
@permission_classes([droit("parametres")])
def admin_version(request, id_version):
    v = get_object_or_404(AppVersion, pk=id_version)
    if request.method == "DELETE":
        numero = v.numero
        v.delete()
        journaliser(request, "version_supprimee", numero)
        return Response(status=204)
    champs, erreur = _lire_version(request.data, v)
    if erreur:
        return Response({"detail": erreur}, status=400)
    with transaction.atomic():
        for k, val in champs.items():
            setattr(v, k, val)
        v.save()
        _un_seul_en_production(v)
    journaliser(request, "version_modifiee", v.numero)
    return Response(_json_version(v))