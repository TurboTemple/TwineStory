# Modules

One folder per game system (§7 of `CLAUDE.md`), added phase by phase:

```
src/modules/<module>/
├── <module>.js     # queues a module descriptor on setup.__modules (§5.2)
├── <module>.twee   # the module's UI passages, prefixed <Module>_
├── <module>.css    # styles scoped under .m-<module>
└── README.md       # API, data types, state, events, hooks, open decisions
```

No modules exist yet — the module system itself arrives in Phase 1.
