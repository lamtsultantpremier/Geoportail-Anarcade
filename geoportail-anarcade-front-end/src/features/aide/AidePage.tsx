import { useMemo, useState } from 'react'
import { BookOpen, ChevronDown, Lightbulb, Search, TriangleAlert } from 'lucide-react'
import { useAuth } from '../admin/auth'

type Bloc =
  | { t: 'p'; text: string }
  | { t: 'steps'; title?: string; items: string[] }
  | { t: 'faq'; items: [string, string][] }
  | { t: 'tip'; text: string }
  | { t: 'warn'; text: string }
  | { t: 'table'; head: string[]; rows: string[][] }

interface Chapitre { id: string; titre: string; resume: string; tone: 'red' | 'orange' | 'green' | 'blue'
  droit?: string; blocs: Bloc[] }

const TONE = {
  red: { bar: 'bg-red-500', chip: 'bg-red-50 text-red-700', ring: 'ring-red-200' },
  orange: { bar: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700', ring: 'ring-orange-200' },
  green: { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200' },
  blue: { bar: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700', ring: 'ring-blue-200' },
} as const

const CHAPITRES: Chapitre[] = [
  {
    id: 'demarrer', titre: 'Premiers pas', tone: 'blue',
    resume: 'Se connecter, ouvrir le menu, comprendre l\'écran.\n Mais avant toute action, il faut se connecter. Si vous n\'avez pas de compte, contacter l\'administrateur.',
    blocs: [
      { t: 'p', text: "Le géoportail Anacarde rassemble les données du recensement des producteurs d'anacarde : où sont les parcelles, qui les exploite, dans quel ménage vivent les exploitants, et qui a mené l'enquête." },
      { t: 'steps', title: 'Ouvrir le menu', items: [
        "Cliquez sur l'icône verte à gauche de « GÉOPORTAIL ANACARDE » en haut de l'écran.",
        "Le menu glisse depuis la gauche. Chaque rubrique est colorée.",
        "Cliquez sur une rubrique pour ouvrir sa page : le menu se referme tout seul.",
        "Pour fermer le menu sans changer de page : touche Échap, croix en haut du menu, ou clic sur la zone sombre.",
      ] },
      { t: 'steps', title: 'Se connecter', items: [
        "Si une page affiche « Connexion requise », saisissez votre identifiant et votre mot de passe puis cliquez sur Se connecter.",
        "Votre nom et votre rôle s'affichent en haut à droite. Le bouton Déconnexion est à côté.",
        "Votre session est conservée : vous n'avez pas à vous reconnecter à chaque visite.",
      ] },
      { t: 'tip', text: "Les rubriques du menu dépendent de votre rôle. Si une rubrique que vous cherchez n'apparaît pas, c'est que votre compte n'y a pas accès : demandez à un administrateur." },
      { t: 'table', head: ['Je veux…', 'Je vais dans…'], rows: [
        ['Voir les parcelles sur une carte', 'Carte'],
        ['Chercher un producteur', 'Exploitants'],
        ['Consulter les fiches de dénombrement', 'Dénombrements'],
        ['Voir les logements et familles', 'Ménages'],
        ['Obtenir des chiffres et graphiques', 'Statiques'],
        ['Télécharger des données en masse', 'SIG'],
      ] },
    ],
  },
  {
    id: 'carte', titre: 'La carte', tone: 'red', droit: 'voir_carte',
    resume: 'Parcelles, regroupements, filtres, fonds de carte, fiche parcelle.',
    blocs: [
      { t: 'p', text: "La carte affiche toutes les parcelles validées. De loin, vous voyez des pastilles vertes numérotées : chaque nombre est un regroupement de parcelles proches. En zoomant, les regroupements se découpent, puis les vrais contours des parcelles apparaissent (à partir d'un fort zoom)." },
      { t: 'steps', title: 'Se déplacer', items: [
        "Glissez la carte avec la souris pour la déplacer. Molette ou boutons + et − pour zoomer.",
        "Cliquez sur une pastille numérotée : la carte zoome et le groupe se divise.",
        "La boussole rétablit le nord.",
      ] },
      { t: 'steps', title: 'Filtrer les parcelles', items: [
        "Dans le panneau de gauche, ouvrez Région, Département, Sous-préf. ou Localité.",
        "Cochez une ou plusieurs zones : la carte, le compteur et le recadrage se mettent à jour immédiatement.",
        "Chaque niveau se limite aux zones des niveaux au-dessus. Décocher un niveau vide ceux du dessous.",
        "Superficie (ha) : saisissez un minimum et un maximum, puis Entrée ou cliquez ailleurs.",
        "Réinitialiser efface tous les filtres.",
      ] },
      { t: 'steps', title: 'Changer le fond de carte', items: [
        "Sous les boutons + et −, cliquez sur l'icône « couches ».",
        "Choisissez Rues, Clair, Sombre, Satellite ou Relief. Votre choix est mémorisé.",
      ] },
      { t: 'steps', title: 'Afficher les couches', items: [
        "Dans « Couches SIG » (panneau de gauche), cochez Régions ou Zones interdites pour les afficher ou les masquer.",
      ] },
      { t: 'steps', title: "Ouvrir la fiche d'une parcelle", items: [
        "Survolez une parcelle : une bulle indique son code.",
        "Cliquez dessus : la carte la centre et la fiche s'ouvre à droite.",
        "Quatre onglets : Parcelle (localisation, superficie), Exploitant (identité), Enquêteur (qui a relevé la parcelle) et Fiche (téléchargement PDF).",
        "La croix de la fiche la ferme. Cliquer dans le vide de la carte aussi.",
      ] },
      { t: 'steps', title: 'Chercher une parcelle', items: [
        "Dans la barre de recherche en haut de la page, tapez au moins 2 caractères : code de parcelle, nom d'exploitant ou localité.",
        "Naviguez avec les flèches ↑ ↓ et validez avec Entrée : la carte vole sur la parcelle et la fiche s'ouvre.",
        "Raccourci : Ctrl+K (ou ⌘K) place le curseur dans la recherche.",
        "La recherche respecte les filtres actifs : réinitialisez-les pour chercher dans tout le pays.",
      ] },
      { t: 'steps', title: 'Exporter les résultats', items: [
        "Bouton « Exporter les résultats » en haut à droite, puis choisissez Tableur (CSV) ou Données SIG (GeoJSON).",
        "Le fichier contient exactement les parcelles correspondant aux filtres. Le GeoJSON est limité à 5 000 parcelles : affinez vos filtres au-delà.",
      ] },
      { t: 'faq', items: [
        ["Je ne vois aucun contour de parcelle.", "Zoomez davantage : les contours n'apparaissent qu'à fort zoom. Avant, ce sont des pastilles."],
        ["La carte est grise.", "Le fond de carte met parfois quelques secondes à charger. Essayez un autre fond avec l'icône couches."],
        ["Le compteur est inférieur à ce que j'attends.", "Un filtre est peut-être actif. Cliquez sur Réinitialiser."],
      ] },
    ],
  },
  {
    id: 'exploitants', titre: 'Les exploitants', tone: 'blue', droit: 'voir_exploitants',
    resume: 'Liste, recherche, filtres, fiche complète, PDF, export.',
    blocs: [
      { t: 'p', text: "Un exploitant est un producteur qui possède ou cultive des parcelles. Cette page liste uniquement ceux qui ont au moins une parcelle validée." },
      { t: 'steps', title: 'Chercher un exploitant', items: [
        "Tapez dans le champ de recherche : nom, prénom, code exploitant, téléphone ou quartier.",
        "La recherche se lance quand vous cliquez sur la loupe ou appuyez sur Entrée, pas pendant la frappe.",
        "Plusieurs mots se combinent : « kouassi herebo » trouve un Kouassi du quartier Herebo.",
        "La croix du champ efface la recherche.",
      ] },
      { t: 'steps', title: 'Filtrer par zone', items: [
        "Au-dessus de la liste : Région, Département, Sous-préfecture, Localité.",
        "Cochez plusieurs cases dans chaque liste. La liste, le compteur et le bouton de téléchargement se mettent à jour à chaque case.",
        "Le champ « Filtrer la liste… » aide à retrouver un nom dans une longue liste.",
      ] },
      { t: 'steps', title: 'Ouvrir la fiche', items: [
        "Cliquez sur l'œil au bout de la ligne.",
        "À gauche : identité, activité, résidence. À droite : nombre de parcelles, superficie totale, localités, carte des parcelles et tableau.",
        "Cliquez sur une ligne du tableau ou sur l'épingle : la carte zoome sur cette parcelle.",
        "L'icône couches de la carte change le fond (satellite, rues…).",
      ] },
      { t: 'steps', title: "Télécharger la géométrie d'une parcelle", items: [
        "Dans le tableau des parcelles, trois colonnes : GeoJSON, SHP et KML.",
        "GeoJSON : pour le web et la plupart des logiciels SIG. SHP : archive .zip pour QGIS ou ArcGIS. KML : pour Google Earth.",
        "Un tiret signifie que la parcelle n'a pas de contour.",
      ] },
      { t: 'steps', title: 'Fiche PDF', items: [
        "« Consulter la fiche PDF » l'ouvre dans un nouvel onglet. « Exporter la fiche » la télécharge.",
        "Le PDF contient : en-tête et photo, informations personnelles, socio-économiques, ménage, habitat, détail de chaque parcelle avec sa carte satellite, et pièces justificatives.",
        "La génération prend quelques secondes (les cartes sont dessinées une par une).",
      ] },
      { t: 'steps', title: 'Télécharger des données en Excel ou CSV', items: [
        "Bouton « Télécharger les données » au-dessus des filtres.",
        "Choisissez Excel (3 feuilles : informations, exploitants, parcelles) ou CSV (un tableau, une ligne par parcelle).",
        "Le fichier respecte les filtres et la recherche en cours.",
      ] },
      { t: 'tip', text: "Les numéros de téléphone sont conservés avec leur 0 dans le fichier Excel. Dans un CSV ouvert avec Excel, le 0 peut disparaître : préférez le format Excel." },
    ],
  },
  {
    id: 'denombrements', titre: 'Les dénombrements', tone: 'orange', droit: 'voir_denombrement',
    resume: 'Fiches de dénombrement des ménages : tableau, filtres, sélection, export.',
    blocs: [
      { t: 'p', text: "Le dénombrement est la première étape du recensement : un enquêteur passe dans chaque ménage et remplit une fiche. Cette page liste toutes ces fiches, avec 30 colonnes de détails." },
      { t: 'steps', title: 'Lire les indicateurs', items: [
        "Fiches affichées : nombre de fiches selon vos filtres.",
        "Ménages avec exploitant / sans exploitant : la somme des deux égale le nombre de fiches.",
        "Exploitants recensés : somme des effectifs déclarés.",
      ] },
      { t: 'steps', title: 'Chercher et filtrer', items: [
        "Recherche : nom, questionnaire, localité ou UUID, puis Entrée.",
        "Cases à cocher Région, Département, Sous-préf., Localité : plusieurs choix possibles, résultat immédiat.",
        "Listes Statut et Milieu de résidence pour affiner.",
        "Réinitialiser remet tout à zéro. L'adresse de la page contient vos filtres : copiez-la pour la partager.",
      ] },
      { t: 'steps', title: 'Lire le tableau', items: [
        "Les colonnes sont groupées par couleur : identification, enquête, localisation, ménage, exploitant, suivi.",
        "Faites défiler horizontalement pour voir toutes les colonnes : la colonne ID reste visible.",
        "« Par page » change le nombre de lignes (25, 50 ou 100).",
      ] },
      { t: 'steps', title: 'Exporter des fiches choisies', items: [
        "Cochez les cases des lignes voulues (la case de l'en-tête coche toute la page). La sélection est conservée quand vous changez de page.",
        "Cliquez sur Exporter : le nombre affiché est celui des fiches cochées. Choisissez Excel ou CSV.",
        "Sans aucune ligne cochée, l'export reprend toutes les fiches du filtre actif.",
        "« Tout désélectionner » annule la sélection.",
      ] },
    ],
  },
  {
    id: 'menages', titre: 'Les ménages', tone: 'green', droit: 'voir_menage',
    resume: 'Logement, composition, services, indicateurs dynamiques.',
    blocs: [
      { t: 'p', text: "Un ménage est un foyer : un chef de ménage et sa famille. Cette page décrit leur logement, leur composition et leur accès aux services (eau, électricité, santé, école), avec 32 colonnes." },
      { t: 'steps', title: 'Les trois indicateurs', items: [
        "Total ménages : selon les filtres.",
        "Ménages avec exploitants : au moins un exploitant enregistré dans la base.",
        "Ménages sans exploitants : aucun exploitant enregistré.",
        "Quand vous cochez des lignes, les indicateurs se recalculent sur la sélection (la légende devient « Dans la sélection »).",
      ] },
      { t: 'steps', title: 'Chercher', items: [
        "La recherche porte sur le code ménage, le nom ou le prénom d'un exploitant du ménage (pas sur le chef de ménage).",
        "Cinq filtres à cases à cocher : Région, Département, Sous-préfecture, Zone de dénombrement, Localité.",
      ] },
      { t: 'steps', title: 'Exporter', items: [
        "Cochez des lignes, ou n'en cochez aucune pour exporter tout le filtre.",
        "Bouton Exporter, puis Excel ou CSV.",
      ] },
      { t: 'tip', text: "La dernière colonne « Nb exploitants du ménage » compte les exploitants réellement enregistrés. Elle peut différer de « Nb exploitant », qui est le chiffre saisi lors de l'enquête : l'écart signale une donnée à vérifier." },
    ],
  },
  {
    id: 'stats', titre: 'Les statistiques', tone: 'orange', droit: 'voir_statistique',
    resume: 'Chiffres clés, qualité des données, graphiques, tableau récapitulatif.',
    blocs: [
      { t: 'p', text: "La page Statiques transforme les données en chiffres et graphiques utiles pour décider. Tout se recalcule quand vous changez les filtres en haut de la page." },
      { t: 'table', head: ['Bloc', 'Ce qu\'il vous apprend'], rows: [
        ['Indicateurs clés', "Nombre de parcelles, d'exploitants, superficie totale et moyenne."],
        ['Fiabilité des données', "Ce qui manque (superficie, enquêteur, contour, nom, contact). Une barre rouge ou orange signale où compléter ou refaire des enquêtes."],
        ['Répartition', "Où se concentrent parcelles et producteurs. Cliquez sur une barre pour zoomer sur une zone."],
        ['Taille des parcelles', "Combien de petites et grandes parcelles."],
        ['Âge des vergers', "Quels vergers sont à renouveler. Les années invalides sont ignorées."],
        ['Statut foncier', "Propriétaires, locataires, métayers…"],
        ['Profil des exploitants', "Âge, niveau d'instruction, situation matrimoniale, taille du ménage."],
        ['Suivi des enquêtes', "Rythme de la collecte par mois, enquêteurs les plus actifs."],
        ['Tableau récapitulatif', "Une ligne par zone, triable, avec le % de données manquantes en couleur."],
      ] },
      { t: 'steps', title: 'Utiliser le tableau récapitulatif', items: [
        "Cliquez sur un en-tête de colonne pour trier. Cliquez encore pour inverser.",
        "Triez sur « Sans enquêteur » ou « Sans superficie » pour voir en premier les zones les moins bien renseignées.",
        "Vert : moins de 5 % manquant. Orange : 5 à 20 %. Rouge : plus de 20 %.",
        "« Exporter en CSV » télécharge le tableau tel qu'affiché.",
      ] },
    ],
  },
  {
    id: 'sig', titre: 'SIG : téléchargements en masse', tone: 'red', droit: 'exporter',
    resume: 'Télécharger par district, région, sous-préfecture, localité ou quartier.',
    blocs: [
      { t: 'p', text: "La page SIG est un centre de téléchargement. Vous choisissez les zones géographiques voulues, puis le format. Cinq rubriques, de haut en bas : Découpage administratif, Parcelles, Ménages, Exploitants, Dénombrements." },
      { t: 'steps', title: 'Télécharger une sélection de zones', items: [
        "Dans la rubrique voulue, cliquez sur la liste « Circonscriptions ».",
        "L'arbre commence par les districts. Le triangle déplie une zone pour montrer ses sous-zones : District → Région → Département → Sous-préfecture → Localité → Quartier.",
        "Cochez une case : tout ce qui est en dessous se coche aussi. Une case à moitié remplie signifie « une partie seulement ».",
        "Le résumé indique « N circonscription(s) sélectionnée(s) ».",
        "Cliquez sur un bouton de format en haut à droite de la rubrique : le fichier contient les zones cochées.",
      ] },
      { t: 'steps', title: 'Télécharger tout le contenu d\'une zone', items: [
        "Cliquez sur le bouton « Tout » à droite de la zone dans l'arbre.",
        "Une fenêtre propose les formats. Le fichier contient toute la zone et ses sous-zones, même si les cases ne sont pas cochées.",
      ] },
      { t: 'table', head: ['Rubrique', 'Formats', 'Contenu'], rows: [
        ['Découpage administratif', 'Shapefile, KML, GeoJSON', 'Limites des zones sélectionnées. Les quartiers n\'ont pas de contour.'],
        ['Parcelles', 'Shapefile, KML, GeoJSON', 'Contours des parcelles. Deux cases choisissent « correctes » et/ou « incorrectes ».'],
        ['Ménages, Exploitants, Dénombrements', 'Excel, CSV', 'Tableaux de données, sans géométrie.'],
      ] },
      { t: 'table', head: ['Format', 'À utiliser pour…'], rows: [
        ['Shapefile (.zip)', 'QGIS, ArcGIS : décompressez, ouvrez le fichier .shp.'],
        ['KML', 'Google Earth.'],
        ['GeoJSON', 'Sites web et la plupart des logiciels de cartographie.'],
        ['Excel / CSV', 'Tableaux, calculs, statistiques.'],
      ] },
      { t: 'tip', text: "Pour trouver une zone rapidement, tapez son nom dans « Chercher une zone… » : l'arbre se filtre et s'ouvre tout seul. « Tout déplier » ouvre jusqu'aux sous-préfectures." },
      { t: 'warn', text: "Un gros téléchargement (tout le pays) peut prendre plusieurs dizaines de secondes. Patientez : le fichier arrive de lui-même. Les fichiers Exploitants contiennent des données personnelles : manipulez-les avec précaution." },
    ],
  },
  {
    id: 'valides', titre: 'Données validées : importer des parcelles', tone: 'green', droit: 'voir_donnees_validees',
    resume: 'Importer, contrôler, publier, annuler un lot de parcelles.',
    blocs: [
      { t: 'p', text: "Cette page permet d'ajouter ou de mettre à jour des parcelles à partir de fichiers GeoJSON, KML ou Shapefile (zip). Rien n'est publié automatiquement : chaque fichier devient un « lot » que vous contrôlez avant publication." },
      { t: 'steps', title: 'Importer des fichiers', items: [
        "Cliquez sur « Importer des données validées » (en haut) ou « Importer des fichiers ».",
        "Glissez-déposez plusieurs fichiers d'un coup, ou cliquez pour parcourir. Formats : .geojson, .kml, .zip.",
        "Pour un Shapefile, le zip doit contenir .shp, .dbf, .shx et .prj.",
        "Cliquez sur Importer. Chaque fichier est contrôlé par le serveur.",
      ] },
      { t: 'p', text: "Chaque parcelle doit avoir un code (ex. 010064006KY0007WS160101). L'exploitant est retrouvé grâce à ce code, en retirant les deux derniers chiffres." },
      { t: 'table', head: ['Résultat du contrôle', 'Signification'], rows: [
        ['Valide', 'Prête à être publiée.'],
        ['Avertissement', 'Publiable, mais à regarder : géométrie réparée, superficie inhabituelle, chevauchement.'],
        ['Existe déjà', 'Le code est déjà en base : vous déciderez de remplacer ou conserver.'],
        ['Erreur', 'Ne sera pas publiée : code manquant, exploitant introuvable, géométrie illisible…'],
      ] },
      { t: 'steps', title: 'Contrôler sur la carte', items: [
        "Chaque lot a sa couleur. Les erreurs sont en rouge, les doublons en orange.",
        "Cliquez sur une parcelle : l'onglet Qualité explique les problèmes.",
      ] },
      { t: 'steps', title: 'Publier', items: [
        "Cliquez sur Publier sur le lot.",
        "S'il contient des parcelles qui existent déjà, une fenêtre vous demande, parcelle par parcelle, de choisir Oui (remplacer) ou Non (conserver l'existante). Tout est « Non » par défaut.",
        "Les parcelles remplacées gardent leur identifiant : fiches et relations restent valides.",
        "La publication est « tout ou rien » : en cas de problème, rien n'est modifié.",
      ] },
      { t: 'steps', title: 'Annuler', items: [
        "« Annuler la publication » supprime les parcelles ajoutées et rend aux parcelles remplacées leur ancienne version.",
        "« Supprimer » retire un lot brouillon ou annulé.",
      ] },
      { t: 'warn', text: "Publier modifie la base de données utilisée par toute l'équipe. Vérifiez le lot avant de publier. Si vous ne voyez pas les boutons Importer, Publier ou Annuler, votre rôle n'a pas ce droit." },
    ],
  },
  {
    id: 'admin', titre: 'Administration', tone: 'red', droit: 'acces_admin',
    resume: 'Utilisateurs, rôles, référentiels, journal, paramètres, sauvegardes, versions.',
    blocs: [
      { t: 'p', text: "Le back-office est un espace séparé, accessible depuis « Administration » dans le menu. Il demande de se connecter, puis chaque rubrique n'apparaît que si votre rôle y a droit." },
      { t: 'table', head: ['Rubrique', 'Ce qu\'on y fait'], rows: [
        ['Tableau de bord', "Chiffres globaux, utilisateurs récents, activité récente, tableau des exploitants."],
        ['Utilisateurs', "Créer un compte, changer son rôle, suspendre, réinitialiser le mot de passe, supprimer."],
        ['Rôles & permissions', "Cocher les droits de chaque rôle. Un droit coché donne l'accès à la page ou à l'action correspondante."],
        ['Imports', "Suivre tous les lots d'import."],
        ['Référentiels', "Gérer les listes de valeurs : campagnes, milieux, modes de faire-valoir, niveaux d'instruction."],
        ['Logs & activité', "Qui a fait quoi, quand, avec quel rôle."],
        ['Paramètres', "Seuils de contrôle des imports (superficie min et max, chevauchement)."],
        ['Sauvegardes', "Créer et télécharger une copie complète de la base."],
        ["Versions de l'application", "Tenir le journal des versions publiées."],
      ] },
      { t: 'steps', title: 'Créer un utilisateur', items: [
        "Utilisateurs → Nouvel utilisateur.",
        "Renseignez identifiant, nom, prénom, e-mail, rôle et mot de passe (8 caractères minimum).",
        "Enregistrer. Le compte est actif tout de suite.",
      ] },
      { t: 'steps', title: 'Donner ou retirer un accès', items: [
        "Rôles & permissions : chaque colonne est un rôle, chaque ligne un droit.",
        "Cochez ou décochez, puis Enregistrer. Les personnes concernées voient le changement à leur prochaine connexion.",
        "Le Super-admin a tous les droits et ne peut pas être modifié.",
      ] },
      { t: 'tip', text: "Pour limiter un compte, créez-le avec un rôle restreint (Client, par exemple) plutôt que de supprimer des droits à un rôle utilisé par d'autres." },
      { t: 'warn', text: "Vous ne pouvez pas vous supprimer, vous suspendre ni vous rétrograder vous-même, ni supprimer le dernier Super-admin. La restauration d'une sauvegarde se fait uniquement par un technicien, en ligne de commande." },
    ],
  },
  {
    id: 'roles', titre: 'Rôles et droits', tone: 'blue',
    resume: 'Pourquoi certaines pages n\'apparaissent pas.',
    blocs: [
      { t: 'p', text: "Votre rôle décide de ce que vous voyez. Le menu n'affiche que les rubriques auxquelles vous avez droit. Si vous tapez l'adresse d'une page interdite, vous êtes simplement renvoyé vers une page autorisée." },
      { t: 'table', head: ['Droit', 'Donne accès à…'], rows: [
        ['Voir la carte / les exploitants / les ménages / le dénombrement / les statistiques', 'La page correspondante.'],
        ['Voir les données validées', 'La page des lots d\'import (lecture).'],
        ['Importer des fichiers', 'Le bouton d\'import et l\'envoi de fichiers.'],
        ['Publier ou annuler un lot', 'Les boutons Publier et Annuler la publication.'],
        ['Exporter les données', 'La page SIG.'],
        ['Voir le guide d\'aide', 'Cette page.'],
        ['Accéder au back-office', 'Administration.'],
      ] },
      { t: 'faq', items: [
        ["Une rubrique a disparu du menu.", "Votre rôle a perdu ce droit, ou votre session a expiré. Reconnectez-vous, puis demandez à un administrateur."],
        ["Je veux accéder à une page qui n'est pas dans mon menu.", "Demandez à un administrateur de cocher le droit correspondant pour votre rôle."],
      ] },
    ],
  },
  {
    id: 'glossaire', titre: 'Glossaire', tone: 'orange',
    resume: 'Les mots du recensement.',
    blocs: [
      { t: 'table', head: ['Terme', 'Définition'], rows: [
        ['Exploitant', "Producteur qui cultive une ou plusieurs parcelles d'anacarde."],
        ['Ménage', "Foyer : un chef de ménage et les personnes qui vivent avec lui."],
        ['Parcelle', "Terrain cultivé, dessiné par un contour (polygone) relevé au GPS."],
        ['Enquêteur', "Personne qui a visité le ménage et relevé les informations."],
        ['Dénombrement', "Première visite : recensement des ménages d'une zone."],
        ['Circonscription', "Zone administrative : district, région, département, sous-préfecture, localité, quartier."],
        ['Zone de dénombrement', "Découpage utilisé par les équipes de terrain."],
        ['Faire-valoir', "Façon dont le terrain est exploité : propriétaire, fermage, métayage…"],
        ['Parcelle correcte / incorrecte', "Correcte : contour validé. Incorrecte : contour rejeté lors du contrôle."],
        ['Zone interdite', "Zone où la culture n'est pas autorisée (forêt classée, par exemple)."],
        ['Lot d\'import', "Fichier importé, en attente de contrôle puis de publication."],
        ['Géométrie / contour', "Forme de la parcelle sur la carte."],
        ['Shapefile, KML, GeoJSON', "Formats de fichiers de cartographie."],
        ['WGS 84', "Système de coordonnées (latitude, longitude) utilisé partout dans l'application."],
      ] },
    ],
  },
]

function BlocView({ b }: { b: Bloc }) {
  if (b.t === 'p') return <p className="text-[14px] leading-relaxed text-ink/85">{b.text}</p>
  if (b.t === 'tip' || b.t === 'warn') {
    const tip = b.t === 'tip'
    const Icon = tip ? Lightbulb : TriangleAlert
    return (
      <div className={`flex gap-3 rounded-xl p-4 text-[13.5px] leading-relaxed ${tip ? 'bg-emerald-50 text-emerald-900' : 'bg-orange-50 text-orange-900'}`}>
        <Icon size={18} className="mt-0.5 shrink-0" />
        <div><strong>{tip ? 'Astuce : ' : 'Attention : '}</strong>{b.text}</div>
      </div>
    )
  }
  if (b.t === 'steps') {
    return (
      <div>
        {b.title && <h4 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink/70">{b.title}</h4>}
        <ol className="space-y-2">
          {b.items.map((s, i) => (
            <li key={i} className="flex gap-3 text-[14px] leading-relaxed">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>
    )
  }
  if (b.t === 'table') {
    return (
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[420px] text-left text-[13.5px]">
          <thead className="bg-slate-50 text-[12px] uppercase tracking-wide text-muted">
            <tr>{b.head.map((h) => <th key={h} className="px-4 py-2.5">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {b.rows.map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j} className={`px-4 py-2.5 ${j === 0 ? 'font-semibold' : 'text-ink/80'}`}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <h4 className="text-[13px] font-bold uppercase tracking-wide text-ink/70">Questions fréquentes</h4>
      {b.items.map(([q, a]) => (
        <details key={q} className="group rounded-xl border border-line px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-semibold">
            {q}<ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink/80">{a}</p>
        </details>
      ))}
    </div>
  )
}

const texte = (c: Chapitre) =>
  [c.titre, c.resume, ...c.blocs.flatMap((b) =>
    b.t === 'p' || b.t === 'tip' || b.t === 'warn' ? [b.text]
      : b.t === 'steps' ? [b.title ?? '', ...b.items]
        : b.t === 'faq' ? b.items.flat() : [...b.head, ...b.rows.flat()])]
    .join(' ').toLowerCase()

export default function AidePage() {
  const droits = useAuth((s) => s.user?.droits ?? [])
  const [q, setQ] = useState('')
  const [actif, setActif] = useState('demarrer')

  // Un chapitre n'est montré que si la personne a accès à la fonction décrite
  const visibles = useMemo(() => CHAPITRES.filter((c) => !c.droit || droits.includes(c.droit)), [droits])
  const filtres = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? visibles.filter((c) => s.split(/\s+/).every((m) => texte(c).includes(m))) : visibles
  }, [visibles, q])

  const courant = filtres.find((c) => c.id === actif) ?? filtres[0]
  const idx = courant ? filtres.indexOf(courant) : -1

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-semibold"><BookOpen className="text-brand-600" /> Guide d'utilisation</h1>
          <p className="mt-1 text-sm text-muted">Tout pour prendre en main la plateforme, étape par étape. Ce guide s'adapte à votre rôle.</p>
        </div>
        <label className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-line bg-white px-4">
          <Search size={16} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher dans le guide (ex. exporter, filtre…)"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted" />
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <nav aria-label="Sommaire" className="h-fit rounded-2xl border border-line bg-white p-3 lg:sticky lg:top-4">
          <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Sommaire</div>
          {filtres.map((c, i) => {
            const on = courant?.id === c.id
            return (
              <button key={c.id} onClick={() => { setActif(c.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] ${on ? `bg-slate-100 font-semibold ring-1 ${TONE[c.tone].ring}` : 'hover:bg-slate-50'}`}>
                <span className={`grid size-6 shrink-0 place-items-center rounded-md text-[11px] font-bold ${TONE[c.tone].chip}`}>{i + 1}</span>
                {c.titre}
              </button>
            )
          })}
          {filtres.length === 0 && <p className="px-3 py-4 text-sm text-muted">Aucun chapitre ne correspond.</p>}
        </nav>

        {courant ? (
          <article className="rounded-2xl border border-line bg-white shadow-sm">
            <div className={`h-1.5 rounded-t-2xl ${TONE[courant.tone].bar}`} />
            <header className="border-b border-line px-8 py-6">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">Chapitre {idx + 1} sur {filtres.length}</div>
              <h2 className="mt-1 text-2xl font-bold">{courant.titre}</h2>
              <p className="mt-1 text-sm text-muted whitespace-pre-line">{courant.resume}</p>
            </header>
            <div className="space-y-6 px-8 py-6">
              {courant.blocs.map((b, i) => <BlocView key={i} b={b} />)}
            </div>
            <footer className="flex justify-between border-t border-line px-8 py-4 text-sm">
              <button disabled={idx <= 0} onClick={() => setActif(filtres[idx - 1].id)}
                className="rounded-xl border border-line px-4 py-2 font-semibold hover:bg-slate-50 disabled:opacity-40">← Précédent</button>
              <button disabled={idx >= filtres.length - 1} onClick={() => setActif(filtres[idx + 1].id)}
                className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-40">Suivant →</button>
            </footer>
          </article>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center text-muted">
            Aucun résultat pour « {q} ». Essayez un autre mot.
          </div>
        )}
      </div>
    </div>
  )
}