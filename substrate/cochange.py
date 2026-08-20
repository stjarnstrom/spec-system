#!/usr/bin/env python3
"""
Propose candidate spec boundaries from git co-change history.

Files that change together belong together. This reads the commit log,
builds a file-pair affinity matrix (Jaccard), and reports clusters.

Usage:
    python3 cochange.py /path/to/repo
    python3 cochange.py /path/to/repo --since "18 months ago" --threshold 0.3

Interpretation notes are printed at the end of the report.
"""

import argparse
import os
import subprocess
import sys
from collections import Counter, defaultdict

# Paths that carry no boundary signal. Extend for your repo.
NOISE_SUBSTRINGS = (
    "node_modules/", "dist/", "build/", ".next/", "coverage/",
    "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb",
    ".snap", ".lock", "CHANGELOG",
)
NOISE_SUFFIXES = (
    ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico",
    ".woff", ".woff2", ".ttf", ".otf", ".glb", ".gltf", ".hdr", ".exr",
)


def git(repo, *args):
    out = subprocess.run(
        ["git", "-C", repo] + list(args),
        capture_output=True, text=True, check=True,
    )
    return out.stdout


def is_doc(path):
    """Docs co-change with what they describe — circular evidence for a
    boundary. Kept out of cluster membership; reported per-cluster instead."""
    return path.endswith(".md") or path.startswith("docs/") or path.startswith("docs\\")


def is_noise(path):
    if any(s in path for s in NOISE_SUBSTRINGS):
        return True
    return path.endswith(NOISE_SUFFIXES)


def extant_files(repo):
    files = set()
    for line in git(repo, "ls-files").splitlines():
        line = line.strip()
        if line and not is_noise(line):
            files.add(line)
    return files


def read_commits(repo, since):
    """Return list of commit file-sets, with renames resolved to current paths."""
    log = git(
        repo, "log", "--no-merges", "--since", since,
        "--pretty=format:__C__%H", "--name-status", "-M",
    )
    live = extant_files(repo)
    alias = {}  # old path -> current path

    def canonical(p):
        seen = set()
        while p in alias and p not in seen:
            seen.add(p)
            p = alias[p]
        return p

    commits = []
    current = None
    # Newest first, so a rename's destination is canonicalised before its source.
    for raw in log.splitlines():
        line = raw.rstrip("\n")
        if line.startswith("__C__"):
            if current is not None:
                commits.append(current)
            current = set()
            continue
        if not line.strip() or current is None:
            continue
        parts = line.split("\t")
        status = parts[0]
        if status.startswith("R") and len(parts) >= 3:
            old, new = parts[1], parts[2]
            alias[old] = canonical(new)
            path = canonical(new)
        elif len(parts) >= 2:
            path = canonical(parts[1])
        else:
            continue
        if path in live:
            current.add(path)
    if current is not None:
        commits.append(current)
    return commits


def cluster(files, sim, threshold):
    """Connected components over edges above threshold."""
    parent = {f: f for f in files}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for (a, b), s in sim.items():
        if a not in parent or b not in parent:
            continue  # doc-touching edges feed footnotes, never clusters
        if s >= threshold:
            union(a, b)

    groups = defaultdict(list)
    for f in files:
        groups[find(f)].append(f)
    return sorted(groups.values(), key=len, reverse=True)


def jaccard_pairs(commits, keep, max_files, min_pair=1):
    freq = Counter()
    pair = Counter()
    for cset in commits:
        cset = {f for f in cset if f in keep}
        if len(cset) < 2 or len(cset) > max_files:
            continue
        for f in cset:
            freq[f] += 1
        ordered = sorted(cset)
        for i in range(len(ordered)):
            for j in range(i + 1, len(ordered)):
                pair[(ordered[i], ordered[j])] += 1
    sim = {}
    for (a, b), n in pair.items():
        if n < min_pair:
            continue  # a single shared commit is coincidence, not affinity
        denom = freq[a] + freq[b] - n
        if denom > 0:
            sim[(a, b)] = n / denom
    return freq, pair, sim


def dir_key(path, depth):
    parts = path.split(os.sep)
    if len(parts) <= 1:
        return "<root>"
    return os.sep.join(parts[: min(depth, len(parts) - 1)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("repo")
    ap.add_argument("--since", default="24 months ago")
    ap.add_argument("--threshold", type=float, default=0.25,
                    help="Jaccard cutoff for an edge (try 0.2-0.4)")
    ap.add_argument("--min-commits", type=int, default=3,
                    help="Ignore files touched fewer times than this")
    ap.add_argument("--min-pair", type=int, default=2,
                    help="Ignore file pairs sharing fewer commits than this")
    ap.add_argument("--max-files", type=int, default=30,
                    help="Ignore commits touching more files than this (bulk refactors)")
    ap.add_argument("--hub-fraction", type=float, default=0.15,
                    help="Files in more than this fraction of commits are treated as cross-cutting")
    ap.add_argument("--dir-depth", type=int, default=2)
    ap.add_argument("--top-pairs", type=int, default=25)
    args = ap.parse_args()

    try:
        commits = read_commits(args.repo, args.since)
    except subprocess.CalledProcessError as e:
        sys.exit("git failed: " + (e.stderr or "").strip())

    usable = [c for c in commits if 2 <= len(c) <= args.max_files]
    if not usable:
        sys.exit("No usable commits. Widen --since or raise --max-files.")

    raw_freq = Counter()
    for c in usable:
        for f in c:
            raw_freq[f] += 1

    n = len(usable)
    hub_cut = max(args.min_commits, int(args.hub_fraction * n))
    hubs = sorted(
        [f for f, k in raw_freq.items() if k >= hub_cut],
        key=lambda f: -raw_freq[f],
    )
    eligible = {f for f, k in raw_freq.items()
                if k >= args.min_commits and f not in set(hubs)}
    keep = {f for f in eligible if not is_doc(f)}
    docs = eligible - keep

    freq, pair, sim = jaccard_pairs(usable, eligible, args.max_files, args.min_pair)
    clusters = [c for c in cluster(keep, sim, args.threshold) if len(c) > 1]
    clustered = {f for c in clusters for f in c}
    singles = sorted(keep - clustered, key=lambda f: -freq[f])

    def doc_affinity(members):
        """Docs whose strongest edge into this cluster clears the threshold."""
        hits = {}
        for d in docs:
            best = max((sim.get((min(d, m), max(d, m)), 0.0) for m in members), default=0.0)
            if best >= args.threshold:
                hits[d] = best
        return sorted(hits.items(), key=lambda kv: -kv[1])

    # Directory-level view
    dcommits = []
    for c in usable:
        dcommits.append({dir_key(f, args.dir_depth) for f in c
                         if not is_noise(f)})
    dfreq, dpair, dsim = jaccard_pairs(dcommits, {d for c in dcommits for d in c},
                                      args.max_files, args.min_pair)

    W = 78
    print("=" * W)
    print("CO-CHANGE REPORT  " + os.path.abspath(args.repo))
    print("=" * W)
    print("commits analysed : %d (of %d since %s)" % (n, len(commits), args.since))
    print("files considered : %d" % len(keep))
    print("params           : threshold=%.2f min-commits=%d min-pair=%d max-files=%d"
          % (args.threshold, args.min_commits, args.min_pair, args.max_files))

    print("\n" + "-" * W)
    print("CANDIDATE CAPABILITIES  (%d clusters)" % len(clusters))
    print("-" * W)
    for i, c in enumerate(clusters, 1):
        c = sorted(c, key=lambda f: -freq[f])
        dirs = Counter(dir_key(f, args.dir_depth) for f in c)
        label = ", ".join(d for d, _ in dirs.most_common(3))
        print("\n[%d] %d files  |  %s" % (i, len(c), label))
        for f in c[:18]:
            print("      %3dx  %s" % (freq[f], f))
        if len(c) > 18:
            print("      ... %d more" % (len(c) - 18))
        for d, aff in doc_affinity(set(c))[:4]:
            print("      doc:  %.2f  %s" % (aff, d))

    print("\n" + "-" * W)
    print("CROSS-CUTTING / HUB FILES  (excluded from clustering)")
    print("-" * W)
    print("Touched by >=%d commits. Usually config, barrels, routers, app shell." % hub_cut)
    for f in hubs[:25]:
        print("      %3dx  %s" % (raw_freq[f], f))

    print("\n" + "-" * W)
    print("UNCLUSTERED  (no strong partner above threshold)")
    print("-" * W)
    for f in singles[:30]:
        print("      %3dx  %s" % (freq[f], f))
    if len(singles) > 30:
        print("      ... %d more" % (len(singles) - 30))

    print("\n" + "-" * W)
    print("STRONGEST FILE PAIRS")
    print("-" * W)
    for (a, b), s in sorted(sim.items(), key=lambda kv: -kv[1])[:args.top_pairs]:
        print("      %.2f  (%dx)  %s  <->  %s" % (s, pair[(a, b)], a, b))

    print("\n" + "-" * W)
    print("DIRECTORY AFFINITY  (depth %d)" % args.dir_depth)
    print("-" * W)
    for (a, b), s in sorted(dsim.items(), key=lambda kv: -kv[1])[:20]:
        print("      %.2f  (%dx)  %s  <->  %s" % (s, dpair[(a, b)], a, b))

    print("\n" + "=" * W)
    print("HOW TO READ THIS")
    print("=" * W)
    print("""
- A cluster is a HYPOTHESIS, not a boundary. Ask of each one: can I state
  what this does as observable behaviour at some contract? If not, it is a
  layer, not a capability.
- One giant cluster swallowing everything means the threshold is too low.
  Raise it by 0.05 and rerun.
- All singletons means it is too high, or the history is too short.
- Hub files are the tell for cross-cutting concerns. They should usually be
  "unspecified by design", not their own spec.
- High directory affinity between two dirs that you think are separate
  concerns is worth a hard look. Either they are one capability, or there is
  a leaky abstraction between them.
- Files with high commit counts and no strong partners are often either
  genuinely standalone, or churning for reasons unrelated to features
  (formatting, dependency bumps, flaky-test whack-a-mole).
""".rstrip())


if __name__ == "__main__":
    main()
