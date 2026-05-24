/**
 * hooks/use-reservations.ts
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createReservation,
  confirmReservation,
  releaseReservation,
} from "@/lib/api-client";
import type { CreateReservationInput } from "@/types";

export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReservationInput) => createReservation(input),
    onSuccess: () => {
      // Invalidate products so stock counts update
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useConfirmReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => confirmReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useReleaseReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => releaseReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
