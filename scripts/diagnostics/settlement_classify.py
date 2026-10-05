#!/usr/bin/env python3
"""Classify each apparent violation: transient, by-design, or genuinely broken.

The question for every failed claim is whether the system ever promised it. Several of the claims in
the first pass were mine, not the system's.
"""
import json, os, glob

D = os.path.expanduser("~/Library/Application Support/ai.mirrormind.desktop")

def load(p):
    try:
        with open(p) as h: return json.load(h)
    except Exception: return None

def unwrap(v, *keys):
    if not isinstance(v, dict): return None
    for k in keys:
        if k in v and isinstance(v[k], dict): return v[k]
    return v

print("=" * 100)
print("A. Does the harness checkpoint count the same thing as the loaded message array?")
print("=" * 100)
print(f"{'journey':<32} {'checkpoint':>11} {'array':>8} {'delta':>8}  reading")
for tp in sorted(glob.glob(f"{D}/journey-threads/*.json")):
    j = os.path.basename(tp)[:-5]
    th = unwrap(load(tp), "thread")
    if not th: continue
    g = th.get("activeGeneration")
    ld = load(f"{D}/dedicated-journey-conversations/{j}/generation-{g}.json")
    if not ld: continue
    c = unwrap(ld, "conversation")
    cp = ((c.get("reconciliation") or {}).get("checkpoints") or {}).get("harness") or {}
    n_cp = cp.get("messageCount")
    n_arr = len(c.get("messages", []))
    if n_cp is None:
        reading = "no checkpoint yet"
        delta = None
    else:
        delta = n_arr - n_cp
        if delta == 0: reading = "equal"
        elif 0 < delta <= 4: reading = f"array ahead by {delta} -> turn in flight"
        elif delta > 4: reading = f"array ahead by {delta} -> UNEXPLAINED"
        else: reading = f"checkpoint ahead by {-delta} -> bounded window (CR114)"
    print(f"{j:<32} {str(n_cp):>11} {n_arr:>8} {str(delta):>8}  {reading}")

print()
print("=" * 100)
print("B. Is the receipt a conservative lower bound on what the chapter files hold?")
print("=" * 100)
print(f"{'journey':<32} {'receipt total':>14} {'sum of files':>13}  direction")
for tp in sorted(glob.glob(f"{D}/journey-threads/*.json")):
    j = os.path.basename(tp)[:-5]
    th = unwrap(load(tp), "thread")
    if not th: continue
    g = th.get("activeGeneration"); tid = th.get("threadId")
    base = f"{D}/conversation-segments/{j}/{tid}"
    man = load(f"{base}/generation-{g}.json")
    rcp = load(f"{base}/generation-{g}.segments/complete.json")
    if not man or not rcp: continue
    total = 0
    for s in man.get("segments", []):
        d = load(f"{base}/generation-{g}.segments/{s.get('segmentId')}.json")
        ch = unwrap(d, "conversation") if d else None
        if isinstance(ch, dict): total += len(ch.get("messages", []))
    r = rcp.get("totalMessageCount")
    direction = "equal" if r == total else ("receipt LOWER (conservative)" if r < total else "receipt HIGHER -> UNEXPLAINED")
    print(f"{j:<32} {str(r):>14} {total:>13}  {direction}")

print()
print("=" * 100)
print("C. Are the missing chapter files chapters that were never published?")
print("=" * 100)
for tp in sorted(glob.glob(f"{D}/journey-threads/*.json")):
    j = os.path.basename(tp)[:-5]
    th = unwrap(load(tp), "thread")
    if not th: continue
    g = th.get("activeGeneration"); tid = th.get("threadId")
    base = f"{D}/conversation-segments/{j}/{tid}"
    man = load(f"{base}/generation-{g}.json")
    if not man: continue
    segdir = f"{base}/generation-{g}.segments"
    rcp = load(f"{segdir}/complete.json")
    _ph = (rcp or {}).get("projectionHashes") or []
    hashes = set(x.get("segmentId") for x in _ph) if isinstance(_ph, list) else set(_ph)
    missing = [s.get("segmentId") for s in man.get("segments", [])
               if not os.path.exists(f"{segdir}/{s.get('segmentId')}.json")]
    if missing:
        claimed = [m for m in missing if m in hashes]
        print(f"  {j:<30} missing files: {missing}")
        print(f"  {'':<30} of those, claimed by the receipt: {claimed if claimed else 'none'}")

print()
print("=" * 100)
print("D. Identity invariants: do the enforced ones ever fail?")
print("=" * 100)
ident_pass = ident_fail = 0
for tp in sorted(glob.glob(f"{D}/journey-threads/*.json")):
    j = os.path.basename(tp)[:-5]
    th = unwrap(load(tp), "thread")
    if not th: continue
    g = th.get("activeGeneration"); tid = th.get("threadId")
    gen = next((x for x in th.get("generations", []) if x.get("generation") == g), None)
    ld = load(f"{D}/dedicated-journey-conversations/{j}/generation-{g}.json")
    if not gen or not ld: continue
    c = unwrap(ld, "conversation"); live = c.get("liveIdentity", {})
    auth = (c.get("reconciliation") or {}).get("authority") or {}
    man = load(f"{D}/conversation-segments/{j}/{tid}/generation-{g}.json")
    claims = [
        live.get("piSessionId") == gen.get("piSessionId"),
        auth.get("mirrorConversationId") == gen.get("mirrorConversationId"),
        live.get("generation") == g,
        live.get("harnessConversationId") == tid,
    ]
    if man:
        claims += [man.get("piSessionId") == live.get("piSessionId"),
                   man.get("threadId") == tid, man.get("generation") == g,
                   man.get("journeyId") == j]
    ident_pass += sum(1 for x in claims if x)
    ident_fail += sum(1 for x in claims if not x)
print(f"  identity claims evaluated: {ident_pass + ident_fail}")
print(f"  hold:     {ident_pass}")
print(f"  violated: {ident_fail}")

print()
print("=" * 100)
print("E. Closed chapters claiming turns while holding no messages")
print("=" * 100)
found = 0
for tp in sorted(glob.glob(f"{D}/journey-threads/*.json")):
    j = os.path.basename(tp)[:-5]
    th = unwrap(load(tp), "thread")
    if not th: continue
    g = th.get("activeGeneration"); tid = th.get("threadId")
    base = f"{D}/conversation-segments/{j}/{tid}"
    man = load(f"{base}/generation-{g}.json")
    if not man: continue
    for s in man.get("segments", []):
        if s.get("status") != "closed" or not s.get("turnCount"): continue
        p = f"{base}/generation-{g}.segments/{s.get('segmentId')}.json"
        if not os.path.exists(p): continue
        ch = unwrap(load(p), "conversation")
        if isinstance(ch, dict) and len(ch.get("messages", [])) == 0:
            found += 1
            print(f"  {j} gen {g} {s.get('segmentId')}: turnCount={s.get('turnCount')}, file messages=0, size={os.path.getsize(p)} bytes")
print(f"  total: {found}")

# --------------------------------------------------------------------------------------------------
# Sections F-I were added after the first pass. They chase the states the first pass left unexplained
# and the finding that chase produced: a harness checkpoint fed two different quantities.
# --------------------------------------------------------------------------------------------------

def _ledgers():
    for tp in sorted(glob.glob(f"{D}/journey-threads/*.json")):
        j = os.path.basename(tp)[:-5]
        th = unwrap(load(tp), "thread")
        if not th: continue
        g = th.get("activeGeneration")
        c = unwrap(load(f"{D}/dedicated-journey-conversations/{j}/generation-{g}.json"), "conversation")
        if isinstance(c, dict): yield j, g, c

print()
print("=" * 100)
print("F. Cancelled turns that still owe Mirror (pi failed, mirror pending): phantom debt")
print("=" * 100)
n_f = 0
for j, g, c in _ledgers():
    for t in c["reconciliation"].get("turns", []):
        if (t.get("pi") or {}).get("state") == "failed" and (t.get("mirror") or {}).get("state") == "pending":
            n_f += 1
            print(f"  {j:<30} {t['turnId'][-24:]}  failureCode={(t.get('pi') or {}).get('failureCode')}")
print(f"  total: {n_f}  (recovery ignores these by design: pendingMirrorTurnRepair requires pi committed)")

print()
print("=" * 100)
print("G. Turns stuck with a refused harness commit (pi committed, harness pending)")
print("=" * 100)
_mirror_db = os.path.expanduser("~/.mirror-minds/alisson-vale/memory.db")
_db = None
if os.path.exists(_mirror_db):
    import sqlite3
    try: _db = sqlite3.connect(f"file:{_mirror_db}?mode=ro", uri=True)
    except Exception: _db = None
n_g = 0
for j, g, c in _ledgers():
    conv = (c["reconciliation"].get("authority") or {}).get("mirrorConversationId")
    tim = {r.get("turnId"): r for r in (load(f"{D}/settlement-timings/{j}.json") or {}).get("records", [])}
    for t in c["reconciliation"].get("turns", []):
        if t["harness"]["state"] == "pending" and t["pi"]["state"] == "committed":
            n_g += 1
            in_mirror = "?"
            if _db and conv:
                in_mirror = _db.execute("select count(*) from messages where conversation_id=? and metadata like ?",
                                        (conv, f'%"sourceTurnId":"{t["turnId"]}"%')).fetchone()[0]
            trec = tim.get(t["turnId"])
            print(f"  {j:<30} {t['turnId'][-24:]}  mirror={t['mirror']['state']:<9} inMirrorDb={in_mirror!s:<3} timing={trec.get('outcome') if trec else '-'}")
print(f"  total: {n_g}  (these can never be repaired: pendingMirrorTurnRepair requires harness committed)")

print()
print("=" * 100)
print("H. Journeys primed to regress: harness checkpoint above the current surface, no commit since")
print("=" * 100)
for j, g, c in _ledgers():
    cp = ((c["reconciliation"].get("checkpoints") or {}).get("harness") or {}).get("messageCount")
    n = len(c.get("messages", []))
    if cp is not None and cp > n:
        print(f"  {j:<30} checkpoint {cp:>5} > surface {n:>5}  -> next commit with {n + 2} regresses")

print()
print("=" * 100)
print("I. Classification census (reason codes never clear: isConflictReason() is always true)")
print("=" * 100)
census = {}
for j, g, c in _ledgers():
    r = c["reconciliation"]
    census.setdefault(r.get("classification"), []).append((j, r.get("reasonCodes")))
for cl, rows in sorted(census.items(), key=lambda kv: -len(kv[1])):
    print(f"  {cl!s:<16} {len(rows)}")
    for j, codes in rows:
        if codes: print(f"      {j:<28} {codes}")
