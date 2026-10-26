INSERT INTO public.region(lib_reg,geom_reg,id_dist)
SELECT r.name_2,ST_Multi(r.geom)::geometry(MultiPolygon,4326),d.id_dist
FROM stagging.region_import as r
JOIN public.district as d
ON ST_CoveredBy(ST_PointOnSurface(r.geom),d.geo_dist)

