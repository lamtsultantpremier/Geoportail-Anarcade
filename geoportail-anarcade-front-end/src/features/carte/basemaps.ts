const CARTO_KEY = import.meta.env.VITE_CARTO_KEY as string | undefined
const carto = (style: string) =>
  [`https://basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png${CARTO_KEY ? `?key=${CARTO_KEY}` : ''}`]

export interface Basemap {
  id: string
  label: string
  description: string
  tiles: string[]
  attribution: string
  maxzoom: number
  tileSize: number
  preview: string   // couleur de l'aperçu dans le panneau
}

export const BASEMAPS: Basemap[] = [
//   {
//     id: 'voyager',
//     label: 'Voyager',
//     description: 'Rues colorées (CARTO)',
//     tiles: carto('voyager'),
//     attribution: '© OpenStreetMap © <a href="https://carto.com/attributions">CARTO</a>',
//     maxzoom: 20, tileSize: 256, preview: 'linear-gradient(135deg,#f2efe9,#cfe3d4)',
//   },
  {
    id: 'streets',
    label: 'Rues',
    description: 'OpenStreetMap',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxzoom: 19, tileSize: 256, preview: 'linear-gradient(135deg,#e8e0d0,#c9d8b6)',
  },
//   {
//     id: 'light',
//     label: 'Clair',
//     description: 'Fond épuré (CARTO)',
//     tiles: [
//       'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
//       'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
//     ],
//     attribution: '© OpenStreetMap © <a href="https://carto.com/attributions">CARTO</a>',
//     maxzoom: 20, tileSize: 256, preview: 'linear-gradient(135deg,#f4f4f2,#dcdcd8)',
//   },
//   {
//     id: 'dark',
//     label: 'Sombre',
//     description: 'CARTO Dark Matter',
//     tiles:carto('dark_all'),
//     attribution: '© OpenStreetMap © <a href="https://carto.com/attributions">CARTO</a>',
//     maxzoom: 20, tileSize: 256, preview: 'linear-gradient(135deg,#2b2f36,#14161a)',
//   },
  {
    id: 'satellite',
    label: 'Satellite',
    description: 'Imagerie Esri World Imagery',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: 'Tiles © Esri — Maxar, Earthstar Geographics, USDA, USGS, AeroGRID, IGN',
    maxzoom: 19, tileSize: 256, preview: 'linear-gradient(135deg,#3d5a2f,#1f3a24)',
  },
  {
    id: 'topo',
    label: 'Relief',
    description: 'OpenTopoMap (courbes de niveau)',
    tiles: [
      'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
    ],
    attribution: '© OpenStreetMap, SRTM | © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxzoom: 17, tileSize: 256, preview: 'linear-gradient(135deg,#d9e6b8,#b9a77c)',
  },
]

export const DEFAULT_BASEMAP = 'streets'