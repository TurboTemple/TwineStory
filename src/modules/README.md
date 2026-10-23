# Modules

One folder per game system (§7 of `CLAUDE.md`):

```
src/modules/<module>/
├── <module>.js     # queues a module descriptor on setup.__modules (§5.2)
├── <module>.twee   # the module's UI passages
├── <module>.css    # styles scoped under .m-<module> (optional)
└── README.md       # API, data types, state, events, hooks, open decisions
```

Built so far: `character`, `body`, `stats`, `status`, `inventory`, `clothing`, `shops`, `world`, `npcs`, `actions`, `travel`, `money`, `events`, `debug`. The UI shell lives in `src/02-ui/`.
