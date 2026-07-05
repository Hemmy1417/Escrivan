# ESCRIVAN

**The on-chain accountability layer for grants.**

The funder locks the money. The grantee delivers evidence. A panel of GenLayer AI validators rules the progress at every obligation — and tranches release only against approved reviews. Every ruling is a public record.

**The pitch in one line:** grants that answer for themselves.

---

## Why GenLayer

Post-award grant accountability is qualitative all the way down: did the narrative describe real progress, does the evidence substantiate it, is the spending aligned, are the impact claims credible? None of that has a deterministic oracle. GenLayer's primitives compose it into a single atomic, on-chain, replay-verifiable ruling:

- `gl.nondet.web.render(url, mode="text")` — validators fetch every evidence URL independently and read the **actual content**, not the grantee's description of it
- `gl.nondet.exec_prompt(...)` — an LLM rules the report on four qualitative dimensions
- `gl.eq_principle.prompt_non_comparative(...)` — validators judge the leader's ruling against **written acceptance criteria** instead of re-running the LLM and comparing outputs. Borderline qualitative cases can land on different verdicts across rollouts; comparative matching would false-reject. Non-comparative validation still rejects rulings that violate the schema, invent facts, or ignore the stated rule.
- `emit_transfer(..., on="finalized")` — approved rulings release the tranche on the same transaction that decided them

---

## The ruling

Every report is ruled on four dimensions, then an overall verdict:

| Dimension          | Levels                                        |
|--------------------|-----------------------------------------------|
| Progress quality   | `STRONG` · `ADEQUATE` · `WEAK`                |
| Evidence strength  | `STRONG` · `MODERATE` · `THIN` · `MISSING`    |
| Spending alignment | `ALIGNED` · `PARTIAL` · `OFF_TRACK` · `UNDOCUMENTED` |
| Impact credibility | `CREDIBLE` · `UNCERTAIN` · `UNSUPPORTED`      |

**APPROVED** requires progress ≥ `ADEQUATE`, evidence ≥ `MODERATE`, and no dimension at its worst level. Anything else is **REJECTED**.

The prompt carries anti-injection guardrails: instructions embedded in the narrative or fetched evidence are treated strictly as material under review, and every claim in the reasoning must be grounded in the supplied content.

---

## The escrow

- The funder locks the **full award** (0.1–10 GEN in the MVP) at `award_grant`, split into equal tranches across **2–6 obligations**. The final tranche absorbs integer-division dust — every wei is accounted for.
- An **APPROVED** ruling releases the tranche to the grantee immediately and resets the rejection streak.
- A **REJECTED** ruling holds the tranche. **Three consecutive rejections** auto-close the grant and return the remaining escrow to the funder.
- The funder may **close early** at any time — the grantee keeps earned tranches, the remainder refunds. Earned tranches are never clawed back.
- There is **no protocol owner and no pooled capital**: each grant is its own escrow.

---

## Evidence sources — what actually works

Validators cannot render JavaScript and get 403'd by several popular hosts. The claim form pre-flights every URL against this matrix before you pay a transaction fee.

**✅ Fetch-friendly:** public GitHub repos and Gists (`gist.githubusercontent.com/.../raw/...`), ethereum.org-style documentation, Wikipedia, organisation blogs served as plain HTML, published datasets.

**❌ Inadmissible:** Twitter/X live pages, Mirror.xyz article bodies, LinkedIn, Etherscan queries, anything behind auth — validators receive an empty shell or 403 and the item counts as missing evidence.

---

## Project structure

```
Escrivan/
├── contracts/escrivan.py           # the Intelligent Contract
├── deploy/deployScript.ts          # scripted deploy (alt to CLI)
├── gltest.config.yaml
├── tests/direct/                   # 17-test direct-mode pytest suite
└── frontend/                       # Next.js 16 (Turbopack)
    ├── app/
    │   ├── page.tsx                # landing — hero, stats, four dimensions
    │   ├── grants/new/             # award a grant (funder)
    │   ├── grants/                 # grants of record (funder + grantee views)
    │   ├── grants/[id]/            # obligation thread + report CTA + closure
    │   ├── reports/new/[grantId]/  # file a report (grantee)
    │   ├── reports/[id]/           # full adjudication file
    │   ├── ledger/                 # public register of rulings
    │   └── records/                # protocol accounts + parameters
    ├── components/                 # Nav, HowTo (ES-01..05), LiveBackdrop, NetworkBanner
    └── lib/                        # wallet, evidence preflight, typed wrapper, hooks
```

---

## Contract

- **Address:** `0x37b49452B2b03F68fBE3A9Fc36DBA7dAdCA888d7`
- **Network:** GenLayer Studionet (chainId `61999`, RPC `https://studio.genlayer.com/api`)
- **Constructor:** no arguments — no protocol owner

Read state:
```bash
genlayer call 0x37b49452B2b03F68fBE3A9Fc36DBA7dAdCA888d7 get_protocol_stats
```

---

## Local development

### Contract tests
```bash
python -m pytest tests/direct -q     # 17 tests, no Studio required
```

### Deploy to Studionet
```bash
genlayer network set studionet
genlayer account unlock              # cache keystore in the OS credential store
genlayer deploy --contract contracts/escrivan.py
```

### Frontend
```bash
cd frontend
cp .env.Example .env.local           # fill in the contract address
npm install
npm run dev
```

---

## Environment variables

**`frontend/.env.local`** (also set on Vercel):

- `NEXT_PUBLIC_CONTRACT_ADDRESS` — the deployed contract
- `NEXT_PUBLIC_GENLAYER_RPC_URL` — `https://studio.genlayer.com/api`
- `NEXT_PUBLIC_GENLAYER_CHAIN_ID` — `61999`
- `NEXT_PUBLIC_GENLAYER_CHAIN_NAME` — `GenLayer Studio`
- `NEXT_PUBLIC_GENLAYER_SYMBOL` — `GEN`

---

## Runbook

1. **Funder awards.** `/grants/new` — grantee wallet, title, 2–6 obligations, total GEN. Signing locks the escrow.
2. **Grantee reports.** From the grant's obligation thread, file a narrative + 1–4 public evidence URLs against the next unmet obligation.
3. **The panel rules.** Validators fetch the evidence, an LLM rules four dimensions + verdict, consensus accepts the ruling against written criteria.
4. **Money moves.** Approved → tranche to the grantee, same transaction. Rejected → tranche held; three straight rejections → remaining escrow back to the funder.
5. **Everything is public.** `/ledger` lists every ruling with the panel's reasoning; `/records` carries the protocol accounts.
