export type GrantStatus = "ACTIVE" | "COMPLETED" | "CLAWBACK_PENDING" | "CLAWED_BACK" | "CLOSED_BY_FUNDER";

export type Grant = {
  grant_id: string;
  funder: string;
  grantee: string;
  title: string;
  total_wei: string;
  tranche_wei: string;
  escrow_remaining_wei: string;
  obligations: string[];
  obligations_total: number;
  obligations_met: number;
  rejection_streak: number;
  status: GrantStatus;
  clawback_armed_at?: number;
  report_ids: string[];
};

export type ReportVerdict = "APPROVED" | "REJECTED";

export type Report = {
  report_id: string;
  grant_id: string;
  grantee: string;
  obligation_index: number;
  obligation_text: string;
  narrative: string;
  evidence_urls: string[];
  ai_progress: string;     // STRONG | ADEQUATE | WEAK
  ai_evidence: string;     // STRONG | MODERATE | THIN | MISSING
  ai_spending: string;     // ALIGNED | PARTIAL | OFF_TRACK | UNDOCUMENTED
  ai_impact: string;       // CREDIBLE | UNCERTAIN | UNSUPPORTED
  ai_confidence: number;
  ai_red_flags: string[];
  ai_missing: string[];
  ai_summary: string;
  overall: ReportVerdict;
  original_overall?: ReportVerdict;
  appealed?: boolean;
  appeal_note?: string;
  appeal_outcome?: "" | "FLIPPED" | "UPHELD";
  appeal_bond_wei?: string;
  appeal_ruling?: {
    progress_quality: string;
    evidence_strength: string;
    spending_alignment: string;
    impact_credibility: string;
    confidence: number;
    summary: string;
    overall: ReportVerdict;
  } | null;
  tranche_released_wei: string;
};

export type ProtocolStats = {
  min_grant_wei: string;
  max_grant_wei: string;
  min_obligations: number;
  max_obligations: number;
  clawback_streak: number;
  total_awarded_wei: string;
  total_disbursed_wei: string;
  total_clawed_back_wei: string;
  active_grant_count: number;
  total_grants: number;
  total_reports: number;
};

export type TransactionReceipt = Record<string, unknown>;
