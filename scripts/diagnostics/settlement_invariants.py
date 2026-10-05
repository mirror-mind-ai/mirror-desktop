#!/usr/bin/env python3
"""Evaluate candidate settlement invariants against the real production store.

Read-only. Each invariant is stated as a claim about two or more durable artifacts; the point is to
find which ones production already violates, not to assume the model is obeyed.
"""
import json, os, glob, sys

D = os.path.expanduser("~/Library/Application Support/ai.mirrormind.desktop")

def load(path):
    try:
        with open(path) as handle:
            return json.load(handle)
    except Exception:
        return None

def unwrap(value, *keys):
    if not isinstance(value, dict):
        return None
    for key in keys:
        if key in value and isinstance(value[key], dict):
            return value[key]
    return value

def session_entry_count(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as handle:
            return sum(1 for _ in handle)
    except Exception:
        return None

results = []  # (journey, generation, invariant, status, detail)

def check(journey, generation, name, ok, detail=""):
    results.append((journey, generation, name, "PASS" if ok else "FAIL", detail))

threads = sorted(glob.glob(f"{D}/journey-threads/*.json"))
for thread_path in threads:
    journey = os.path.basename(thread_path)[:-5]
    thread_doc = load(thread_path)
    if not thread_doc:
        continue
    thread = unwrap(thread_doc, "thread")
    active = thread.get("activeGeneration")
    generations = {g.get("generation"): g for g in thread.get("generations", []) if isinstance(g, dict)}
    gen_entry = generations.get(active)
    if not gen_entry:
        check(journey, active, "I1 thread declares its active generation", False, "no generation entry")
        continue

    thread_id = thread.get("threadId")
    ledger_path = f"{D}/dedicated-journey-conversations/{journey}/generation-{active}.json"
    ledger_doc = load(ledger_path)
    if not ledger_doc:
        check(journey, active, "I2 active generation has a durable ledger", False, "ledger absent")
        continue
    conv = unwrap(ledger_doc, "conversation")
    live = conv.get("liveIdentity", {})
    rec = conv.get("reconciliation", {})
    turns = rec.get("turns", [])
    messages = conv.get("messages", [])
    checkpoints = rec.get("checkpoints", {})

    base = f"{D}/conversation-segments/{journey}/{thread_id}"
    manifest = load(f"{base}/generation-{active}.json")
    seg_dir = f"{base}/generation-{active}.segments"
    receipt = load(f"{seg_dir}/complete.json")

    # --- identity invariants -------------------------------------------------
    check(journey, active, "I2 ledger session id equals thread activation receipt",
          live.get("piSessionId") == gen_entry.get("piSessionId"),
          f"{live.get('piSessionId')} vs {gen_entry.get('piSessionId')}")

    check(journey, active, "I3 ledger Mirror conversation equals thread generation",
          rec.get("authority", {}).get("mirrorConversationId") == gen_entry.get("mirrorConversationId"),
          f"{rec.get('authority',{}).get('mirrorConversationId')} vs {gen_entry.get('mirrorConversationId')}")

    if manifest:
        check(journey, active, "I4 manifest identity equals ledger identity",
              manifest.get("journeyId") == journey
              and manifest.get("threadId") == thread_id
              and manifest.get("generation") == active
              and manifest.get("piSessionId") == live.get("piSessionId"),
              "")

    # --- ledger self-consistency --------------------------------------------
    harness_cp = (checkpoints or {}).get("harness") or {}
    check(journey, active, "I11 ledger harness checkpoint equals its own message array",
          harness_cp.get("messageCount") == len(messages),
          f"checkpoint {harness_cp.get('messageCount')} vs array {len(messages)}")

    if turns:
        check(journey, active, "I13 ledger harness checkpoint names its own last turn",
              harness_cp.get("lastTurnId") == turns[-1].get("turnId"),
              f"{harness_cp.get('lastTurnId')} vs {turns[-1].get('turnId')}")

    # --- session invariants --------------------------------------------------
    session_file = gen_entry.get("piSessionFile")
    actual_entries = session_entry_count(session_file) if session_file else None
    if actual_entries is not None:
        pi_cp = (checkpoints or {}).get("pi") or {}
        if pi_cp.get("entryCount") is not None:
            check(journey, active, "I8 ledger pi checkpoint does not exceed the session",
                  pi_cp["entryCount"] <= actual_entries,
                  f"checkpoint {pi_cp['entryCount']} vs session {actual_entries}")
        if manifest and manifest.get("sourceEntryCount") is not None:
            check(journey, active, "I7 manifest source count does not exceed the session",
                  manifest["sourceEntryCount"] <= actual_entries,
                  f"manifest {manifest['sourceEntryCount']} vs session {actual_entries}")

    if not manifest:
        continue
    segments = manifest.get("segments", [])

    # --- manifest invariants -------------------------------------------------
    anchors = [s.get("firstTurnId") for s in segments if s.get("firstTurnId")]
    check(journey, active, "I9 every chapter anchor is distinct",
          len(anchors) == len(set(anchors)),
          f"{len(anchors)} anchors, {len(set(anchors))} distinct")

    turn_ids = [t.get("turnId") for t in turns]
    unresolvable = [s.get("segmentId") for s in segments
                    if s.get("firstTurnId") and s["firstTurnId"] not in turn_ids]
    check(journey, active, "I10 every present anchor resolves in the ledger",
          not unresolvable,
          f"unresolvable: {unresolvable}" if unresolvable else "")

    currents = [s for s in segments if s.get("status") == "current"]
    check(journey, active, "I14 manifest has exactly one current chapter",
          len(currents) == 1, f"{len(currents)} current")

    # --- chapter file invariants ---------------------------------------------
    file_counts = {}
    for seg in segments:
        sid = seg.get("segmentId")
        path = f"{seg_dir}/{sid}.json"
        if not os.path.exists(path):
            file_counts[sid] = None
            continue
        doc = load(path)
        chapter = unwrap(doc, "conversation") if doc else None
        file_counts[sid] = len(chapter.get("messages", [])) if isinstance(chapter, dict) else None

    missing = [sid for sid, n in file_counts.items() if n is None]
    check(journey, active, "I15 every declared chapter has a readable file",
          not missing, f"missing/unreadable: {missing}" if missing else "")

    empty_closed = [sid for sid, n in file_counts.items()
                    if n == 0 and next((s for s in segments if s.get("segmentId") == sid), {}).get("status") == "closed"
                    and next((s for s in segments if s.get("segmentId") == sid), {}).get("turnCount", 0) > 0]
    check(journey, active, "I16 no closed chapter claims turns but holds no messages",
          not empty_closed, f"empty despite turnCount: {empty_closed}" if empty_closed else "")

    if receipt:
        total_in_files = sum(n for n in file_counts.values() if n)
        check(journey, active, "I6 receipt total equals the sum across chapter files",
              receipt.get("totalMessageCount") == total_in_files,
              f"receipt {receipt.get('totalMessageCount')} vs files {total_in_files}")

        current_id = currents[0].get("segmentId") if currents else None
        check(journey, active, "I5 receipt total equals historical plus the current chapter",
              receipt.get("totalMessageCount") == (receipt.get("historicalMessageCount") or 0)
              + (file_counts.get(current_id) or 0),
              f"total {receipt.get('totalMessageCount')} vs historical {receipt.get('historicalMessageCount')} + current {file_counts.get(current_id)}")

        check(journey, active, "I17 receipt names the manifest's current chapter",
              receipt.get("currentSegmentId") == current_id,
              f"{receipt.get('currentSegmentId')} vs {current_id}")

        if turns:
            check(journey, active, "I18 receipt last turn equals the ledger's last turn",
                  receipt.get("currentLastTurnId") == turns[-1].get("turnId"),
                  f"{receipt.get('currentLastTurnId')} vs {turns[-1].get('turnId')}")

# ---- report ---------------------------------------------------------------
by_inv = {}
for journey, generation, name, status, detail in results:
    by_inv.setdefault(name, {"PASS": [], "FAIL": []})[status].append((journey, generation, detail))

print("=" * 100)
print("SETTLEMENT INVARIANTS EVALUATED AGAINST THE REAL PRODUCTION STORE")
print("=" * 100)
for name in sorted(by_inv):
    stats = by_inv[name]
    npass, nfail = len(stats["PASS"]), len(stats["FAIL"])
    flag = "OK  " if nfail == 0 else "FAIL"
    print(f"\n[{flag}] {name}")
    print(f"       {npass} hold, {nfail} violated")
    for journey, generation, detail in stats["FAIL"]:
        print(f"         VIOLATED  {journey} gen {generation}  {detail}")

total_fail = sum(1 for r in results if r[3] == "FAIL")
print("\n" + "=" * 100)
print(f"{len(results)} checks over {len(threads)} Journeys: {len(results)-total_fail} hold, {total_fail} violated")
print(f"invariants with at least one violation: {sum(1 for n in by_inv if by_inv[n]['FAIL'])} of {len(by_inv)}")
