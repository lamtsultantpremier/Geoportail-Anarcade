interface ImportMetaEnv {
  readonly VITE_CARTO_KEY: string
}

declare module 'shpjs' {
  const shp: (input: ArrayBuffer | string) => Promise<any>
  export default shp
}