"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ScrollText, Plus, X, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { useGrant, useSubmitReport } from "@/lib/hooks/useEscrivan";
import { useWallet } from "@/lib/genlayer/wallet";
import { formatGen } from "@/lib/utils";
import { error as toastError } from "@/lib/toast";
import { HowTo } from "@/components/HowTo";
import { classify, preflight, type EvidenceVerdict } from "@/lib/evidence";

const MAX_URLS = 4;
const MIN_NARRATIVE = 40;

export default function NewReportPage() {
  const params = useParams<{ grantId: string }>();
  const grantId = params.grantId;
  const router = useRouter();

  const { isConnected, address } = useWallet();
  const { data: grant, isLoading } = useGrant(grantId);
  const { submitReport, isSubmitting } = useSubmitReport();

  const [narrative, setNarrative] = useState("");
  const [urls, setUrls] = useState<string[]>([""]);

  const check = useMemo(() => preflight(urls[0] ?? "", urls.slice(1)), [urls]);
  const allVerdicts: EvidenceVerdict[] = useMemo(() => urls.map(classify), [urls]);
  const hasBlocked = allVerdicts.some((v, i) => urls[i].trim() && v.status === "block");

  const addUrl = () => urls.length < MAX_URLS && setUrls((s) => [...s, ""]);
  const setUrl = (i: number, v: string) => setUrls((s) => s.map((row, idx) => (idx === i ? v : row)));
  const removeUrl = (i: number) => setUrls((s) => (s.length === 1 ? s : s.filter((_, idx) => idx !== i)));

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--gold-bright)" }} />
      </div>
    );
  }
  if (!grant) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h1 className="display text-2xl mb-2">Grant not found</h1>
        <Link href="/grants" className="btn btn-ghost mt-4">Back to grants</Link>
      </div>
    );
  }

  const notGrantee = !!address && grant.grantee.toLowerCase() !== address.toLowerCase();
  const notActive = grant.status !== "ACTIVE";
  const allMet = grant.obligations_met >= grant.obligations_total;
  const blocked = notGrantee || notActive || allMet;
  const obligationIndex = grant.obligations_met;
  const obligationText = grant.obligations[obligationIndex] ?? "";

  const submit = () => {
    if (!isConnected) return toastError("Connect your wallet");
    if (narrative.trim().length < MIN_NARRATIVE)
      return toastError(`Narrative too short — describe the progress (min ${MIN_NARRATIVE} chars)`);
    const clean = urls.map((u) => u.trim()).filter(Boolean);
    if (clean.length === 0) return toastError("At least one evidence URL is required");
    for (const u of clean) {
      if (!/^https?:\/\//i.test(u)) return toastError("URLs must start with http(s)://");
    }
    if (hasBlocked) return toastError("One or more URLs are on the panel's inadmissible list.");
    submitReport(
      { grantId, narrative: narrative.trim(), evidenceUrls: clean },
      { onSuccess: () => router.push(`/grants/${grantId}`) },
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 space-y-8">
      <div className="text-center max-w-xl mx-auto">
        <div className="eyebrow mb-2">Notice of progress</div>
        <h1 className="display text-4xl mb-3">File a report</h1>
        <p className="text-ivory-soft/70">
          The panel fetches every URL, rules four dimensions, and — if approved —
          releases <span className="mono" style={{ color: "var(--gold-bright)" }}>{formatGen(grant.tranche_wei)} GEN</span> to
          your wallet on the same transaction.
        </p>
      </div>

      <HowTo
        id="file-report"
        reference="ES-03"
        title="Schedule of admissible evidence"
        clauseLabel="Item"
        intro="Validators fetch each cited URL independently and read the actual content — not your description of it. Sources must render as public HTML without client-side scripting."
        items={[
          { label: "Admissible", body: "Public GitHub repos and Gists, published reports and datasets, ethereum.org-style documentation pages, organisation blogs served as plain HTML, news articles that render without JavaScript." },
          { label: "Inadmissible", body: "Twitter/X live pages, Mirror.xyz article bodies, LinkedIn, anything behind auth or a paywall — validators receive an empty shell or 403 and the item counts as missing evidence." },
          { label: "The narrative is not evidence", body: "The panel weighs fetched content over your prose. A polished narrative with thin evidence is ruled THIN, not STRONG — cite the work itself." },
          { label: "Ruling timing", body: "Independent fetch, four-dimension ruling, consensus, and — where approved — tranche release occur on one transaction. Allow one to three minutes." },
        ]}
      />

      {/* Obligation under review */}
      <div className="card p-5">
        <div className="eyebrow mb-1.5">
          Obligation {String(obligationIndex + 1).padStart(2, "0")} of {grant.obligations_total} — under review
        </div>
        <p className="text-sm text-ivory leading-relaxed">{obligationText}</p>
      </div>

      {blocked && (
        <div
          className="card-strong p-4 flex items-start gap-3"
          style={{ borderColor: "rgba(239, 68, 68, 0.4)" }}
        >
          <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: "var(--danger)" }} />
          <div className="text-sm">
            {notGrantee
              ? "This grant belongs to another wallet — only the grantee may report."
              : allMet
              ? "All obligations are already met."
              : `Grant status is ${grant.status}; only ACTIVE grants accept reports.`}
          </div>
        </div>
      )}

      <div className="card p-6 space-y-5">
        <div>
          <label className="block eyebrow mb-1.5">Progress narrative</label>
          <textarea
            className="input text-sm min-h-[140px] resize-y"
            placeholder="Describe what was done against this obligation — specifics the panel can verify against your evidence…"
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            disabled={blocked || isSubmitting}
          />
          <p className="text-xs text-ivory-soft/50 mt-1.5">
            {narrative.trim().length} / {MIN_NARRATIVE} minimum characters
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <div className="eyebrow mb-1.5">Evidence URLs (1–{MAX_URLS})</div>
            <p className="text-xs text-ivory-soft/50">
              Public pages the validators can fetch — repo, published report, dataset, coverage.
            </p>
          </div>
          {urls.map((u, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  className="input mono text-sm"
                  placeholder="https://…"
                  value={u}
                  onChange={(e) => setUrl(i, e.target.value)}
                  disabled={blocked || isSubmitting}
                />
                {urls.length > 1 && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => removeUrl(i)}
                    disabled={blocked || isSubmitting}
                    aria-label="Remove URL"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <EvidencePill verdict={allVerdicts[i]} url={u} />
            </div>
          ))}
          {urls.length < MAX_URLS && (
            <button
              className="btn btn-ghost w-full"
              onClick={addUrl}
              disabled={blocked || isSubmitting}
              style={{ borderStyle: "dashed" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add evidence URL
            </button>
          )}
        </div>

        {hasBlocked && (
          <div
            className="p-3 rounded-sm flex items-start gap-2 text-sm"
            style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.35)" }}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--danger)" }} />
            <span>
              At least one URL is on the panel's inadmissible list. Replace or remove it before
              filing — submitting as-is wastes the transaction on evidence the validators cannot read.
            </span>
          </div>
        )}

        {isSubmitting && (
          <div className="card-strong p-4 flex items-start gap-3">
            <Loader2 className="w-5 h-5 mt-0.5 animate-spin" style={{ color: "var(--gold-bright)" }} />
            <div className="text-sm">
              <div className="font-medium">The panel is reading your evidence</div>
              <div className="text-xs text-ivory-soft/60 mt-1">
                Independent fetch → four-dimension ruling → consensus → tranche if approved.
                One to three minutes.
              </div>
            </div>
          </div>
        )}

        <button
          className="btn btn-gold w-full"
          onClick={submit}
          disabled={blocked || isSubmitting || hasBlocked}
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Under review…</>
          ) : (
            <><ScrollText className="w-4 h-4" /> File report</>
          )}
        </button>
      </div>
    </div>
  );
}

function EvidencePill({ verdict, url }: { verdict: EvidenceVerdict; url: string }) {
  if (!url.trim()) return null;
  const palette = verdict.status === "ok"
    ? { bg: "rgba(22, 163, 74, 0.08)", border: "rgba(22, 163, 74, 0.35)", fg: "#15803d", Icon: CheckCircle2 }
    : verdict.status === "warn"
    ? { bg: "rgba(180, 122, 10, 0.08)", border: "rgba(180, 122, 10, 0.35)", fg: "#b45309", Icon: AlertTriangle }
    : { bg: "rgba(239, 68, 68, 0.07)",  border: "rgba(239, 68, 68, 0.35)",  fg: "#b91c1c", Icon: AlertCircle };
  const { Icon } = palette;
  return (
    <div
      className="flex items-start gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-sm text-xs"
      style={{ background: palette.bg, border: `1px solid ${palette.border}`, color: palette.fg }}
    >
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span className="leading-snug">{verdict.note ?? ""}</span>
    </div>
  );
}
