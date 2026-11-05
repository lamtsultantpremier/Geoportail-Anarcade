# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models

class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=150)

    class Meta:
        managed = False
        db_table = 'auth_group'

class AuthGroupPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_group_permissions'
        unique_together = (('group', 'permission'),)

class AuthPermission(models.Model):
    name = models.CharField(max_length=255)
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    codename = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'auth_permission'
        unique_together = (('content_type', 'codename'),)


class AuthUser(models.Model):
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.BooleanField()
    username = models.CharField(unique=True, max_length=150)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.CharField(max_length=254)
    is_staff = models.BooleanField()
    is_active = models.BooleanField()
    date_joined = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'auth_user'


class AuthUserGroups(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_groups'
        unique_together = (('user', 'group'),)


class AuthUserUserPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_user_permissions'
        unique_together = (('user', 'permission'),)


class Campagne(models.Model):
    id_campag = models.AutoField(primary_key=True)
    annee = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'campagne'
class Denombrement(models.Model):
    id_denomb = models.AutoField(primary_key=True)
    uuid = models.CharField(max_length=255, blank=True, null=True)
    num_questionnaire = models.CharField(max_length=255, blank=True, null=True)
    id_men = models.ForeignKey('Menage', models.DB_CASCADE, db_column='id_men', blank=True, null=True)
    id_quar = models.ForeignKey('Quartier', models.DB_CASCADE, db_column='id_quar', blank=True, null=True)
    id_milieu_residence = models.ForeignKey('MilieuResidence', models.DB_CASCADE, db_column='id_milieu_residence', blank=True, null=True)
    coordonnee_gps = models.CharField(max_length=255, blank=True, null=True)
    nom_chef_menage = models.CharField(max_length=255, blank=True, null=True)
    prenom_chef_menage = models.CharField(max_length=255, blank=True, null=True)
    contact_chef_menage = models.CharField(max_length=255, blank=True, null=True)
    a_exploitant = models.CharField(max_length=255, blank=True, null=True)
    nb_exploitant = models.CharField(max_length=10, blank=True, null=True)
    date_enqt = models.CharField(max_length=100, blank=True, null=True)
    nom_prenom_enqt = models.CharField(max_length=255, blank=True, null=True)
    contact_enqt = models.CharField(max_length=20, blank=True, null=True)
    statut = models.CharField(max_length=100, blank=True, null=True)
    source = models.CharField(max_length=255, blank=True, null=True)
    date_creation = models.CharField(max_length=255, blank=True, null=True)
    secteur_administratif = models.CharField(max_length=255, blank=True, null=True)
    code_men = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'denombrement'

class Departement(models.Model):
    id_dept = models.AutoField(primary_key=True)
    lib_dept = models.CharField(max_length=150)
    geom_dept = models.TextField(blank=True, null=True)  # This field type is a guess.
    id_reg = models.ForeignKey('Region', models.DB_CASCADE, db_column='id_reg')

    class Meta:
        managed = False
        db_table = 'departement'


class District(models.Model):
    id_dist = models.AutoField(primary_key=True)
    lib_dist = models.CharField(max_length=150)
    geo_dist = models.TextField(blank=True, null=True)  # This field type is a guess.

    class Meta:
        managed = False
        db_table = 'district'

class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.SmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    id = models.BigAutoField(primary_key=True)
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'

class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_session'



class Enquete(models.Model):
    id_enq = models.AutoField(primary_key=True)
    date_enq = models.DateField(blank=True, null=True)
    id_enqt = models.ForeignKey('Enqueteur', models.DO_NOTHING, db_column='id_enqt')
    id_expl = models.ForeignKey('Exploitant', models.DB_CASCADE, db_column='id_expl')
    num_questionnaire = models.CharField(unique=True, max_length=500, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'enquete'


class Enqueteur(models.Model):
    id_enqt = models.AutoField(primary_key=True)
    nom_pren_enqt = models.CharField(max_length=1000, blank=True, null=True)
    cont_enqt = models.CharField(max_length=50, blank=True, null=True)
    code_enqt = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'enqueteur'
        unique_together = (('code_enqt', 'nom_pren_enqt'),)


class Exploitant(models.Model):
    id_expl = models.AutoField(primary_key=True)
    code_expl = models.CharField(unique=True, max_length=50)
    nom_expl = models.CharField(max_length=100, blank=True, null=True)
    pren_expl = models.CharField(max_length=100, blank=True, null=True)
    date_nais = models.DateField(blank=True, null=True)
    pays_nais = models.CharField(max_length=100, blank=True, null=True)
    lieu_nais = models.CharField(max_length=100, blank=True, null=True)
    situa_mat = models.CharField(max_length=50, blank=True, null=True)
    profession = models.CharField(max_length=100, blank=True, null=True)
    nationalite = models.CharField(max_length=100, blank=True, null=True)
    contacts = models.CharField(max_length=50, blank=True, null=True)
    lien_photo = models.CharField(max_length=255, blank=True, null=True)
    id_men = models.ForeignKey('Menage', models.DB_CASCADE, db_column='id_men', blank=True, null=True)
    id_niv = models.ForeignKey('NiveauInstruction', models.DB_SET_NULL, db_column='id_niv', blank=True, null=True)
    nom_declare = models.CharField(max_length=150, blank=True, null=True)
    pren_declare = models.CharField(max_length=150, blank=True, null=True)
    cont_declare = models.CharField(max_length=150, blank=True, null=True)
    sexe = models.CharField(max_length=50, blank=True, null=True)
    formation_agricole = models.CharField(max_length=4, blank=True, null=True)
    justificatif_identite = models.CharField(max_length=255, blank=True, null=True)
    numero_justicatif = models.CharField(max_length=255, blank=True, null=True)
    nb_justificatif_identite = models.CharField(max_length=255, blank=True, null=True)
    a_batiment_stockage = models.CharField(max_length=255, blank=True, null=True)
    capacite_stockage = models.CharField(max_length=255, blank=True, null=True)
    a_machine_agricole = models.CharField(max_length=255, blank=True, null=True)
    machine_agricole = models.CharField(max_length=255, blank=True, null=True)
    equipement_sechage = models.CharField(max_length=255, blank=True, null=True)
    depense_sante = models.CharField(max_length=255, blank=True, null=True)
    a_compte_bancaire = models.CharField(max_length=255, blank=True, null=True)
    raison_absence_compte_bancaire = models.CharField(max_length=255, blank=True, null=True)
    raison_absence_compte_mobile_money = models.CharField(max_length=100, blank=True, null=True)
    a_deja_utilise_compte_mobile_money = models.CharField(max_length=100, blank=True, null=True)
    montant_mensuel_transaction = models.CharField(max_length=255, blank=True, null=True)
    montant_max_transaction = models.CharField(max_length=255, blank=True, null=True)
    benificie_cmu = models.CharField(max_length=255, blank=True, null=True)
    numero_securite_social = models.CharField(max_length=255, blank=True, null=True)
    appartient_a_organisation_producteur = models.CharField(max_length=10, blank=True, null=True)
    type_organisation = models.CharField(max_length=255, blank=True, null=True)
    specialisation_organisation = models.CharField(max_length=255, blank=True, null=True)
    participe_a_tontine = models.CharField(max_length=255, blank=True, null=True)
    type_tontine = models.CharField(max_length=255, blank=True, null=True)
    montant_tontine = models.CharField(max_length=255, blank=True, null=True)
    nb_brouette = models.CharField(max_length=255, blank=True, null=True)
    nb_machette = models.CharField(max_length=255, blank=True, null=True)
    nb_atomisateur = models.CharField(max_length=255, blank=True, null=True)
    nb_bascule = models.CharField(max_length=255, blank=True, null=True)
    nb_tronconneuse = models.CharField(max_length=255, blank=True, null=True)
    nb_atomobile = models.CharField(max_length=255, blank=True, null=True)
    nb_motocyclette = models.CharField(max_length=255, blank=True, null=True)
    nb_tricycle = models.CharField(max_length=255, blank=True, null=True)
    nb_animaux_trait = models.CharField(max_length=255, blank=True, null=True)
    nb_charette = models.CharField(max_length=255, blank=True, null=True)
    nb_autre_materiel = models.CharField(max_length=255, blank=True, null=True)
    exploitant_est_representant = models.CharField(max_length=255, blank=True, null=True)
    nom_representant = models.CharField(max_length=255, blank=True, null=True)
    prenom_representant = models.CharField(max_length=255, blank=True, null=True)
    contact_representant = models.CharField(max_length=255, blank=True, null=True)
    compte_mobile = models.CharField(max_length=255, blank=True, null=True)
    photo_cmu = models.CharField(max_length=255, blank=True, null=True)
    nb_bicyclette = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'exploitant'



class Georeferencement(models.Model):
    id_geor = models.AutoField(primary_key=True)
    date_geor = models.DateField(blank=True, null=True)
    id_parc = models.ForeignKey('ParcelleCorrecte', models.DO_NOTHING, db_column='id_parc')

    class Meta:
        managed = False
        db_table = 'georeferencement'


class Localite(models.Model):
    id_loc = models.AutoField(primary_key=True)
    lib_loc = models.CharField(max_length=150)
    geo_loc = models.TextField(blank=True, null=True)  # This field type is a guess.
    id_s_pref = models.ForeignKey('SousPrefecture', models.DB_CASCADE, db_column='id_s_pref')
    id_zone_denombrement = models.ForeignKey('ZoneDenombrement', models.DB_CASCADE, db_column='id_zone_denombrement', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'localite'


class Menage(models.Model):
    id_men = models.AutoField(primary_key=True)
    code_men = models.CharField(unique=True, max_length=50)
    nom_chef = models.CharField(max_length=100, blank=True, null=True)
    pren_chef = models.CharField(max_length=100, blank=True, null=True)
    cont_chef = models.CharField(max_length=50, blank=True, null=True)
    nb_enfant = models.CharField(max_length=50, blank=True, null=True)
    nb_femme = models.CharField(max_length=50, blank=True, null=True)
    id_quar = models.ForeignKey('Quartier', models.DB_CASCADE, db_column='id_quar', blank=True, null=True)
    nb_personne_en_charge = models.CharField(max_length=10, blank=True, null=True)
    nb_personne_menage = models.CharField(max_length=10, blank=True, null=True)
    nb_enfant_scolarise = models.CharField(max_length=10, blank=True, null=True)
    type_batiment = models.CharField(max_length=255, blank=True, null=True)
    materiaux_principal_murs = models.CharField(max_length=255, blank=True, null=True)
    materiaux_principal_toit = models.CharField(max_length=255, blank=True, null=True)
    type_sanitaire = models.CharField(max_length=255, blank=True, null=True)
    source_combustible = models.CharField(max_length=255, blank=True, null=True)
    source_eclairage = models.CharField(max_length=255, blank=True, null=True)
    source_eau = models.CharField(max_length=255, blank=True, null=True)
    nb_exploitant = models.CharField(max_length=10, blank=True, null=True)
    a_exploitant_anarcade = models.CharField(max_length=100, blank=True, null=True)
    distance_infr_sante = models.CharField(max_length=100, blank=True, null=True)
    distance_etabl_scol = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'menage'


class MilieuResidence(models.Model):
    id_milieu = models.AutoField(primary_key=True)
    lib_mil = models.CharField(unique=True, max_length=100)

    class Meta:
        managed = False
        db_table = 'milieu_residence'


class ModeFaireValoir(models.Model):
    id_mode = models.AutoField(primary_key=True)
    lib_mode = models.CharField(unique=True, max_length=100, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'mode_faire_valoir'


class NiveauInstruction(models.Model):
    id_niv = models.AutoField(primary_key=True)
    lib_niv = models.CharField(unique=True, max_length=100)

    class Meta:
        managed = False
        db_table = 'niveau_instruction'


class Parcelle(models.Model):
    id_parc = models.AutoField(primary_key=True)
    code_parc = models.CharField(max_length=50)
    annee_mise_place = models.IntegerField(blank=True, null=True)
    geom_parc = models.TextField()  # This field type is a guess.
    superficie_tracee = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    id_expl = models.ForeignKey(Exploitant, models.DB_CASCADE, db_column='id_expl')
    id_mode = models.ForeignKey(ModeFaireValoir, models.DB_SET_NULL, db_column='id_mode', blank=True, null=True)
    id_enq = models.ForeignKey(Enquete, models.DB_SET_NULL, db_column='id_enq', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'parcelle'


class ParcelleCorrecte(models.Model):
    id_parc = models.AutoField(primary_key=True)
    code_parc = models.CharField(unique=True, max_length=50)
    annee_mise_place = models.IntegerField(blank=True, null=True)
    geom_parc = models.TextField(blank=True, null=True)  # This field type is a guess.
    superficie_tracee = models.TextField(blank=True, null=True)
    id_expl = models.ForeignKey(Exploitant, models.DB_CASCADE, db_column='id_expl')
    id_mode = models.ForeignKey(ModeFaireValoir, models.DB_SET_NULL, db_column='id_mode', blank=True, null=True)
    id_enqt = models.ForeignKey(Enqueteur, models.DO_NOTHING, db_column='id_enqt', blank=True, null=True)
    surface_utilise = models.CharField(max_length=10, blank=True, null=True)
    surface_mis_en_jachere = models.CharField(max_length=10, blank=True, null=True)
    superficie_en_production = models.CharField(max_length=10, blank=True, null=True)
    superficie_non_en_production = models.CharField(max_length=10, blank=True, null=True)
    nb_entretiens_par_campagne = models.CharField(max_length=10, blank=True, null=True)
    provenance_materiel_vegetal = models.CharField(max_length=255, blank=True, null=True)
    certification = models.CharField(max_length=10, blank=True, null=True)
    access_service_conseil = models.CharField(max_length=10, blank=True, null=True)
    service_conseil_utilise = models.CharField(max_length=255, blank=True, null=True)
    rehabilitation_effectue = models.CharField(max_length=255, blank=True, null=True)
    superficie_rehabilite = models.CharField(max_length=255, blank=True, null=True)
    utilisation_engrais = models.CharField(max_length=10, blank=True, null=True)
    traitement_phytosanitaire = models.CharField(max_length=255, blank=True, null=True)
    prix_engrais = models.CharField(max_length=255, blank=True, null=True)
    prix_entretien_parcelle = models.CharField(max_length=255, blank=True, null=True)
    prix_persticide = models.CharField(max_length=255, blank=True, null=True)
    prix_materiel_agricole = models.CharField(max_length=255, blank=True, null=True)
    anarcade_culture_principal = models.CharField(max_length=10, blank=True, null=True)
    culture_associe = models.CharField(max_length=255, blank=True, null=True)
    nb_frequence_contractuel = models.CharField(max_length=255, blank=True, null=True)
    effectif_contractuel = models.CharField(max_length=10, blank=True, null=True)
    effectif_permanent = models.CharField(max_length=10, blank=True, null=True)
    salaire_main_oeuvre_permanent = models.CharField(max_length=255, blank=True, null=True)
    parcelle_zone_interdite = models.CharField(max_length=10, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'parcelle_correcte'



class ParcelleIncorrecte(models.Model):
    id_parc = models.AutoField(primary_key=True)
    code_parc = models.CharField(unique=True, max_length=50)
    annee_mise_place = models.IntegerField(blank=True, null=True)
    geom_parc = models.TextField(blank=True, null=True)
    superficie_tracee = models.TextField(blank=True, null=True)
    id_expl = models.ForeignKey(Exploitant, models.DB_CASCADE, db_column='id_expl')
    id_mode = models.ForeignKey(ModeFaireValoir, models.DB_SET_NULL, db_column='id_mode', blank=True, null=True)
    id_enqt = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'parcelle_incorrecte'

class ParcelleInfo(models.Model):
    id_parcel = models.AutoField(primary_key=True)
    code_parcel = models.CharField(max_length=255, blank=True, null=True)
    annee_mise_place = models.IntegerField(blank=True, null=True)
    superficie_tracee = models.CharField(max_length=255, blank=True, null=True)
    id_expl = models.ForeignKey(Exploitant, models.DB_CASCADE, db_column='id_expl', blank=True, null=True)
    id_mode = models.ForeignKey(ModeFaireValoir, models.DB_CASCADE, db_column='id_mode', blank=True, null=True)
    id_enqt = models.ForeignKey(Enqueteur, models.DB_CASCADE, db_column='id_enqt', blank=True, null=True)
    surface_utilise = models.CharField(max_length=255, blank=True, null=True)
    superficie_mise_en_jachere = models.CharField(max_length=255, blank=True, null=True)
    superficie_en_production = models.CharField(max_length=255, blank=True, null=True)
    superficie_non_en_production = models.CharField(max_length=255, blank=True, null=True)
    nb_entretiens_par_campagne = models.CharField(max_length=255, blank=True, null=True)
    provenance_materiel_vegetal = models.CharField(max_length=255, blank=True, null=True)
    certification = models.CharField(max_length=255, blank=True, null=True)
    access_service_conseil = models.CharField(max_length=255, blank=True, null=True)
    service_conseil_utilise = models.CharField(max_length=255, blank=True, null=True)
    rehabilitation_effectue = models.CharField(max_length=255, blank=True, null=True)
    superficie_rehabilite = models.CharField(max_length=255, blank=True, null=True)
    utilisation_engrais = models.CharField(max_length=255, blank=True, null=True)
    traitement_phytosanitaire = models.CharField(max_length=255, blank=True, null=True)
    prix_engrais = models.CharField(max_length=255, blank=True, null=True)
    prix_entretien_parcelle = models.CharField(max_length=255, blank=True, null=True)
    prix_persticide = models.CharField(max_length=255, blank=True, null=True)
    prix_materiel_agricole = models.CharField(max_length=255, blank=True, null=True)
    anarcade_culture_principal = models.CharField(max_length=100, blank=True, null=True)
    culture_associe = models.CharField(max_length=255, blank=True, null=True)
    nb_frequence_contractuel = models.CharField(max_length=100, blank=True, null=True)
    effectif_contractuel = models.CharField(max_length=100, blank=True, null=True)
    effectif_permanent = models.CharField(max_length=255, blank=True, null=True)
    salaire_main_oeuvre_permanent = models.CharField(max_length=255, blank=True, null=True)
    parcelle_zone_interdite = models.CharField(max_length=100, blank=True, null=True)
    frequence_permanent = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'parcelle_info'


class PieceJustificatif(models.Model):
    id_piece = models.AutoField(primary_key=True)
    id_expl = models.ForeignKey(Exploitant, models.DB_CASCADE, db_column='id_expl', blank=True, null=True)
    code_expl = models.CharField(max_length=255, blank=True, null=True)
    type_piece = models.CharField(max_length=255, blank=True, null=True)
    numero_piece = models.CharField(max_length=255, blank=True, null=True)
    chemin_photo = models.CharField(max_length=255, blank=True, null=True)
    date_enregistrement = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'piece_justificatif'


class Produire(models.Model):
    pk = models.CompositePrimaryKey('id_parc', 'id_campag')
    id_parc = models.ForeignKey(Parcelle, models.DB_CASCADE, db_column='id_parc')
    id_campag = models.ForeignKey(Campagne, models.DB_CASCADE, db_column='id_campag')
    sup_prod = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    quantite_kg = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    prix_vente = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'produire'


class Quartier(models.Model):
    id_quar = models.AutoField(primary_key=True)
    lib_quar = models.CharField(max_length=150)
    id_loc = models.ForeignKey(Localite, models.DB_CASCADE, db_column='id_loc', blank=True, null=True)
    reseau_accessible = models.CharField(max_length=255, blank=True, null=True)
    acces_internet = models.CharField(max_length=255, blank=True, null=True)
    infrastr_sante = models.CharField(max_length=255, blank=True, null=True)
    structure_bancaire = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'quartier'


class Region(models.Model):
    id_reg = models.AutoField(primary_key=True)
    lib_reg = models.CharField(max_length=150)
    geom_reg = models.TextField(blank=True, null=True)  # This field type is a guess.
    id_dist = models.ForeignKey(District, models.DB_CASCADE, db_column='id_dist')

    class Meta:
        managed = False
        db_table = 'region'


class SousPrefecture(models.Model):
    id_s_pref = models.AutoField(primary_key=True)
    lib_s_pref = models.CharField(max_length=150)
    geo_s_pref = models.TextField(blank=True, null=True)  # This field type is a guess.
    id_dept = models.ForeignKey(Departement, models.DB_CASCADE, db_column='id_dept')

    class Meta:
        managed = False
        db_table = 'sous_prefecture'


class SpatialRefSys(models.Model):
    srid = models.IntegerField(primary_key=True)
    auth_name = models.CharField(max_length=256, blank=True, null=True)
    auth_srid = models.IntegerField(blank=True, null=True)
    srtext = models.CharField(max_length=2048, blank=True, null=True)
    proj4text = models.CharField(max_length=2048, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'spatial_ref_sys'


class ZoneDenombrement(models.Model):
    id_zone = models.AutoField(primary_key=True)
    code_zone = models.CharField(max_length=50)

    class Meta:
        managed = False
        db_table = 'zone_denombrement'

class ImportLot(models.Model):
    nom_fichier = models.CharField(max_length=255)
    format = models.CharField(max_length=20)
    statut = models.CharField(max_length=10, default="brouillon")  # brouillon | publie | annule
    cree_le = models.DateTimeField(auto_now_add=True)
    publie_le = models.DateTimeField(null=True, blank=True)
    nb_total = models.IntegerField(default=0)
    nb_valides = models.IntegerField(default=0)
    nb_avertissements = models.IntegerField(default=0)
    nb_erreurs = models.IntegerField(default=0)
    nb_doublons = models.IntegerField(default=0)
    class Meta:
        db_table = "import_lot"
        ordering = ["-cree_le"]


class ImportParcelle(models.Model):
    lot = models.ForeignKey(ImportLot, on_delete=models.CASCADE, related_name="parcelles")
    rang = models.PositiveIntegerField()
    code = models.CharField(max_length=100, null=True, blank=True)
    geojson = models.TextField()                       # géométrie corrigée (MultiPolygon)
    proprietes = models.JSONField(default=dict)
    statut = models.CharField(max_length=14)           # valide | avertissement | erreur
    messages = models.JSONField(default=list)
    id_expl = models.IntegerField(null=True, blank=True)
    superficie_ha = models.DecimalField(max_digits=14, decimal_places=6, null=True, blank=True)
    id_parc_publie = models.IntegerField(null=True, blank=True)
    # A été ajouter
    id_parc_remplace = models.IntegerField(null=True, blank=True)   # id_parc existant remplacé
    ancienne_version = models.JSONField(null=True, blank=True)      # sauvegarde avant remplacement
    class Meta:
        db_table = "import_parcelle"
        ordering = ["rang"]