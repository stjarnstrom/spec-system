# Vocabulary for module design

Use these words exactly. "Component", "service", "boundary", and "layer"
mean too many things to argue with.

- **Module** — anything with an interface and an implementation: a
  function, a class, a package, a slice through several tiers.
- **Interface** — everything a caller must know to use the module
  correctly: the signature, and also its invariants, ordering constraints,
  error modes, required configuration, and performance characteristics.
- **Implementation** — what the interface hides.
- **Depth** — behaviour a caller (or a test) can exercise per unit of
  interface it has to learn. Deep: a small interface over a lot of
  behaviour. Shallow: an interface nearly as complex as what it hides.
  Depth belongs to the interface; internal seams inside a deep module are
  fine and private.
- **Seam** — a place where behaviour can change without editing that
  place: where a module's interface lives. (A *registry seam* is a
  different thing — an unowned path in `specs/registry.yaml`.)
- **Adapter** — something that satisfies an interface at a seam. It names
  a role: a Postgres repository and an in-memory fake are both adapters.
- **Leverage** — what callers get from depth: more done per thing learned.
- **Locality** — what maintainers get: a change or a fix lands in one
  place.

## Tests of a design

- **The deletion test.** Imagine deleting the module and inlining it into
  its callers. If complexity vanishes, it was a pass-through. If the same
  complexity reappears in several callers, it was earning its keep.
- **The interface is the test surface.** A test that needs to reach past
  the interface says the module is the wrong shape.
- **One adapter is a hypothetical seam; two adapters make a real one.**
  Do not introduce a seam for a second implementation nobody has.
- Testable modules accept their dependencies rather than creating them,
  return results rather than producing side effects, and keep their
  surface small.

## Dependency categories decide the test strategy

1. **In-process** — pure logic, in-memory state. Merge it into the deep
   module and test it directly.
2. **Local and substitutable** — a filesystem, an embeddable database.
   Test against a real local stand-in, behind an internal seam.
3. **Remote but yours** — another service you own. Define a port at the
   seam; an HTTP adapter for production, an in-memory adapter for tests.
4. **Truly external** — a third-party API. An injected port, a mock
   adapter in tests, and a thin contract test against the real thing where
   that is affordable.

## Design it twice — the constraints

Give each parallel designer one:

- Minimise the interface: one to three entry points.
- Optimise for the most common caller: its call site becomes one line.
- Maximise flexibility: the interface admits the variations in sight.
- Ports and adapters: the dependency sits behind a seam from the start.

Each returns: the interface with invariants and error modes, a usage
example, what it hides, its dependency strategy, and its trade-offs.
