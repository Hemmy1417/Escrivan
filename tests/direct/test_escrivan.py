"""
Direct-mode tests for escrivan.py — exercise the deterministic parts of the
contract without GenLayer's AI/consensus stack. Run with:
    python -m pytest tests/direct -q

The genlayer runtime is stubbed with the minimum surface the contract
touches (verified against the deployed-on-Studionet attribute names:
gl.message.sender_address / gl.message.value — NOT sender_account, and no
block_number). The AI pipeline inside submit_report is exercised by
patching gl.eq_principle.prompt_non_comparative to return a canned ruling,
so the escrow math, tranche release, dust handling, clawback streak and
status transitions around the ruling are all proven deterministically.
"""

import importlib.util
import json
import pathlib
import sys
import types
import pytest


CONTRACT_PATH = pathlib.Path(__file__).resolve().parents[2] / "contracts" / "escrivan.py"


# ── GenLayer runtime stubs ───────────────────────────────────────────────────

class _UserError(Exception):
    pass


class _VmModule:
    UserError = _UserError


class _TreeMap(dict):
    def get(self, k, default=None):
        return super().get(k, default)


class _U256(int):
    def __new__(cls, v):
        return super().__new__(cls, int(v))


class _PublicViewDeco:
    def __call__(self, fn):
        return fn


class _PublicWriteDeco:
    payable = staticmethod(lambda fn: fn)

    def __call__(self, fn):
        return fn


class _Public:
    view = _PublicViewDeco()
    write = _PublicWriteDeco()


class _FakeEmit:
    def __init__(self):
        self.transfers = []   # list of (to, value, on)

    def bind(self, to):
        self._to = to
        return self

    def emit_transfer(self, value, on=None):
        self.transfers.append((self._to, int(value), on))


class _EqPrinciple:
    """prompt_non_comparative stub — returns whatever the test primed.
    Also RUNS the input builder (fn) and captures it, so tests can assert
    what material actually reached the panel (evidence, appeal notes)."""
    canned_output = "{}"
    last_input = ""
    last_task = ""

    @classmethod
    def prompt_non_comparative(cls, fn, task=None, criteria=None):
        cls.last_input = fn()
        cls.last_task = str(task or "")
        return cls.canned_output


class _NondetWeb:
    @staticmethod
    def render(url, mode="text"):
        return f"stub content for {url}"


class _Nondet:
    web = _NondetWeb()

    @staticmethod
    def exec_prompt(task):
        return _EqPrinciple.canned_output


class _Evm:
    @staticmethod
    def contract_interface(cls):
        class _Proxy:
            def __init__(self, addr):
                self._addr = str(addr)

            def emit_transfer(self, value, on=None):
                _GL._emit.transfers.append((self._addr, int(value), on))
        return _Proxy


class _GL:
    class Contract:
        pass

    evm = _Evm()

    public = _Public()
    vm = _VmModule
    eq_principle = _EqPrinciple
    nondet = _Nondet()

    class message:
        sender_address = "0x0000000000000000000000000000000000000000"
        value = 0

    _emit = None

    @staticmethod
    def get_contract_at(addr):
        return _GL._emit.bind(str(addr))


def _install_stub():
    mod = types.ModuleType("genlayer")
    mod.gl = _GL
    mod.TreeMap = _TreeMap
    mod.u256 = _U256
    mod.Address = lambda x: x
    mod.__all__ = ["gl", "TreeMap", "u256", "Address"]
    sys.modules["genlayer"] = mod


_install_stub()


def _load_contract():
    spec = importlib.util.spec_from_file_location("escrivan_contract", CONTRACT_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# ── Fixtures + helpers ───────────────────────────────────────────────────────

FUNDER  = "0xfff1111111111111111111111111111111111111"
GRANTEE = "0xaaa2222222222222222222222222222222222222"
OTHER   = "0xbbb3333333333333333333333333333333333333"

GEN = 10 ** 18


@pytest.fixture
def module():
    m = _load_contract()
    m.gl._emit = _FakeEmit()
    return m


@pytest.fixture
def contract(module):
    module.gl.message.sender_address = FUNDER
    module.gl.message.value = 0
    return module.Escrivan()


def _as(module, sender, value=0):
    module.gl.message.sender_address = sender
    module.gl.message.value = value


def _ruling(overall="APPROVED", progress="STRONG", evidence="STRONG",
            spending="ALIGNED", impact="CREDIBLE", confidence=90):
    return json.dumps({
        "progress_quality":    progress,
        "evidence_strength":   evidence,
        "spending_alignment":  spending,
        "impact_credibility":  impact,
        "overall":             overall,
        "confidence":          confidence,
        "red_flags":           [],
        "missing_information": [],
        "summary":             "Stub ruling grounded in the supplied narrative.",
    })


def _award(module, contract, total=6 * GEN, n_obligations=3, grantee=GRANTEE):
    obligations = json.dumps([f"Obligation {i+1}" for i in range(n_obligations)])
    _as(module, FUNDER, value=total)
    return contract.award_grant(grantee, "Community Water Project", obligations)


def _report(module, contract, grant_id, overall="APPROVED", grantee=GRANTEE):
    module.gl.eq_principle.canned_output = _ruling(overall=overall)
    _as(module, grantee)
    return contract.submit_report(
        grant_id,
        "We completed the borehole survey across three districts, engaged the county water office, and published the findings publicly.",
        ["https://example.org/report"],
    )


# ── Award ────────────────────────────────────────────────────────────────────

def test_award_grant_happy_path(module, contract):
    g = _award(module, contract)
    assert g["grant_id"] == "1"
    assert g["funder"] == FUNDER
    assert g["grantee"] == GRANTEE
    assert int(g["total_wei"]) == 6 * GEN
    assert int(g["tranche_wei"]) == 2 * GEN
    assert g["status"] == "ACTIVE"
    stats = contract.get_protocol_stats()
    assert int(stats["total_awarded_wei"]) == 6 * GEN
    assert stats["active_grant_count"] == 1


def test_award_rejects_out_of_bounds(module, contract):
    obligations = json.dumps(["a", "b"])
    _as(module, FUNDER, value=10 ** 15)   # below 0.1 GEN
    with pytest.raises(_UserError):
        contract.award_grant(GRANTEE, "t", obligations)
    _as(module, FUNDER, value=20 * GEN)   # above cap
    with pytest.raises(_UserError):
        contract.award_grant(GRANTEE, "t", obligations)


def test_award_rejects_bad_obligations(module, contract):
    _as(module, FUNDER, value=GEN)
    with pytest.raises(_UserError):
        contract.award_grant(GRANTEE, "t", json.dumps(["only one"]))
    _as(module, FUNDER, value=GEN)
    with pytest.raises(_UserError):
        contract.award_grant(GRANTEE, "t", json.dumps([f"o{i}" for i in range(7)]))
    _as(module, FUNDER, value=GEN)
    with pytest.raises(_UserError):
        contract.award_grant(GRANTEE, "t", "not json")


def test_award_rejects_self_grant(module, contract):
    _as(module, FUNDER, value=GEN)
    with pytest.raises(_UserError):
        contract.award_grant(FUNDER, "t", json.dumps(["a", "b"]))


# ── Report + tranche release ────────────────────────────────────────────────

def test_approved_report_releases_tranche(module, contract):
    g = _award(module, contract)
    r = _report(module, contract, g["grant_id"], overall="APPROVED")

    assert r["overall"] == "APPROVED"
    assert int(r["tranche_released_wei"]) == 2 * GEN
    assert module.gl._emit.transfers == [(GRANTEE, 2 * GEN, "finalized")]

    updated = contract.get_grant(g["grant_id"])
    assert updated["obligations_met"] == 1
    assert int(updated["escrow_remaining_wei"]) == 4 * GEN
    assert updated["rejection_streak"] == 0
    assert updated["status"] == "ACTIVE"


def test_final_tranche_absorbs_dust_and_completes(module, contract):
    # 5 GEN over 3 obligations → tranche 1.666… GEN with dust on the last
    g = _award(module, contract, total=5 * GEN, n_obligations=3)
    for _ in range(3):
        _report(module, contract, g["grant_id"], overall="APPROVED")

    updated = contract.get_grant(g["grant_id"])
    assert updated["status"] == "COMPLETED"
    assert int(updated["escrow_remaining_wei"]) == 0

    total_out = sum(v for (_, v, _) in module.gl._emit.transfers)
    assert total_out == 5 * GEN          # every wei accounted for
    stats = contract.get_protocol_stats()
    assert int(stats["total_disbursed_wei"]) == 5 * GEN
    assert stats["active_grant_count"] == 0


def test_rejected_report_holds_tranche(module, contract):
    g = _award(module, contract)
    r = _report(module, contract, g["grant_id"], overall="REJECTED")

    assert r["overall"] == "REJECTED"
    assert int(r["tranche_released_wei"]) == 0
    assert module.gl._emit.transfers == []

    updated = contract.get_grant(g["grant_id"])
    assert updated["obligations_met"] == 0
    assert updated["rejection_streak"] == 1
    assert updated["status"] == "ACTIVE"


def test_three_rejections_arm_clawback_but_move_nothing(module, contract):
    g = _award(module, contract)
    for _ in range(3):
        _report(module, contract, g["grant_id"], overall="REJECTED")

    updated = contract.get_grant(g["grant_id"])
    # armed, not executed: the appeal window stands between a rejection and the money
    assert updated["status"] == "CLAWBACK_PENDING"
    assert int(updated["escrow_remaining_wei"]) == 6 * GEN
    assert module.gl._emit.transfers == []


def test_finalize_clawback_blocked_inside_window(module, contract):
    g = _award(module, contract)
    for _ in range(3):
        _report(module, contract, g["grant_id"], overall="REJECTED")
    _as(module, FUNDER)
    with pytest.raises(module.gl.vm.UserError, match="appeal window still open"):
        contract.finalize_clawback(g["grant_id"])


def test_finalize_clawback_after_window_refunds_funder(module, contract):
    g = _award(module, contract)
    for _ in range(3):
        _report(module, contract, g["grant_id"], overall="REJECTED")
    _award(module, contract, total=1 * GEN, n_obligations=2)   # unrelated action ticks the window
    _as(module, FUNDER)
    out = contract.finalize_clawback(g["grant_id"])

    assert out["status"] == "CLAWED_BACK"
    assert int(out["refunded_wei"]) == 6 * GEN
    updated = contract.get_grant(g["grant_id"])
    assert int(updated["escrow_remaining_wei"]) == 0
    assert (FUNDER, 6 * GEN, "finalized") in module.gl._emit.transfers
    stats = contract.get_protocol_stats()
    assert int(stats["total_clawed_back_wei"]) == 6 * GEN


# ── Bonded appeals ───────────────────────────────────────────────────────────

BOND = 2 * 10 ** 16   # 1% of the default 2 GEN tranche


def _appeal(module, contract, report_id, overall="APPROVED", bond=BOND, sender=GRANTEE,
            note="The panel missed the deployment link in evidence #1 — the deliverable is live at /releases."):
    module.gl.eq_principle.canned_output = _ruling(overall=overall)
    _as(module, sender, value=bond)
    return contract.appeal_report(report_id, note)


def test_appeal_flip_releases_tranche_and_returns_bond(module, contract):
    g = _award(module, contract)
    r = _report(module, contract, g["grant_id"], overall="REJECTED")
    out = _appeal(module, contract, r["report_id"], overall="APPROVED")

    assert out["appeal_outcome"] == "FLIPPED"
    assert out["overall"] == "APPROVED"
    assert out["original_overall"] == "REJECTED"
    assert int(out["tranche_released_wei"]) == 2 * GEN
    # tranche + bond both landed with the grantee
    assert (GRANTEE, 2 * GEN, "finalized") in module.gl._emit.transfers
    assert (GRANTEE, BOND, "finalized") in module.gl._emit.transfers
    updated = contract.get_grant(g["grant_id"])
    assert updated["obligations_met"] == 1
    assert updated["rejection_streak"] == 0
    assert updated["status"] == "ACTIVE"


def test_appeal_upheld_forfeits_bond_to_funder(module, contract):
    g = _award(module, contract)
    r = _report(module, contract, g["grant_id"], overall="REJECTED")
    out = _appeal(module, contract, r["report_id"], overall="REJECTED")

    assert out["appeal_outcome"] == "UPHELD"
    assert out["overall"] == "REJECTED"
    assert int(out["tranche_released_wei"]) == 0
    assert module.gl._emit.transfers == [(FUNDER, BOND, "finalized")]
    updated = contract.get_grant(g["grant_id"])
    assert updated["obligations_met"] == 0
    assert updated["rejection_streak"] == 1


def test_appeal_note_and_original_ruling_reach_the_panel(module, contract):
    g = _award(module, contract)
    r = _report(module, contract, g["grant_id"], overall="REJECTED")
    _appeal(module, contract, r["report_id"], overall="APPROVED",
            note="Re-read evidence #1: the county sign-off is on page two.")
    panel_input = module.gl.eq_principle.last_input
    assert "BONDED APPEAL" in panel_input
    assert "county sign-off is on page two" in panel_input
    assert "ORIGINAL RULING" in panel_input
    assert "APPEAL round" in module.gl.eq_principle.last_task


def test_appeal_only_grantee(module, contract):
    g = _award(module, contract)
    r = _report(module, contract, g["grant_id"], overall="REJECTED")
    with pytest.raises(module.gl.vm.UserError, match="Only the grantee"):
        _appeal(module, contract, r["report_id"], sender=FUNDER)


def test_appeal_only_rejected_reports(module, contract):
    g = _award(module, contract)
    r = _report(module, contract, g["grant_id"], overall="APPROVED")
    with pytest.raises(module.gl.vm.UserError, match="Only a REJECTED"):
        _appeal(module, contract, r["report_id"])


def test_appeal_once_only(module, contract):
    g = _award(module, contract)
    r = _report(module, contract, g["grant_id"], overall="REJECTED")
    _appeal(module, contract, r["report_id"], overall="REJECTED")
    with pytest.raises(module.gl.vm.UserError, match="already appealed"):
        _appeal(module, contract, r["report_id"])


def test_appeal_only_latest_report(module, contract):
    g = _award(module, contract)
    r1 = _report(module, contract, g["grant_id"], overall="REJECTED")
    _report(module, contract, g["grant_id"], overall="REJECTED")
    with pytest.raises(module.gl.vm.UserError, match="latest report"):
        _appeal(module, contract, r1["report_id"])


def test_appeal_bond_minimum_enforced(module, contract):
    g = _award(module, contract)
    r = _report(module, contract, g["grant_id"], overall="REJECTED")
    with pytest.raises(module.gl.vm.UserError, match="bond too small"):
        _appeal(module, contract, r["report_id"], bond=BOND - 1)


def test_appeal_flip_disarms_pending_clawback(module, contract):
    g = _award(module, contract)
    for _ in range(3):
        r = _report(module, contract, g["grant_id"], overall="REJECTED")
    assert contract.get_grant(g["grant_id"])["status"] == "CLAWBACK_PENDING"

    out = _appeal(module, contract, r["report_id"], overall="APPROVED")
    assert out["appeal_outcome"] == "FLIPPED"
    updated = contract.get_grant(g["grant_id"])
    assert updated["status"] == "ACTIVE"          # the clawback is disarmed
    assert updated["rejection_streak"] == 2       # the overturned rejection uncounted
    assert updated["obligations_met"] == 1
    # a disarmed clawback can no longer be finalized
    _as(module, FUNDER)
    with pytest.raises(module.gl.vm.UserError, match="not CLAWBACK_PENDING"):
        contract.finalize_clawback(g["grant_id"])


def test_upheld_appeal_unlocks_immediate_finalize(module, contract):
    g = _award(module, contract)
    for _ in range(3):
        r = _report(module, contract, g["grant_id"], overall="REJECTED")
    _appeal(module, contract, r["report_id"], overall="REJECTED")
    # the grantee had their second look and lost — no need to wait out the window
    _as(module, FUNDER)
    out = contract.finalize_clawback(g["grant_id"])
    assert out["status"] == "CLAWED_BACK"
    assert int(out["refunded_wei"]) == 6 * GEN


def test_funder_cannot_bypass_window_via_close_grant(module, contract):
    g = _award(module, contract)
    for _ in range(3):
        _report(module, contract, g["grant_id"], overall="REJECTED")
    _as(module, FUNDER)
    with pytest.raises(module.gl.vm.UserError, match="not ACTIVE"):
        contract.close_grant(g["grant_id"])


def test_approval_resets_rejection_streak(module, contract):
    g = _award(module, contract)
    _report(module, contract, g["grant_id"], overall="REJECTED")
    _report(module, contract, g["grant_id"], overall="REJECTED")
    _report(module, contract, g["grant_id"], overall="APPROVED")
    updated = contract.get_grant(g["grant_id"])
    assert updated["rejection_streak"] == 0
    assert updated["status"] == "ACTIVE"
    # two more rejections shouldn't claw back (streak restarted)
    _report(module, contract, g["grant_id"], overall="REJECTED")
    _report(module, contract, g["grant_id"], overall="REJECTED")
    assert contract.get_grant(g["grant_id"])["status"] == "ACTIVE"


# ── Access control ───────────────────────────────────────────────────────────

def test_only_grantee_can_report(module, contract):
    g = _award(module, contract)
    module.gl.eq_principle.canned_output = _ruling()
    _as(module, OTHER)
    with pytest.raises(_UserError):
        contract.submit_report(g["grant_id"], "x" * 50, ["https://e.org"])


def test_report_requires_narrative_and_evidence(module, contract):
    g = _award(module, contract)
    _as(module, GRANTEE)
    with pytest.raises(_UserError):
        contract.submit_report(g["grant_id"], "too short", ["https://e.org"])
    with pytest.raises(_UserError):
        contract.submit_report(g["grant_id"], "x" * 50, [])


def test_no_report_after_completion(module, contract):
    g = _award(module, contract, n_obligations=2)
    _report(module, contract, g["grant_id"], overall="APPROVED")
    _report(module, contract, g["grant_id"], overall="APPROVED")
    _as(module, GRANTEE)
    with pytest.raises(_UserError):
        contract.submit_report(g["grant_id"], "x" * 50, ["https://e.org"])


# ── Funder closure ───────────────────────────────────────────────────────────

def test_funder_close_refunds_remaining(module, contract):
    g = _award(module, contract)
    _report(module, contract, g["grant_id"], overall="APPROVED")   # 2 GEN out
    _as(module, FUNDER)
    out = contract.close_grant(g["grant_id"])
    assert int(out["refunded_wei"]) == 4 * GEN
    assert out["status"] == "CLOSED_BY_FUNDER"
    # grantee got 2, funder got 4 back
    assert (GRANTEE, 2 * GEN, "finalized") in module.gl._emit.transfers
    assert (FUNDER, 4 * GEN, "finalized") in module.gl._emit.transfers


def test_only_funder_can_close(module, contract):
    g = _award(module, contract)
    _as(module, GRANTEE)
    with pytest.raises(_UserError):
        contract.close_grant(g["grant_id"])
    _as(module, OTHER)
    with pytest.raises(_UserError):
        contract.close_grant(g["grant_id"])


def test_cannot_close_twice(module, contract):
    g = _award(module, contract)
    _as(module, FUNDER)
    contract.close_grant(g["grant_id"])
    with pytest.raises(_UserError):
        contract.close_grant(g["grant_id"])


# ── Indexes + ledger ─────────────────────────────────────────────────────────

def test_indexes_isolate_funder_and_grantee(module, contract):
    _award(module, contract)                       # FUNDER → GRANTEE
    _award(module, contract, grantee=OTHER)        # FUNDER → OTHER
    assert len(contract.get_grants_by_funder(FUNDER)) == 2
    assert len(contract.get_grants_by_grantee(GRANTEE)) == 1
    assert len(contract.get_grants_by_grantee(OTHER)) == 1


def test_ledger_reverse_chronological(module, contract):
    g = _award(module, contract)
    r1 = _report(module, contract, g["grant_id"], overall="REJECTED")
    r2 = _report(module, contract, g["grant_id"], overall="APPROVED")
    ledger = contract.get_ledger(limit=10)
    assert [r["report_id"] for r in ledger] == [r2["report_id"], r1["report_id"]]
