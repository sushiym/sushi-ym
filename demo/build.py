#!/usr/bin/env python3
"""Builds the DEMO copy of SUSHI YM takip from the working index.html.

The demo has no Firebase at all: data lives only in the visitor's browser,
filled with made-up sample data. Run:  python3 demo/build.py
Output: demo/site/ (index.html, sw.js, manifest.webmanifest, icons) — publish that folder.
"""
import pathlib, re, shutil, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "index.html"
OUT = ROOT / "demo" / "site"
parts = re.split(r"^//@@ PART [A-C]:.*$\n", (ROOT / "demo" / "demo.js").read_text(encoding="utf-8"), flags=re.M)
_, PART_A, PART_B, PART_C = parts

html = SRC.read_text(encoding="utf-8")

def once(old, new, label):
    global html
    n = html.count(old)
    if n != 1:
        sys.exit(f"build failed: «{label}» found {n} times (expected 1) — index.html changed, update demo/build.py")
    html = html.replace(old, new)

def between(start, end, new, label, keep_end=True):
    global html
    i = html.find(start); j = html.find(end, i + 1) if i >= 0 else -1
    if i < 0 or j < 0 or html.count(start) != 1:
        sys.exit(f"build failed: block «{label}» not found — update demo/build.py")
    html = html[:i] + new + (html[j:] if keep_end else html[j + len(end):])

# 1. no Firebase libraries
for lib in ("app", "auth", "firestore"):
    once(f'<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-{lib}-compat.js"></script>\n', "", "firebase " + lib)

# 2. own names: the demo's saved settings never mix with the working program in the same browser
html = html.replace("localStorage.", "DEMO_LS.")
html = html.replace("firebase.auth()", "DEMO_NOAUTH")  # device sign-in/out code stays but is never reached
once("<title>SUSHI YM takip</title>", "<title>SUSHI YM takip — демо</title>", "title")
once('<meta name="apple-mobile-web-app-title" content="SUSHI YM">', '<meta name="apple-mobile-web-app-title" content="YM демо">', "app title")

# 3. demo marks: header strip, hint on the PIN screen, styles
once('<h1 translate="no">SUSHI YM takip</h1>', '<h1 translate="no">SUSHI YM takip <span class="demotag">DEMO</span></h1>', "h1")
once('  <div class="chips" id="chips"></div>',
     '  <div class="demobar"><span>Демо-версия: данные выдуманные и хранятся только в этом браузере.</span><button type="button" class="btn small" data-demoreset>Сбросить демо</button></div>\n  <div class="chips" id="chips"></div>', "chips")
once("</style>\n</head>",
     ".demotag{font:600 .7rem/1 var(--font, inherit);letter-spacing:.08em;background:#E8B04A;color:#23352B;border-radius:6px;padding:4px 6px;vertical-align:middle}\n"
     ".demobar{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:10px 0 4px;padding:8px 10px;border-radius:10px;background:rgba(232,176,74,.18);border:1px solid rgba(232,176,74,.55);font-size:.86rem}\n"
     ".demobar .btn{margin-left:auto;background:#E8B04A;color:#23352B;border-color:#E8B04A}\n"
     ".demohint{margin:0 0 12px;padding:10px 12px;border-radius:10px;background:rgba(232,176,74,.16);border:1px solid rgba(232,176,74,.55);font-size:.9rem;line-height:1.45}\n"
     ".demohint .btn{display:block;margin-top:8px}\n</style>\n</head>", "styles")
once('g.innerHTML = `<form class="gbox" id="loginForm" autocomplete="off"><h2>SUSHI YM takip</h2>',
     'g.innerHTML = `<form class="gbox" id="loginForm" autocomplete="off"><h2>SUSHI YM takip</h2>${demoGateHint()}', "login form")

# 4. buttons that only make sense with the cloud database
once('${devIsMain()?"":`<button class="btn" id="devSignOut">Отключить это устройство</button>`}<button class="btn" id="importOld">Перенести данные из старой программы</button>', "", "cloud buttons")

# 5. demo code: storage + texts at the top, local database instead of Firebase, sample data at start
once("<script>\n", "<script>\n" + PART_A, "main script")
once("const I18N_RE = ", "Object.assign(I18N, DEMO_I18N);\nconst I18N_RE = ", "i18n")
between("/* ---------- start (Firebase, offline-first) ---------- */", "function startSubs(){", PART_B, "firebase config")
between("(async () => {\n  if (!window.firebase)", "})();\n</script>", PART_C + "</script>", "firebase start", keep_end=False)

# 6. nothing of the working cloud may remain
for bad in ("sushi-ym-takip-1", "AIza", "gstatic.com/firebasejs", "firebase.initializeApp", "firebase.auth"):
    if bad in html:
        sys.exit(f"build failed: «{bad}» is still in the demo")

OUT.mkdir(parents=True, exist_ok=True)
(OUT / "index.html").write_text(html, encoding="utf-8")
sw = (ROOT / "sw.js").read_text(encoding="utf-8")
sw = sw.replace('const VER = "sushi-ym-v1";', 'const VER = "sushi-ym-demo-v1";')
sw = re.sub(r',\s*"https://www\.gstatic\.com/firebasejs/[^"]+"', "", sw)
sw = sw.replace("// SUSHI YM takip — offline cache", "// SUSHI YM takip DEMO — offline cache")
# caches are shared by every page on sushiym.github.io: the demo clears only its own old caches, never the working program's
old_clean = "ks.filter(k => k!==VER)"
if sw.count(old_clean) != 1: sys.exit("build failed: sw.js cache cleanup changed — update demo/build.py")
sw = sw.replace(old_clean, 'ks.filter(k => k.startsWith("sushi-ym-demo-") && k!==VER)')
(OUT / "sw.js").write_text(sw, encoding="utf-8")
man = (ROOT / "manifest.webmanifest").read_text(encoding="utf-8")
man = man.replace('"name": "SUSHI YM takip"', '"name": "SUSHI YM takip — демо"').replace('"short_name": "SUSHI YM"', '"short_name": "YM демо"')
(OUT / "manifest.webmanifest").write_text(man, encoding="utf-8")
for icon in ROOT.glob("icon-*.png"):
    shutil.copy(icon, OUT / icon.name)
print("demo built:", OUT, f"{len(html)//1024} KB")
