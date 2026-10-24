# Customer Display — Kiosk Setup (Till PC)

Sets up the till PC so the customer-facing bill display opens
automatically, fullscreen, pinned to the second monitor, every time the
PC boots — no one has to manually open a tab and drag it over.

This is **machine configuration, not app code** — nothing here gets
committed or deployed. It only needs to be done once per till PC.

Requires: **Microsoft Edge** on the till PC (must match whatever browser
the cashier runs the POS in day-to-day — see "Why it must be Edge" below).

## Step 1 — Find the second monitor's position

Open PowerShell on the till PC and run:

```powershell
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Screen]::AllScreens | ForEach-Object {
  "{0} | Bounds={1} | Primary={2}" -f $_.DeviceName, $_.Bounds, $_.Primary
}
```

This prints one line per monitor, e.g.:

```
\\.\DISPLAY1 | Bounds={X=0,Y=0,Width=1920,Height=1080} | Primary=True
\\.\DISPLAY2 | Bounds={X=1920,Y=0,Width=1920,Height=1080} | Primary=False
```

Find the line for whichever physical monitor faces the customer (usually
the one with `Primary=False`). Note its **X value** — that's the
`--window-position` coordinate used below. In the example above it's
`1920`.

## Step 2 — Build the launch command

Replace `<X>` with the X value from Step 1:

```
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk https://asianlepos.web.app/customer-display --edge-kiosk-type=fullscreen --window-position=<X>,0
```

Notes on the flags:
- `--kiosk` + `--edge-kiosk-type=fullscreen` — locked-down fullscreen,
  no address bar/tabs. (Edge's `--kiosk` alone defaults to a "public
  browsing" kiosk type that still shows some session UI — the extra flag
  is required to get Chrome-equivalent behavior.)
- `--window-position=<X>,0` — opens on the customer-facing monitor
  before going fullscreen there.
- No `--user-data-dir` — deliberately uses Edge's default profile, so
  this window shares `BroadcastChannel` with the cashier's normal Edge
  window. See "Why it must be Edge" below.

To exit kiosk mode later: `Alt+F4` or `Ctrl+Alt+Del` → Task Manager.

## Step 3 — Create the Startup shortcut

1. Right-click Desktop → New → Shortcut.
2. Paste the full command from Step 2 as the target (including the
   quoted exe path).
3. Name it e.g. "Customer Display".
4. Press `Win+R`, type `shell:startup`, Enter — this opens the Startup
   folder.
5. Move the shortcut into that folder.

Reboot (or log out/in) to confirm it opens automatically, fullscreen, on
the correct monitor.

## Why it must be Edge (not Chrome)

`BroadcastChannel` — how the cashier window's live cart reaches this
display — is scoped to one browser **application + profile**. Chrome and
Edge are separate applications with separate profile stores even though
they're both Chromium; a Chrome window and an Edge window never see each
other's broadcasts, even side by side on the same PC. Whatever browser
the cashier runs the POS in, the kiosk window must be that same browser.

## Troubleshooting

- **Display shows "Welcome!" and never updates** — the kiosk window and
  the cashier's POS window are different browsers (one Chrome, one
  Edge), or different profiles. Confirm both are plain Edge with no
  `--user-data-dir` override.
- **Window opens on the wrong monitor** — re-run the Step 1 script with
  the kiosk window closed; monitor numbering can reorder after a cable
  change. Re-check which `DeviceName` is physically which screen.
- **Stuck in kiosk mode and need out** — `Ctrl+Alt+Del` → Task Manager →
  end the Edge task, or `Alt+F4`.
