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
insert into parcelle(code_parc,annee_mise_place,
					geom_parc,superficie_tracee,
					id_expl,id_mode,id_enq
					)

select distinct p."Q.120 Numero exploitation (parcelle)",p."Q.121 Annee de mise en place",
	   ST_GeomFromText(p."Tracee GPS (WKT)",4326),p."Superficie calculee depuis tracee (ha)",
	   e.id_expl,m.id_mode,enqt.id_enqt
from stagging.parcelles p
inner join public.exploitant e on p."Code exploitant"=e.code_expl
inner join public.mode_faire_valoir m on p."Q.125 Mode de faire-valoir"=m."lib_mode"
inner join stagging.exploitants ex on ex."Code exploitant"=e.code_expl
inner join public.enqueteur enqt on ex."Q.3 Code de l'enqueteur"=enqt.code_enqt;

SELECT p."Q.120 Numero exploitation (parcelle)", p."Tracee GPS (WKT)"
FROM stagging.parcelles p
WHERE p."Tracee GPS (WKT)" IS NOT NULL
  AND length(p."Tracee GPS (WKT)") > 0;
