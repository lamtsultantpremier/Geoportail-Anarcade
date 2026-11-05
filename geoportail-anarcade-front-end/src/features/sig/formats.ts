export type Fmt = 'shp' | 'kml' | 'geojson' | 'xlsx' | 'csv'

export const FORMATS: Record<Fmt, { label: string; hint: string; btn: string }> = {
  shp: { label: 'Shapefile', hint: 'Archive .zip (SHP, DBF, PRJ) pour QGIS ou ArcGIS',
    btn: 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100' },
  kml: { label: 'KML', hint: 'Google Earth',
    btn: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100' },
  geojson: { label: 'GeoJSON', hint: 'Web et SIG, un seul fichier',
    btn: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' },
  xlsx: { label: 'Excel', hint: 'Classeur .xlsx, téléphones conservés avec leur 0',
    btn: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' },
  csv: { label: 'CSV', hint: 'Texte séparé par des points-virgules, lisible partout',
    btn: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100' },
}

export const GEO_FORMATS: Fmt[] = ['shp', 'kml', 'geojson']
export const ATTR_FORMATS: Fmt[] = ['xlsx', 'csv']