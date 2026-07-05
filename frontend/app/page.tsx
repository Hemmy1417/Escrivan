"use client";

import Link from "next/link";
import { ScrollText, Landmark, Scale, BookOpenCheck, Coins, Undo2 } from "lucide-react";
import { useProtocolStats } from "@/lib/hooks/useEscrivan";
import { formatGen } from "@/lib/utils";

// Clay-style: each step lives on a saturated single-color feature card.
const steps = [
  {
    n: "01",
    icon: Landmark,
    title: "Award",
    body: "The funder locks the full grant in escrow, split into equal tranches across two to six obligations. Not a promise — locked capital.",
    fc: "fc-teal",
  },
  {
    n: "02",
    icon: ScrollText,
    title: "Report",
    body: "At each obligation the grantee files a progress narrative with public evidence URLs. Validators fetch every URL independently.",
    fc: "fc-lavender",
  },
  {
    n: "03",
    icon: Scale,
    title: "Ruling",
    body: "An AI panel rules the report on four qualitative dimensions — progress, evidence, spending, impact — under written acceptance criteria.",
    fc: "fc-peach",
  },
  {
    n: "04",
    icon: Coins,
    title: "Release",
    body: "An approved ruling releases the tranche on the same transaction. Three consecutive rejections return the escrow to the funder.",
    fc: "fc-pink",
  },
];

const dimensions = [
  { name: "Progress quality",   levels: "STRONG · ADEQUATE · WEAK",                     hint: "Did the work described actually advance the obligation?" },
  { name: "Evidence strength",  levels: "STRONG · MODERATE · THIN · MISSING",           hint: "Does the fetched evidence substantiate the narrative?" },
  { name: "Spending alignment", levels: "ALIGNED · PARTIAL · OFF_TRACK · UNDOCUMENTED", hint: "Is the money going where the grant said it would?" },
  { name: "Impact credibility", levels: "CREDIBLE · UNCERTAIN · UNSUPPORTED",           hint: "Are the impact claims believable on this evidence?" },
];

export default function HomePage() {
  const { data: stats } = useProtocolStats();

  return (
    <div className="mx-auto max-w-6xl px-5">
      {/* ── Hero ── */}
      <section className="pt-24 pb-16 text-center max-w-3xl mx-auto">
        <span className="chip chip-active mb-6 inline-flex">GenLayer · Studionet</span>
        <h1 className="display text-6xl md:text-7xl leading-[0.98] mb-6" style={{ letterSpacing: "-0.035em" }}>
          Grants that answer
          <br />
          <span style={{ color: "var(--gold-bright)" }}>for themselves.</span>
        </h1>
        <p className="text-lg leading-relaxed max-w-2xl mx-auto mb-9" style={{ color: "var(--ivory-soft)" }}>
          The funder locks the money. The grantee delivers evidence. A panel of
          GenLayer AI validators rules the progress at every obligation — and
          tranches release only against approved reviews. Every ruling a public record.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/grants/new" className="btn btn-gold">
            <Landmark className="w-4 h-4" />
            Award a grant
          </Link>
          <Link href="/ledger" className="btn btn-ghost">
            <BookOpenCheck className="w-4 h-4" />
            Open the ledger
          </Link>
        </div>
      </section>

      {/* ── Live stats strip ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-24">
        <Stat label="Grants entered"  value={String(stats?.total_grants ?? 0)}   hint={`${stats?.active_grant_count ?? 0} active`} />
        <Stat label="Escrow awarded"  value={`${formatGen(stats?.total_awarded_wei ?? "0")} GEN`}   hint="Locked lifetime" />
        <Stat label="Disbursed"       value={`${formatGen(stats?.total_disbursed_wei ?? "0")} GEN`} hint="Released on approvals" />
        <Stat label="Clawed back"     value={`${formatGen(stats?.total_clawed_back_wei ?? "0")} GEN`} hint="Returned to funders" />
      </section>

      {/* ── Four steps as saturated feature cards ── */}
      <section className="mb-24">
        <div className="text-center mb-10">
          <div className="eyebrow mb-2">Procedure</div>
          <h2 className="display text-4xl">From award to accountability</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className={`fc ${s.fc} space-y-4`}>
                <div className="flex items-center justify-between">
                  <span className="display text-4xl" style={{ opacity: 0.35 }}>{s.n}</span>
                  <span
                    className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255, 255, 255, 0.25)" }}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                </div>
                <h3 className="display text-2xl">{s.title}</h3>
                <p className="text-[15px] leading-relaxed" style={{ opacity: 0.88 }}>{s.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Four dimensions ── */}
      <section className="fc fc-cream mb-24">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-7">
          <div>
            <div className="eyebrow mb-1">The ruling</div>
            <h2 className="display text-3xl">Four dimensions, one verdict</h2>
          </div>
          <span className="chip chip-approved">Consensus-backed</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dimensions.map((d) => (
            <div key={d.name} className="rounded-2xl p-5" style={{ background: "#fffaf0", border: "1px solid var(--hairline)" }}>
              <div className="flex items-baseline justify-between gap-3 mb-1.5 flex-wrap">
                <span className="font-semibold" style={{ color: "var(--ivory)" }}>{d.name}</span>
                <span className="mono text-[10px]" style={{ color: "var(--muted)" }}>{d.levels}</span>
              </div>
              <p className="text-sm" style={{ color: "var(--ivory-soft)" }}>{d.hint}</p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-6 leading-relaxed" style={{ color: "var(--muted)" }}>
          APPROVED requires progress at least ADEQUATE, evidence at least MODERATE, and no
          dimension at its worst level. Validators accept the panel's ruling only when it
          satisfies written criteria — grounded claims, defensible verdict, no invented facts.
        </p>
      </section>

      {/* ── Clawback note ── */}
      <section className="fc fc-ochre mb-6 flex items-start gap-5">
        <span
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(10, 10, 10, 0.12)" }}
        >
          <Undo2 className="w-5 h-5" />
        </span>
        <div>
          <h3 className="display text-2xl mb-1.5">Accountability has teeth</h3>
          <p className="text-[15px] leading-relaxed" style={{ opacity: 0.85 }}>
            Three consecutive rejected reports automatically close the grant and return
            every unreleased wei to the funder. The funder can also close early at any
            time — the grantee keeps what was already earned, nothing more.
          </p>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="eyebrow mb-2">{label}</div>
      <div className="display text-2xl leading-none mb-1">{value}</div>
      {hint && <div className="text-xs" style={{ color: "var(--muted)" }}>{hint}</div>}
    </div>
  );
}
