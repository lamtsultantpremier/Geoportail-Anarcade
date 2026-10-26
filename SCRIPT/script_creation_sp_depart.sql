SELECT
    sp.nomsp AS sprefecture,
    d.id_dept,
    d.lib_dept AS departement
FROM stagging.spref_import AS sp
LEFT JOIN public.departement AS d
    ON ST_CoveredBy(
        ST_PointOnSurface(sp.geom),
        d.geom_dept);


insert into sous_prefecture(lib_s_pref,geo_s_pref,id_dept)
SELECT sp.nomsp,ST_Multi(sp.geom)::geometry(MultiPolygon,4326),d.id_dept
FROM stagging.spref_import as sp
JOIN public.departement as d
ON ST_CoveredBy(
        ST_PointOnSurface(sp.geom),
        d.geom_dept);
