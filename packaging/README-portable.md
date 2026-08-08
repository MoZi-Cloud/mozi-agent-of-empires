# Mozi AoE (portable Linux build)

This folder contains a portable, no-root build of **Mozi AoE** for x86_64 Linux.
It is an unofficial fork of [Agent of Empires](https://github.com/agent-of-empires/agent-of-empires),
distributed under the MIT License. See `NOTICE` for attribution and what changed
relative to upstream.

## What is in here

- `aoe` — the self-contained binary (the web dashboard is compiled in, so there
  is no separate frontend to run).
- `start.sh` — the launcher.
- `LICENSE`, `NOTICE` — license and attribution.

## Requirements

- A modern x86_64 Linux (glibc 2.28+, i.e. Ubuntu 20.04 / Debian 11 / RHEL 8 or
  newer).
- `tmux` installed (`sudo apt install tmux` on Debian/Ubuntu).

## Run

```sh
./start.sh
```

The script picks a random free TCP port above 40000, binds to all interfaces so
other machines on your LAN can reach it, and prints:

- the local URL (`http://127.0.0.1:<port>`),
- the LAN URL (`http://<your-LAN-ip>:<port>`),
- the full authenticated URL with token (printed by `aoe serve` once it is up).

Open the authenticated URL in a browser. The token is required. Stop the server
with `Ctrl-C` in the terminal (or `aoe serve --stop` from another shell).

## Notes

- The first run creates a per-user config directory at
  `~/.config/agent-of-empires/` (unchanged from upstream, so an existing setup
  keeps working).
- Update checks point at this fork's GitHub releases; telemetry to upstream is
  disabled.
- The default Docker sandbox image and bundled notification sounds still
  reference upstream's public assets.
