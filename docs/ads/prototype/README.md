Advertiser PWA Prototype

Files:
- index.html — main clickable prototype (static)
- styles.css — basic styling
- app.js — prototype JavaScript handling navigation and form flow

How to run:
1. Open `docs/ads/prototype/index.html` in your browser (double-click or use a local static server).

Optional (serve with a simple static server):

```bash
# from project root
python3 -m http.server 8000 --directory docs/ads/prototype
# then open http://localhost:8000
```

Notes:
- This is a static, client-side prototype not connected to backend services.
- Use it to walk the advertiser flows: Create Campaign (multi-step), Campaign list, and basic Reports.
- File uploads are preview-only and not uploaded anywhere.