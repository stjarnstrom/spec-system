# Spec registry

The human rendering of the spec layer's index and pin table. The machine truth is
[registry.yaml](registry.yaml); the tables below are generated from it by
`node specs/registry.mjs sync` — **edit the yaml, never the tables**.
`node specs/registry.mjs check` validates the yaml against the spec files and the
working tree; run it before committing anything under `specs/`.
`node specs/registry.mjs render` writes [registry.html](registry.html), a
browsable rendering of the registry, the specs, and the plans — a view for
humans, never edited by hand.
[FORMAT.md](FORMAT.md) defines the schema, the status vocabulary, and the
statement kinds.

`pin` is the content hash of the spec file the code satisfies; git holds the
file's history. A spec file that no longer matches its pin means an amendment
is written and unimplemented; `target` means the code does not exist yet.
`verified` counts requirements with real evidence, derived from the spec itself.

## Capabilities

<!-- generated:capabilities -->
<!-- /generated:capabilities -->

## Dependency edges

<!-- generated:edges -->
<!-- /generated:edges -->

## Seams

<!-- generated:seams -->
<!-- /generated:seams -->
