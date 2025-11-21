/**
 * React Query Hooks for NodeCG Dashboard
 * Provides hooks for data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

// Query keys
export const queryKeys = {
  stats: ['stats'],
  bundles: ['bundles'],
  replicants: ['replicants'],
  replicant: (namespace: string, name: string) => ['replicants', namespace, name],
  users: ['users'],
  currentUser: ['currentUser'],
};

// Dashboard Stats Hooks
export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: api.getStats,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

// Bundles Hooks
export function useBundles() {
  return useQuery({
    queryKey: queryKeys.bundles,
    queryFn: api.getBundles,
  });
}

export function useReloadBundles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.reloadBundles,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bundles });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

// Replicants Hooks
export function useReplicants() {
  return useQuery({
    queryKey: queryKeys.replicants,
    queryFn: api.getReplicants,
  });
}

export function useReplicant(namespace: string, name: string) {
  return useQuery({
    queryKey: queryKeys.replicant(namespace, name),
    queryFn: () => api.getReplicant(namespace, name),
  });
}

export function useUpdateReplicant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ namespace, name, value }: { namespace: string; name: string; value: unknown }) =>
      api.updateReplicant(namespace, name, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.replicants });
    },
  });
}

export function useDeleteReplicant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      api.deleteReplicant(namespace, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.replicants });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

// Users Hooks
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: api.getUsers,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<api.User> }) => api.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

// Authentication Hooks
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: api.getCurrentUser,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      api.login(username, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
