--Script d'insertion des autres tables
--Taable Milieu_Residence

insert into public.milieu_residence(lib_milieu)
SELECT DISTINCT p."Q.117 Milieu de residence"
FROM stagging.pacelles as p
WHERE p."Q.117 Milieu de residence" IS NOT NULL
ON CONFLICT(lib_milieu) DO NOTHING;
