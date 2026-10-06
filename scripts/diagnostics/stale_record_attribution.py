#!/usr/bin/env python3
"""CR128 replay: how stale turn-journal records would be attributed, old rule and new rule.

Read-only. Mirrors `match_unclaimed_pi_turn` (shipped through alpha.38) and the CR128 rule
`attribute_stale_pi_record` exactly, then runs both over every Journey's turn journal in a
data directory. The output is a per-record verdict under each rule so the change in blast radius
can be read directly rather than inferred.

Usage:
  python3 scripts/diagnostics/stale_record_attribution.py [--data-dir DIR] [--journey SLUG]
"""
from __future__ import annotations

import argparse
import glob
import json
import os
from datetime import datetime

DEFAULT_DATA_DIR = os.path.expanduser("~/Library/Application Support/ai.mirrormind.desktop")


def visible_text(message):
    if not isinstance(message, dict):
        return ""
    content = message.get("content")
    if isinstance(content, str):
        return content
    return "".join(
        block.get("text", "") for block in (content or [])
        if isinstance(block, dict) and block.get("type") == "text"
    )


def active_branch(path):
    """Mirror of `project_active_pi_branch`: every entry with an id except the session line, then
    the parentId chain back from the last entry in file order."""
    entries, by_id = [], {}
    for line in open(path, errors="replace"):
        line = line.strip()
        if not line:
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError:
            continue
        if value.get("type") == "session":
            continue
        entry_id = value.get("id")
        if not isinstance(entry_id, str):
            continue
        message = value.get("message") if isinstance(value.get("message"), dict) else {}
        by_id[entry_id] = len(entries)
        entries.append({
            "id": entry_id,
            "parent": value.get("parentId") if isinstance(value.get("parentId"), str) else None,
            "role": message.get("role"),
            "text": visible_text(message),
            "stop": message.get("stopReason"),
            "ts": value.get("timestamp") or "",
        })
    if not entries:
        return []
    chain, cursor = [], entries[-1]
    while cursor is not None:
        chain.append(cursor)
        parent = cursor["parent"]
        cursor = entries[by_id[parent]] if parent in by_id else None
    chain.reverse()
    return chain


def legacy_turns(branch):
    """Mirror of `project_complete_pi_transcript_from_branch`."""
    turns, pending, texts = [], None, []
    for index, entry in enumerate(branch):
        if entry["role"] == "user":
            pending, texts = entry, []
        elif entry["role"] == "assistant" and pending is not None:
            if entry["text"].strip():
                texts.append(entry["text"].strip())
            if entry["stop"] in ("stop", "length"):
                joined = "\n\n".join(texts)
                if pending["text"].strip() and joined.strip():
                    turns.append({
                        "user": pending["id"], "asst": entry["id"], "count": index + 1,
                        "started": pending["ts"], "committed": entry["ts"], "text": joined,
                    })
                pending, texts = None, []
    return turns


def parse_ts(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def related_sets(record, records):
    related = [
        c for c in records
        if c["authority"]["threadId"] == record["authority"]["threadId"]
        and c["authority"]["generation"] == record["authority"]["generation"]
        and c["authority"]["piSessionId"] == record["authority"]["piSessionId"]
    ]
    claimed = [c["terminalEvidence"]["piExecution"] for c in related
               if (c.get("terminalEvidence") or {}).get("piExecution")]
    frontier = max((e["entryCount"] for e in claimed), default=0)
    stale = sorted(
        (c for c in related if c["phase"] in ("admitted", "running")
         and c.get("terminalOutcome") is None and c.get("cancellationIntent") == "none"),
        key=lambda c: c["createdAt"],
    )
    return claimed, frontier, stale


def old_rule(record, records, turns):
    """`match_unclaimed_pi_turn` as shipped through alpha.38."""
    claimed, frontier, stale = related_sets(record, records)
    unclaimed = sorted(
        (t for t in turns if t["count"] > frontier
         and not any(e["userEntryId"] == t["user"] or e["assistantEntryId"] == t["asst"] for e in claimed)),
        key=lambda t: t["count"],
    )
    if len(stale) != len(unclaimed) or not stale:
        return "ambiguous"
    for index, (candidate, turn) in enumerate(zip(stale, unclaimed)):
        admitted, started, committed = parse_ts(candidate["createdAt"]), parse_ts(turn["started"]), parse_ts(turn["committed"])
        nxt = stale[index + 1] if index + 1 < len(stale) else None
        if started < admitted or committed < started or (nxt and committed > parse_ts(nxt["createdAt"])):
            return "frontier_mismatch"
        if candidate["authority"]["runId"] == record["authority"]["runId"]:
            return f"closed:{turn['asst'][:8]}"
    return "record_missing"


def new_rule(record, records, branch, turns):
    """CR128 `attribute_stale_pi_record`: pair stale records against unclaimed *requests*."""
    claimed, frontier, stale = related_sets(record, records)
    closed_by_user = {t["user"]: t for t in turns}
    requests = [
        {"user": e, "count": i + 1, "closed": closed_by_user.get(e["id"])}
        for i, e in enumerate(branch)
        if e["role"] == "user" and e["text"].strip() and i + 1 > frontier
        and not any(c["userEntryId"] == e["id"] for c in claimed)
    ]
    if len(stale) != len(requests) or not stale:
        return "ambiguous"
    for index, (candidate, request) in enumerate(zip(stale, requests)):
        admitted, asked = parse_ts(candidate["createdAt"]), parse_ts(request["user"]["ts"])
        nxt = stale[index + 1] if index + 1 < len(stale) else None
        if asked < admitted or (nxt and asked > parse_ts(nxt["createdAt"])):
            return "frontier_mismatch"
        turn = request["closed"]
        if turn is not None:
            committed = parse_ts(turn["committed"])
            if committed < asked or (nxt and committed > parse_ts(nxt["createdAt"])):
                return "frontier_mismatch"
        if candidate["authority"]["runId"] == record["authority"]["runId"]:
            if turn is not None:
                return f"closed:{turn['asst'][:8]}"
            # Interrupt only on positive evidence the run is over: a later request on the same
            # session. Pi appends a new request only after the previous process ended. A trailing
            # open request may still be live in another instance, so it is named, not judged.
            return "interrupted" if index + 1 < len(requests) else "request_open"
    return "record_missing"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default=DEFAULT_DATA_DIR)
    parser.add_argument("--journey")
    args = parser.parse_args()
    sessions = {}
    for path in glob.glob(os.path.join(args.data_dir, "pi-sessions", "*.jsonl")):
        name = os.path.basename(path)
        session_id = name.split("_", 1)[1][:-len(".jsonl")] if "_" in name else name[:-len(".jsonl")]
        sessions[session_id] = path
    totals = {"stale": 0, "old": {}, "new": {}, "changed": []}
    for journal_path in sorted(glob.glob(os.path.join(args.data_dir, "turn-journal", "*.json"))):
        journey = os.path.basename(journal_path)[:-len(".json")]
        if args.journey and journey != args.journey:
            continue
        records = json.load(open(journal_path)).get("records") or []
        stale = [r for r in records if r["phase"] in ("admitted", "running")
                 and r.get("terminalOutcome") is None and r.get("cancellationIntent") == "none"]
        if not stale:
            continue
        print(f"\n{journey}: {len(stale)} stale record(s)")
        for record in stale:
            totals["stale"] += 1
            session = sessions.get(record["authority"]["piSessionId"])
            if session is None:
                old = new = "session_missing"
            else:
                branch = active_branch(session)
                turns = legacy_turns(branch)
                old = old_rule(record, records, turns)
                new = new_rule(record, records, branch, turns)
            totals["old"][old.split(":")[0]] = totals["old"].get(old.split(":")[0], 0) + 1
            totals["new"][new.split(":")[0]] = totals["new"].get(new.split(":")[0], 0) + 1
            if old != new:
                totals["changed"].append((journey, record["authority"]["runId"], old, new))
            print(f"  {record['authority']['runId']:<44} phase={record['phase']:<8} created={record['createdAt'][:19]}  old={old:<18} new={new}")
    print(f"\n=== {totals['stale']} stale records across the store ===")
    print(f"  old rule: {totals['old']}")
    print(f"  new rule: {totals['new']}")
    print(f"  verdict changed on {len(totals['changed'])} record(s):")
    for journey, run_id, old, new in totals["changed"]:
        print(f"    {journey:<28} {run_id:<44} {old} -> {new}")


if __name__ == "__main__":
    main()
