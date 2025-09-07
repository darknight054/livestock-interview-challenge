import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { animalsApi } from '@/lib/api-client'
import type { Animal } from '@livestock/types'

export const ANIMALS_QUERY_KEY = 'animals'

/**
 * Hook to fetch all animals
 */
export function useAnimals() {
  return useQuery({
    queryKey: [ANIMALS_QUERY_KEY],
    queryFn: animalsApi.getAll,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to fetch a specific animal
 */
export function useAnimal(id: string) {
  return useQuery({
    queryKey: [ANIMALS_QUERY_KEY, id],
    queryFn: () => animalsApi.getById(id),
    enabled: !!id,
  })
}

/**
 * Hook to create a new animal
 */
export function useCreateAnimal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (animal: Omit<Animal, 'id' | 'lastUpdated'>) =>
      animalsApi.create(animal),
    onSuccess: () => {
      // Invalidate animals list to refetch
      queryClient.invalidateQueries({ queryKey: [ANIMALS_QUERY_KEY] })
    },
  })
}

/**
 * Hook to update an animal
 */
export function useUpdateAnimal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Animal> }) =>
      animalsApi.update(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate both the animals list and the specific animal
      queryClient.invalidateQueries({ queryKey: [ANIMALS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [ANIMALS_QUERY_KEY, id] })
    },
  })
}

/**
 * Hook to delete an animal
 */
export function useDeleteAnimal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => animalsApi.delete(id),
    onSuccess: () => {
      // Invalidate animals list to refetch
      queryClient.invalidateQueries({ queryKey: [ANIMALS_QUERY_KEY] })
    },
  })
}