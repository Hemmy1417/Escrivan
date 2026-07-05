"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Escrivan from "../contracts/escrivan";
import { CONTRACT_ADDRESS, CONTRACT_CONFIGURED } from "../config";
import { useWallet } from "../genlayer/wallet";
import { success, error } from "../toast";
import type { Grant, Report, ProtocolStats } from "../contracts/types";

export function useEscrivanContract(): Escrivan | null {
  const { address } = useWallet();
  return useMemo(() => {
    if (!CONTRACT_CONFIGURED) return null;
    return new Escrivan(CONTRACT_ADDRESS, address || null);
  }, [address]);
}

// ── READ HOOKS ──────────────────────────────────────────────────────────────

export function useProtocolStats() {
  const contract = useEscrivanContract();
  return useQuery<ProtocolStats | null, Error>({
    queryKey: ["protocolStats"],
    queryFn: () => (contract ? contract.getProtocolStats() : Promise.resolve(null)),
    refetchOnWindowFocus: true,
    staleTime: 3000,
    enabled: !!contract,
  });
}

export function useGrant(grantId: string | null) {
  const contract = useEscrivanContract();
  return useQuery<Grant | null, Error>({
    queryKey: ["grant", grantId],
    queryFn: () => (contract && grantId ? contract.getGrant(grantId) : Promise.resolve(null)),
    refetchOnWindowFocus: true,
    staleTime: 3000,
    enabled: !!contract && !!grantId,
  });
}

export function useReport(reportId: string | null) {
  const contract = useEscrivanContract();
  return useQuery<Report | null, Error>({
    queryKey: ["report", reportId],
    queryFn: () => (contract && reportId ? contract.getReport(reportId) : Promise.resolve(null)),
    refetchOnWindowFocus: true,
    staleTime: 3000,
    enabled: !!contract && !!reportId,
  });
}

export function useReportsByGrant(grantId: string | null) {
  const contract = useEscrivanContract();
  return useQuery<Report[], Error>({
    queryKey: ["reportsByGrant", grantId],
    queryFn: () =>
      contract && grantId ? contract.getReportsByGrant(grantId) : Promise.resolve([]),
    refetchOnWindowFocus: true,
    staleTime: 3000,
    enabled: !!contract && !!grantId,
  });
}

/** Grants where the connected wallet is the funder. */
export function useGrantsAwarded() {
  const contract = useEscrivanContract();
  const { address } = useWallet();
  return useQuery<Grant[], Error>({
    queryKey: ["grantsAwarded", address],
    queryFn: () =>
      contract && address ? contract.getGrantsByFunder(address) : Promise.resolve([]),
    refetchOnWindowFocus: true,
    staleTime: 3000,
    enabled: !!contract && !!address,
  });
}

/** Grants where the connected wallet is the grantee. */
export function useGrantsReceived() {
  const contract = useEscrivanContract();
  const { address } = useWallet();
  return useQuery<Grant[], Error>({
    queryKey: ["grantsReceived", address],
    queryFn: () =>
      contract && address ? contract.getGrantsByGrantee(address) : Promise.resolve([]),
    refetchOnWindowFocus: true,
    staleTime: 3000,
    enabled: !!contract && !!address,
  });
}

export function useLedger(limit = 50) {
  const contract = useEscrivanContract();
  return useQuery<Report[], Error>({
    queryKey: ["ledger", limit],
    queryFn: () => (contract ? contract.getLedger(limit) : Promise.resolve([])),
    refetchOnWindowFocus: true,
    staleTime: 3000,
    enabled: !!contract,
  });
}

// ── WRITE HOOKS ─────────────────────────────────────────────────────────────

export function useAwardGrant() {
  const contract = useEscrivanContract();
  const qc = useQueryClient();
  const [isAwarding, setIsAwarding] = useState(false);

  const mutation = useMutation({
    mutationFn: async (args: {
      grantee: string;
      title: string;
      obligations: string[];
      totalWei: bigint;
    }) => {
      if (!contract) throw new Error("Contract not configured");
      setIsAwarding(true);
      return contract.awardGrant(args.grantee, args.title, args.obligations, args.totalWei);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grantsAwarded"] });
      qc.invalidateQueries({ queryKey: ["protocolStats"] });
      setIsAwarding(false);
      success("Grant entered in the register", {
        description: "Escrow locked. The grantee can now report against the first obligation.",
      });
    },
    onError: (err: any) => {
      setIsAwarding(false);
      error("Failed to award grant", { description: err?.message || "Please try again." });
    },
  });

  return { ...mutation, isAwarding, awardGrant: mutation.mutate };
}

export function useSubmitReport() {
  const contract = useEscrivanContract();
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (args: {
      grantId: string;
      narrative: string;
      evidenceUrls: string[];
    }) => {
      if (!contract) throw new Error("Contract not configured");
      setIsSubmitting(true);
      return contract.submitReport(args.grantId, args.narrative, args.evidenceUrls);
    },
    onSuccess: () => {
      qc.invalidateQueries();   // ruling touches grant, reports, ledger, stats
      setIsSubmitting(false);
      success("Ruling entered", {
        description: "The panel has ruled. Check the report for the verdict and any tranche release.",
      });
    },
    onError: (err: any) => {
      setIsSubmitting(false);
      error("Report failed", { description: err?.message || "Please try again." });
    },
  });

  return { ...mutation, isSubmitting, submitReport: mutation.mutate };
}

export function useCloseGrant() {
  const contract = useEscrivanContract();
  const qc = useQueryClient();
  const [isClosing, setIsClosing] = useState(false);

  const mutation = useMutation({
    mutationFn: async (grantId: string) => {
      if (!contract) throw new Error("Contract not configured");
      setIsClosing(true);
      return contract.closeGrant(grantId);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setIsClosing(false);
      success("Grant closed", {
        description: "Remaining escrow returned to your wallet.",
      });
    },
    onError: (err: any) => {
      setIsClosing(false);
      error("Failed to close grant", { description: err?.message || "Please try again." });
    },
  });

  return { ...mutation, isClosing, closeGrant: mutation.mutate };
}
