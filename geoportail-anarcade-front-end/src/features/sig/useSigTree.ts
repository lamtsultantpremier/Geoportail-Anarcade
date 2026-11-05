import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../lib/api'
import type { SigTreeData } from './tree'

export function useSigTree() {
  return useQuery({
    queryKey: ['sig-tree'],
    queryFn: ({ signal }) => apiGet<SigTreeData>('/sig/arbre/', {}, signal),
    staleTime: 1000 * 60 * 30,
    retry: false,
  })
}