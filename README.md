# Dr Ethan Yeoh — 3D Profile CV

Interactive 3D résumé site: Senior AI Architect and Enterprise AI Transformation Leader.

- Blue-on-white futuristic theme with an interactive Three.js "AI core" (neural shell, orbit rings, signal pulses)
- 3D tilt cards, a draggable 3D technology sphere, scroll-reveal timeline and animated KPI counters
- Pure static HTML/CSS/JS with no build step. Three.js loads from the jsDelivr CDN.

## Run locally

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Deploy (GitHub Pages)

1. Create a public repo named `<username>.github.io` (for a root URL) or any name (served at `/<repo>/`).
2. Push this folder to the `master` branch.
3. Go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, then select `master` / `root`.

Live at https://eikden.github.io/. The previous 2017 R Markdown slides are kept in `archive-2017/`.
