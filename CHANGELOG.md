# Changelog

Each entry is one version of this Railway template. Breaking changes are listed first.
Deployers get Railway's "update available" notice when a change lands on `main`.

## 0.20.0-railway.1 (2026-11-23)

First release.

- SimpleMindMap 0.20.0 (`wanglin2/mind-map` tag `0.20.0`, commit `e8e5ef9c41bc13ca7b13084e078123adff002242`, source archive checked by SHA-256), served by `nginx:1.30.7-alpine` pinned by digest.
- Server-side storage: the open map, its settings and the language are saved to the Railway volume at `/data`, so they survive redeploys and follow you to any browser.
- Basic-auth login on the whole site with a generated password (`AUTH_PASSWORD`); `/healthz` is the only open path.
- The upstream page's third-party analytics tag (51.la) and the "web version is a trial" pop-up are removed; the UI starts in English.
