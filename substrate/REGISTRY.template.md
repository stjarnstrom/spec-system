# Spec registry

The human rendering of the spec layer's index and pin table. The machine truth is
[registry.yaml](registry.yaml); the tables below are generated from it by
`node specs/registry.mjs sync` — **edit the yaml, never the tables**.
`node specs/registry.mjs check` validates the yaml against the spec files and the
working tree; run it before committing anything under `specs/`.
[FORMAT.md](FORMAT.md) defines the schema, the status vocabulary, and the
statement kinds.

`version` is what the spec file says; `pinned` is what the code satisfies. A
`version` ahead of its `pinned` means an amendment is written and unimplemented.
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
