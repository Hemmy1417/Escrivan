"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, ExternalLink, Flag, HelpCircle } from "lucide-react";
import { useReport } from "@/lib/hooks/useEscrivan";
import { formatGen } from "@/lib/utils";
import { AddressDisplay } from "@/components/AddressDisplay";

// Colour a dimension level: best → green, middle → amber, worst → red.
const LEVEL_TONE: Record<string, string> = {
  STRONG: "var(--success)", ADEQUATE: "#b45309", WEAK: "var(--danger)",
  MODERATE: "#b45309", THIN: "var(--danger)", MISSING: "var(--danger)",
  ALIGNED: "var(--success)", PARTIAL: "#b45309", OFF_TRACK: "var(--danger)", UNDOCUMENTED: "var(--danger)",
  CREDIBLE: "var(--success)", UNCERTAIN: "#b45309", UNSUPPORTED: "var(--danger)",
};

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: report, isLoading } = useReport(params.id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--gold-bright)" }} />
      </div>
    );
  }
  if (!report) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h1 className="display text-2xl mb-2">Report not found</h1>
        <Link href="/ledger" className="btn btn-ghost mt-4">Back to ledger</Link>
      </div>
    );
  }

  const approved = report.overall === "APPROVED";

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 space-y-8">
      <div>
        <div className="eyebrow mb-1">Ruling · Report #{report.report_id}</div>
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <h1 className="display text-4xl">{approved ? "Approved" : "Rejected"}</h1>
          {approved ? (
            <CheckCircle2 className="w-8 h-8" style={{ color: "var(--success)" }} />
          ) : (
            <XCircle className="w-8 h-8" style={{ color: "var(--danger)" }} />
          )}
        </div>
        <div className="text-sm text-ivory-soft/60 flex items-center gap-2 flex-wrap">
          <Link href={`/grants/${report.grant_id}`} className="hover:underline" style={{ color: "var(--gold-bright)" }}>
            Grant #{report.grant_id}
          </Link>
          <span>·</span>
          <span>Obligation {String(report.obligation_index + 1).padStart(2, "0")}</span>
          <span>·</span>
          <span>Filed by <AddressDisplay address={report.grantee} showCopy /></span>
        </div>
      </div>

      {approved && (
        <div
          className="card-strong p-4 flex items-center gap-3"
          style={{ borderColor: "rgba(22, 163, 74, 0.4)" }}
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--success)" }} />
          <span className="text-sm">
            <span className="mono" style={{ color: "var(--success)" }}>
              {formatGen(report.tranche_released_wei)} GEN
            </span>{" "}
            released to the grantee on the same transaction as this ruling.
          </span>
        </div>
      )}

      {/* Four dimensions */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Dimension label="Progress"  value={report.ai_progress} />
        <Dimension label="Evidence"  value={report.ai_evidence} />
        <Dimension label="Spending"  value={report.ai_spending} />
        <Dimension label="Impact"    value={report.ai_impact} />
      </section>

      {/* Panel reasoning */}
      <section className="card p-6 space-y-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="eyebrow">Panel reasoning</div>
          <span className="mono text-xs text-ivory-soft/50">
            Confidence {report.ai_confidence}/100
          </span>
        </div>
        <p
          className="text-[0.95rem] leading-relaxed text-ivory-soft/90"
          style={{ fontStyle: "italic" }}
        >
          {report.ai_summary || "No reasoning recorded."}
        </p>

        {report.ai_red_flags.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "var(--danger)" }}>
              <Flag className="w-3.5 h-3.5" /> Red flags
            </div>
            <ul className="space-y-1 text-sm text-ivory-soft/75 list-disc list-inside">
              {report.ai_red_flags.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}

        {report.ai_missing.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "var(--gold-bright)" }}>
              <HelpCircle className="w-3.5 h-3.5" /> Missing information
            </div>
            <ul className="space-y-1 text-sm text-ivory-soft/75 list-disc list-inside">
              {report.ai_missing.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        )}
      </section>

      {/* What was reviewed */}
      <section className="card p-6 space-y-4">
        <div className="eyebrow">Material under review</div>
        <div>
          <div className="text-xs text-ivory-soft/50 mb-1">Obligation</div>
          <p className="text-sm text-ivory leading-relaxed">{report.obligation_text}</p>
        </div>
        <div className="hairline" />
        <div>
          <div className="text-xs text-ivory-soft/50 mb-1">Grantee narrative</div>
          <p className="text-sm text-ivory-soft/85 leading-relaxed whitespace-pre-wrap">
            {report.narrative}
          </p>
        </div>
        <div className="hairline" />
        <div>
          <div className="text-xs text-ivory-soft/50 mb-2">Cited evidence</div>
          <ul className="space-y-1.5">
            {report.evidence_urls.map((u, i) => (
              <li key={i}>
                <a
                  href={u}
                  target="_blank"
                  rel="noreferrer"
                  className="mono text-xs hover:underline inline-flex items-center gap-1.5 break-all"
                  style={{ color: "var(--gold-bright)" }}
                >
                  {u}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Dimension({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="eyebrow mb-1.5">{label}</div>
      <div className="mono text-sm font-medium" style={{ color: LEVEL_TONE[value] ?? "var(--ivory)" }}>
        {value.replaceAll("_", " ")}
      </div>
    </div>
  );
}
