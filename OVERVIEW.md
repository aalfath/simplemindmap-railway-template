# Deploy and Host SimpleMindMap on Railway

SimpleMindMap (思绪思维导图, `wanglin2/mind-map`) is an open-source, MIT-licensed web mind-mapping app. It offers logical, org-chart, fishbone, timeline and other layouts, many themes, rich-text nodes with icons, images, notes and links, an outline view, and import or export as XMind, Markdown, PNG, SVG, PDF and JSON.

## About Hosting SimpleMindMap

Upstream SimpleMindMap is a static web app that keeps your map in the browser's local storage, so a plain static deploy loses the map when you switch browser or clear site data. This template serves release 0.20.0 from nginx and adds server-side storage: the open map, its settings and the language are saved to a Railway volume at `/data` and load in any browser you sign in from. The whole site sits behind one login (user `admin`, generated password). Nothing else is needed: no database and no API keys. The app answers `/healthz` for Railway's health check and runs comfortably in 0.5 GB (it uses about 10 MB).

## Common Use Cases

* Brainstorming and planning in a private mind map you can open from any device
* Turning notes or outlines into structured diagrams, then exporting them as XMind, Markdown, PNG, SVG or PDF
* A self-hosted alternative to online mind-map services for a person or a small team sharing one login

## Dependencies for SimpleMindMap Hosting

* One Railway service built from the template's GitHub repo (nginx serving SimpleMindMap 0.20.0)
* One Railway volume at `/data` for the saved map and settings

### Deployment Dependencies

* SimpleMindMap source and release 0.20.0: https://github.com/wanglin2/mind-map/releases/tag/0.20.0
* Upstream deployment docs: https://wanglin2.github.io/mind-map-docs/en/start/deploy.html
* Template repository: https://github.com/aalfath/simplemindmap-railway-template

### Implementation Details

**After deploy:** open the service's Railway URL and sign in as `admin` with the password in the service's `AUTH_PASSWORD` variable (Variables tab). Change `AUTH_PASSWORD` (or `AUTH_USERNAME`) there at any time and redeploy.

**Variables:** `AUTH_USERNAME` (default `admin`), `AUTH_PASSWORD` (generated, 24 characters, required, at least 8), `PORT` (8080). There are no prompts.

**Storage:** the app's working map lives on the server, one shared map per deployment; use the app's File menu to save or open other maps as files. Saving is last-write-wins, not live collaboration. A small badge appears at the bottom left if a save fails, and the app retries.

**Changes from upstream:** the page's third-party analytics tag (51.la) and the "web version is a trial, download the client" pop-up are removed, and the UI starts in English (switch language in Settings). The AI panel starts switched off: upstream's AI feature talks to its desktop client on your own computer (`localhost:3456`), which a hosted copy doesn't have.

**Updates:** the template builds from `aalfath/simplemindmap-railway-template`, which pins the SimpleMindMap release commit (checked by SHA-256) and the nginx image by digest. When a new version lands on the repo's `main` branch, Railway shows you an "update available" notice; read the repo's `CHANGELOG.md`, then apply it. Your map stays on the volume.

## Why Deploy SimpleMindMap on Railway?

<!-- Recommended: Keep this section as shown below -->
Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying SimpleMindMap on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
<!-- End recommended section -->
