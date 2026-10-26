
--Table Zone de denombrement
insert into zone_denombrement(code_zone)
select distinct p."Q.114 Numero ZD"
FROM stagging.parcelles p;

--Table Localite
alter table localite add column  id_zone_denombrement 
INT REFERENCES zone_denombrement(id_zone) ON DELETE CASCADE;

select * from localite where id_loc=74142;
update localite l
set id_zone_denombrement=z.id_zone
FROM stagging.parcelles p
inner join zone_denombrement z on z.code_zone=p."Q.114 Numero ZD"
where p."Q.115 Localite (Village)"=l.lib_loc;

 --Table quartier
 select * from quartier where lib_quar='SENOUFO';
insert into quartier(lib_quar,id_loc)
select distinct p."Q.116 Quartier",l.id_loc
from stagging.parcelles p
inner join localite l on p."Q.115 Localite (Village)"=l.lib_loc;
select * from quartier;

--Table Menages
alter table menage add constraint uq_code_men UNIQUE(code_men);

alter table menage add column id_quar
INT REFERENCES quartier(id_quar) ON DELETE CASCADE;
alter table menage drop column id_zone CASCADE;
alter table menage
alter column nb_enfant TYPE VARCHAR(50);
alter column nb_femme TYPE VARCHAR(50);

delete from menage;


insert into menage(code_men,nom_chef,pren_chef,cont_chef,nb_enfant,nb_femme,id_quar)
select distinct p."Q.118 Numero du menage",
				d."Q.17 Nom du chef de menage",
				d."Q.18 Prenom du chef de menage",
				d."Q.19 Contact du chef de menage",
				e."Q.53 Nb enfants",
				e."Q.56 Nb femmes dans le menage",
				q.id_quar
FROM  stagging.denombrements d
inner join stagging.exploitants e on d."Q.15 Numero du menage"=e."Q.14 Numero du menage"
inner join stagging.parcelles p on d."Q.15 Numero du menage"=p."Q.118 Numero du menage"
inner join quartier q on p."Q.116 Quartier"=q.lib_quar
on conflict(code_men) DO NOTHING;

select count(*) from menage;
	
--Table exploitants
alter table exploitant add constraint exp_code_expl UNIQUE(code_expl);
alter table exploitant add column nom_declare VARCHAR(150);
alter table exploitant add column pren_declare VARCHAR(150);
alter table exploitant add column cont_declare VARCHAR(150);

delete from exploitant;

select count(*) from exploitant;

insert into exploitant(code_expl,
					nom_expl,pren_expl,date_nais,
					pays_nais,lieu_nais,situa_mat,
					profession,nationalite,contacts,
					id_men,id_niv,nom_declare,
					pren_declare,cont_declare)
select distinct e."Q.15 Numero exploitant",
				e."Q.34 Nom",
				e."Q.35 Prenom(s)",
				CAST(e."Q.36 Date de naissance" AS DATE),
				e."Q.37 Pays de naissance",
				e."Q.38 Lieu de naissance",
				e."Q.40 Situation matrimoniale",
				e."Q.42 Profession",
				e."Q.47 Nationalite",
				e."Q.50 Contact principal",
				m.id_men,
				n.id_niv,
				e."Q.31 Nom de l'exploitant (declare par representant)",
				e."Q.32 Prenom(s) de l'exploitant (declare par representant)",
				e."Q.33 Contact principal de l'exploitant (declare par representan"
				
from stagging.exploitants e
inner join menage m on e."Q.14 Numero du menage"=m.code_men
-- inner join stagging.exploitants e on p."Q.119 Numero exploitant" = e."Q.15 Numero exploitant"
inner join niveau_instruction n on e."Q.41 Niveau d'instruction"=n.lib_niv
ON CONFLICT(code_expl) DO NOTHING;

select * from exploitant order by nom_expl asc;


-- select distinct d."Q.15 Numero du menage",d."Q.17 Nom du chef de menage",
-- d."Q.18 Prenom du chef de menage",d."Q.19 Contact du chef de menage",
-- z.code_zone
-- FROM public.zone_denombrement z
-- -- INNER JOIN public.zone_denombrement z ON p."Q.114 Numero ZD"=z.code_zone
-- INNER JOIN stagging.denombrements d ON d."Q.11 Numero ZD"=z.code_zone;

-- select * from zone_denombrement where code_zone='6011';

-- select distinct p."Q.114 Numero ZD",l.lib_loc,m.lib_mil,q.lib_quar
-- from stagging.parcelles p
-- INNER JOIN localite l ON p."Q.115 Localite (Village)"=l.lib_loc
-- INNER JOIN milieu_residence m ON p."Q.117 Milieu de residence"=m.lib_mil
-- INNER JOIN quartier q ON p."Q.116 Quartier"=q.lib_quar;

--Table Enqueteur
delete from enqueteur;
alter table enqueteur add column code_enqt VARCHAR(255) UNIQUE;
alter table enqueteur add constraint uq_enqt_num UNIQUE(cont_enqt);
alter table enqueteur add constraint unique_code_nom UNIQUE(code_enqt,nom_pren_enqt);
insert into enqueteur(nom_pren_enqt,cont_enqt,code_enqt)
select distinct e."Q.2 Nom et Prenom(s) de l'enqueteur",
				e."Q.4 Contact de l'enqueteur",
				e."Q.3 Code de l'enqueteur"
from stagging.denombrements d
inner join stagging.exploitants e 
on d."Q.5 Contact de l'enqueteur"=e."Q.4 Contact de l'enqueteur"
-- where d."Q.5 Contact de l'enqueteur" IS NOT NULL and e."Q.4 Contact de l'enqueteur" is not null
on conflict(code_enqt,nom_pren_enqt) do nothing;
select * from  enqueteur order by nom_pren_enqt asc;

-- Table ENQUETES
insert into enquete(date_enq,id_enqt,id_expl)
select distinct CAST(ex."Q.1 Date de l'enquete" AS DATE),enqt.id_enqt,e.id_expl
from stagging.exploitants ex
inner join public.enqueteur enqt on ex."Q.3 Code de l'enqueteur"=enqt.code_enqt
inner join public.exploitant e on ex."Code exploitant"=e.code_expl; 
order by ex."Q.1 Date de l'enquete" asc;

alter table enquete add column num_questionnaire VARCHAR(500) UNIQUE;

-- Table Parcelles
CREATE TABLE parcelle_correcte (
    id_parc SERIAL PRIMARY KEY,
    code_parc VARCHAR(50) NOT NULL,
    annee_mise_place INT,
    geom_parc GEOMETRY(Polygon, 4326) NOT NULL, -- Polygone de la parcelle
    superficie_tracee NUMERIC(10, 2),
    id_expl INT NOT NULL REFERENCES exploitant(id_expl) ON DELETE CASCADE,
    id_mode INT REFERENCES mode_faire_valoir(id_mode) ON DELETE SET NULL,
    id_enqt INT REFERENCES enquete(id_enqt) ON DELETE SET NULL
);
-- alter table parcelle_incorrecte
-- add constraint parcelle_correcte_id_enqt_fkey
-- FOREIGN KEY(id_enqt) REFERENCES enqueteur(id_enqt);

CREATE TABLE parcelle_incorrecte (
    id_parc SERIAL PRIMARY KEY,
    code_parc VARCHAR(50) NOT NULL,
    annee_mise_place INT,
    geom_parc GEOMETRY(Polygon, 4326) NOT NULL, -- Polygone de la parcelle
    superficie_tracee NUMERIC(10, 2),
    id_expl INT NOT NULL REFERENCES exploitant(id_expl) ON DELETE CASCADE,
    id_mode INT REFERENCES mode_faire_valoir(id_mode) ON DELETE SET NULL,
    id_enqt INT REFERENCES enqueteur(id_enqt) ON DELETE SET NULL
);
-- alter table parcelle_incorrecte 
-- alter column geom_parc TYPE TEXT;

-- alter table parcelle_correcte add constraint uq_code_parc_correcte UNIQUE(code_parc);
-- alter table parcelle_incorrecte add constraint uq_code_parc_incorrecte UNIQUE(code_parc);

insert into parcelle_correcte(code_parc,annee_mise_place,
					geom_parc,superficie_tracee,
					id_expl,id_mode,id_enqt
					)
select distinct p."Q.120 Numero exploitation (parcelle)",
	   CAST(p."Q.121 Annee de mise en place" AS integer),
	   
	   -- safe_plot_with_error(p."Q.120 Numero exploitation (parcelle)",
	   -- CAST( p."Q.121 Annee de mise en place" as integer),
	   -- p."Tracee GPS (WKT)",4326,
	   -- p."Superficie calculee depuis tracee (ha)",
	   
	   -- e.id_expl,m.id_mode,
	   -- enqt.id_enqt),
	   ST_GeomFromText(p."Tracee GPS (WKT)",4326),
	   p."Superficie calculee depuis tracee (ha)",
	   e.id_expl,
	   m.id_mode,
	   enqt.id_enqt
	   
from stagging.parcelles p
inner join public.exploitant e on p."Code exploitant"=e.code_expl
inner join public.mode_faire_valoir m on p."Q.125 Mode de faire-valoir"=m."lib_mode"
inner join stagging.exploitants ex on ex."Code exploitant"=e.code_expl
inner join public.enqueteur enqt on ex."Q.3 Code de l'enqueteur"=enqt.code_enqt;


CREATE OR REPLACE FUNCTION safe_plot_with_error(
					num_exp TEXT,
					annee_mise_place INT, 
					wkt TEXT, 
					srid INT,
					superficie TEXT,
					id_exploitant INT,
					id_mode INT,
					id_enqueteur INT
					) 
RETURNS GEOMETRY AS $$
DECLARE
	g GEOMETRY;
BEGIN
	g:=ST_GeomFromText(wkt, srid);
	IF NOT ST_IsValid(g) THEN
        g := ST_MakeValid(g);
    END IF;
	IF GeometryType(g)<> 'POLYGON' THEN
	    INSERT INTO public.parcelle_incorrecte(
				code_parc,
				annee_mise_place, 
				geom_parc,
				superficie_tracee,
				id_expl,
				id_mode,
				id_enq)			
    	VALUES (num_exp,
			annee_mise_place,
			wkt,
			superficie,
			id_exploitant,
			id_mode,
			id_enqueteur);
    
    -- Et on retourne NULL pour que l'insertion principale continue
    	RETURN NULL;
	END IF;
	
	RETURN g;
    -- RETURN ST_GeomFromText(wkt, srid);
EXCEPTION WHEN others THEN
    -- En cas d'erreur de parsing, on enregistre le problème dans la table de log
    INSERT INTO public.parcelle_incorrecte(
				code_parc,
				annee_mise_place, 
				geom_parc,
				superficie_tracee,
				id_expl,
				id_mode,
				id_enq)			
    VALUES (num_exp,
			annee_mise_place,
			wkt,
			superficie,
			id_exploitant,
			id_mode,
			id_enqueteur);
    
    -- Et on retourne NULL pour que l'insertion principale continue
    RETURN NULL;
 END;
$$ LANGUAGE plpgsql;


delete from stagging.parcelles_rejetees;
delete from parcelle_correcte;
delete from parcelle_incorrecte;

select * from parcelle_correcte;
select * from parcelle_incorrecte;

select * from stagging.parcelles_rejetees;
update stagging.parcelles_rejetees 
set wkt_fautif=ST_MakeValid(wkt_fautif);

alter table parcelle_correcte
alter column geom_parc TYPE GEOMETRY(MultiPolygon, 4326);
alter column geom_parc TYPE TEXT;

alter column superficie_tracee TYPE TEXT;
select * from exploitant where id_expl=232979;
-- Index spatial indispensable pour accélérer les requêtes géographiques sur les parcelles
CREATE INDEX idx_parcelle_geom ON parcelle USING GIST (geom_parc);
select count(*) from stagging.parcelles;
select distinct count(p."Q.120 Numero exploitation (parcelle)") from stagging.parcelles p;

SELECT "Q.120 Numero exploitation (parcelle)" AS code_parc,
       length("Tracee GPS (WKT)")              AS nb_car,
       right("Tracee GPS (WKT)", 30)           AS fin
FROM stagging.parcelles
WHERE "Tracee GPS (WKT)" !~ '\)\)\s*$'
ORDER BY nb_car DESC;

WITH base AS (
    SELECT p."Q.120 Numero exploitation (parcelle)" AS code_parc,
           replace(p."Superficie calculee depuis tracee (ha)", ',', '.')::numeric AS ha_fichier,
           ST_GeomFromText(
               'LINESTRING(' ||
               regexp_replace(
                   regexp_replace(trim(p."Tracee GPS (WKT)"), '^POLYGON\s*\(\(', '', 'i'),
                   ',[^,]*$', '') || ')', 4326) AS ls
    FROM stagging.parcelles p
    WHERE p."Tracee GPS (WKT)" !~ '\)\)\s*$'
),
poly AS (
    SELECT code_parc, ha_fichier, ls,
           ST_MakePolygon(ST_AddPoint(ST_RemoveRepeatedPoints(ls), ST_StartPoint(ls))) AS g
    FROM base
    WHERE ST_NPoints(ST_RemoveRepeatedPoints(ls)) >= 3
)
SELECT code_parc,
       ha_fichier,
       round((ST_Area(ST_MakeValid(g)::geography)/10000)::numeric, 2)          AS ha_reconstruit,
       round(ST_Distance(ST_StartPoint(ls)::geography,
                         ST_EndPoint(ls)::geography)::numeric, 1)              AS m_fermeture
FROM poly
ORDER BY m_fermeture DESC;


CREATE OR REPLACE FUNCTION try_polygon(wkt TEXT, srid INT DEFAULT 4326)
RETURNS geometry AS $$
DECLARE
    g geometry;
BEGIN
    -- WKT vide, tronqué par Excel (32 767 car.) ou sans fermeture "))"
    IF wkt IS NULL OR length(wkt) >= 32767 OR wkt !~ '\)\)\s*$' THEN
        RETURN NULL;
    END IF;

    g := ST_Force2D(ST_GeomFromText(wkt, srid));

    IF GeometryType(g) <> 'POLYGON' THEN
        RETURN NULL;
    END IF;

    -- Auto-intersection légère : on répare et on garde le plus grand polygone
    IF NOT ST_IsValid(g) THEN
        g := (SELECT d.geom
              FROM ST_Dump(ST_CollectionExtract(ST_MakeValid(g), 3)) d
              ORDER BY ST_Area(d.geom) DESC
              LIMIT 1);
    END IF;

    RETURN g;
EXCEPTION WHEN others THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

TRUNCATE parcelle_correcte, parcelle_incorrecte RESTART IDENTITY;

CREATE TEMP TABLE parcelles_calc AS
SELECT DISTINCT
       p."Q.120 Numero exploitation (parcelle)"                    AS code_parc,
       NULLIF(p."Q.121 Annee de mise en place", '')::int           AS annee,
       p."Tracee GPS (WKT)"                                        AS wkt,
       try_polygon(p."Tracee GPS (WKT)", 4326)                     AS geom,
       p."Superficie calculee depuis tracee (ha)"                  AS superficie,
       e.id_expl, m.id_mode, enqt.id_enqt
FROM stagging.parcelles p
INNER JOIN public.exploitant e         ON p."Code exploitant" = e.code_expl
INNER JOIN public.mode_faire_valoir m  ON p."Q.125 Mode de faire-valoir" = m.lib_mode
INNER JOIN stagging.exploitants ex     ON ex."Code exploitant" = e.code_expl
INNER JOIN public.enqueteur enqt       ON ex."Q.3 Code de l'enqueteur" = enqt.code_enqt;

-- Parcelles correctes
INSERT INTO parcelle_correcte (code_parc, annee_mise_place, geom_parc,
                               superficie_tracee, id_expl, id_mode, id_enqt)
SELECT code_parc, annee, geom, superficie, id_expl, id_mode, id_enqt
FROM parcelles_calc
WHERE geom IS NOT NULL;

-- Tout le reste (tronquées, illisibles, pas un polygone)
INSERT INTO parcelle_incorrecte (code_parc, annee_mise_place, geom_parc,
                                 superficie_tracee, id_expl, id_mode, id_enqt)
SELECT code_parc, annee, wkt, superficie, id_expl, id_mode, id_enqt
FROM parcelles_calc
WHERE geom IS NULL;

CREATE INDEX idx_parcelle_correcte ON parcelle_correcte USING GIST (geom_parc);

insert into georeferencement(date_geor,id_parc)
select CAST(p."Date de cloture du georeferencement" AS DATE),pc.id_parc 
from stagging.parcelles p
inner join parcelle_correcte pc on p."Q.120 Numero exploitation (parcelle)"=pc.code_parc;