# debug

Tools for testing the real game on a phone. Only available with `?debug` in the address. Open them from **Debug** in the sidebar → **Debug tools**.

- **Go anywhere:** jump to any place or room instantly.
- **Time:** skip forward, or to the next 07:00 / 10:00 / 13:00 / 19:00.
- **Money:** add £5, £20 or £100.
- **Stats:** set any stat to 0, 50 or 100.
- **Events:** force an event (it fires whenever its conditions are met, ignoring chance and limits), block it, or put it back to normal. This isn't saved.
- **Game data:** counts of everything defined, and the save size.

API: `setup.debugTools.teleport(id)`, `skip(mins)`, `skipTo("HH:MM")`.
