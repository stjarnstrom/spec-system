# Debugging techniques

## Trace back to the origin

A bad value is usually noticed far from where it was made. From the
failure, walk up the call chain one caller at a time and ask where the
value came from, until you reach the place it was first wrong. When the
chain is hard to follow, capture a stack at the point of failure — in
JavaScript `console.error(new Error('[DEBUG-7f3a] origin').stack)`, in
Python `traceback.print_stack()` — and read it bottom-up. Fix at the origin,
not where it surfaced.

## Instrument the boundaries

For a pipeline (CI → build → sign, request → service → store), log what
enters and leaves each stage in one run. The first stage whose output is
wrong while its input was right holds the bug. One run of boundary logs
beats many runs of guesses.

## Defence in depth

After the root cause is fixed, ask whether the path it travelled should
refuse the bad value outright:

1. at the entry point — validate input where it enters the system;
2. in the logic — assert the precondition the bug violated;
3. in the environment — a guard that makes the dangerous case impossible
   (refuse to run a destructive command outside a temp dir while under
   test);
4. in instrumentation — enough logging that the next occurrence explains
   itself.

Add only the layers that pay for themselves; each is behaviour, so on an
owned path it may need a statement.

## Waiting on conditions

Timing-dependent failures usually come from sleeping a guessed duration.
Replace the sleep with a wait on the condition: poll every few
milliseconds until it holds or a timeout fires, and make the timeout's
message name what was awaited. A fixed delay belongs only where the delay
is the behaviour under test.

## A test that pollutes

When a file, global, or row appears that no single test explains, run the
test files one at a time and check for the artefact after each:

```sh
for f in $(git ls-files '*test*'); do
  <run one test file: $f> >/dev/null 2>&1
  [ -e <artefact> ] && { echo "polluter: $f"; break; }
done
```

Then bisect inside that file the same way.

## Bisecting history

When a known-good commit exists, `git bisect start <bad> <good>` then
`git bisect run <loop command>` finds the first bad commit without reading
code. The loop command must exit 0 on good and non-zero on bad, and 125 to
skip a commit that cannot be tested.

## Performance

Measure a baseline first, with the same input each run. Change one thing,
measure again. Profile before optimising; bisect when a regression has a
known-good commit.
