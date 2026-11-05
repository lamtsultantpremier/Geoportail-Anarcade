export type Level = 'district' | 'region' | 'departement' | 'sous_prefecture' | 'localite' | 'quartier'
export const LEVELS: Level[] = ['district', 'region', 'departement', 'sous_prefecture', 'localite', 'quartier']
export const LEVEL_LABEL: Record<Level, string> = {
  district: 'District', region: 'Région', departement: 'Département',
  sous_prefecture: 'Sous-préfecture', localite: 'Localité', quartier: 'Quartier',
}
const SINGULAR: Record<Level, string> = {
  district: 'district', region: 'région', departement: 'département',
  sous_prefecture: 'sous-préfecture', localite: 'localité', quartier: 'quartier',
}

export interface SigTreeData {
  district: [number, string][]
  region: [number, number, string][]
  departement: [number, number, string][]
  sous_prefecture: [number, number, string][]
  localite: [number, number, string][]
  quartier: [number, number, string][]
}

export interface TNode {
  key: string; level: Level; id: number; name: string; depth: number; children: TNode[]
}
export type State = 0 | 1 | 2   // décoché | indéterminé | coché

const mk = (level: Level, id: number, name: string, depth: number): TNode =>
  ({ key: `${level}:${id}`, level, id, name, depth, children: [] })

export function buildTree(d: SigTreeData): TNode[] {
  const roots: TNode[] = []
  let prev = new Map<number, TNode>()
  for (const [id, name] of d.district) {
    const n = mk('district', id, name, 0)
    roots.push(n); prev.set(id, n)
  }
  const levels: [Level, [number, number, string][]][] = [
    ['region', d.region], ['departement', d.departement],
    ['sous_prefecture', d.sous_prefecture], ['localite', d.localite], ['quartier', d.quartier],
  ]
  levels.forEach(([level, rows], i) => {
    const cur = new Map<number, TNode>()
    for (const [id, parent, name] of rows) {
      const p = prev.get(parent)
      if (!p) continue
      const n = mk(level, id, name, i + 1)
      p.children.push(n); cur.set(id, n)
    }
    prev = cur
  })
  return roots
}

// « 3 départements », « 1 département »
export function childBadge(n: TNode) {
  const c = n.children.length
  if (c === 0) return null
  const s = SINGULAR[n.children[0].level]
  const plural = s.endsWith('x') ? s : `${s}s`
  return `${c} ${c > 1 ? plural : s}`
}

export function collectLeaves(n: TNode, out: string[] = []): string[] {
  if (n.children.length === 0) out.push(n.key)
  else n.children.forEach((c) => collectLeaves(c, out))
  return out
}

export function computeStates(roots: TNode[], checked: Set<string>): Map<string, State> {
  const st = new Map<string, State>()
  const walk = (n: TNode): State => {
    let s: State
    if (n.children.length === 0) s = checked.has(n.key) ? 2 : 0
    else {
      let all = true, none = true
      for (const c of n.children) {
        const cs = walk(c)
        if (cs !== 2) all = false
        if (cs !== 0) none = false
      }
      s = all ? 2 : none ? 0 : 1
    }
    st.set(n.key, s)
    return s
  }
  roots.forEach(walk)
  return st
}

// Nœuds les plus hauts entièrement cochés : c'est ce qui est envoyé au serveur
export function pickNodes(roots: TNode[], st: Map<string, State>): TNode[] {
  const out: TNode[] = []
  const go = (n: TNode) => {
    const s = st.get(n.key)
    if (s === 2) out.push(n)
    else if (s === 1) n.children.forEach(go)
  }
  roots.forEach(go)
  return out
}

export function toFields(nodes: TNode[]): Record<string, string> {
  const by: Partial<Record<Level, number[]>> = {}
  nodes.forEach((n) => (by[n.level] ??= []).push(n.id))
  return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, (v as number[]).join(',')]))
}