# The Wayfinder’s Archive — deployment instructions

## Ready for a static hosting release

The application is in `files/`. This package includes a `netlify.toml` at the project root configured to publish that directory with no build command.

### Netlify (recommended first release)
1. Create a new site in Netlify. Upload the entire contents of this deployment package as a repository, then import that repository into Netlify.
2. Netlify will read `netlify.toml` and publish `files/` without a build step. If using the Netlify CLI from this package root, use `netlify deploy --prod --dir=files` after linking the site.
3. For manual drag-and-drop deployment, upload **the contents of `files/`** as the publish directory, not the entire ZIP.
4. Open the assigned HTTPS site and test expedition creation, save/reload, quest progression, combat, and export/import.
5. Configure a custom domain in Netlify and update its DNS as instructed by the hosting provider. Enable HTTPS.

### Cloudflare Pages / other static hosts
Set output/publish directory to `files`, no build command. Ensure requests to `/` serve `files/index.html`. Do not use an SPA catch-all rewrite unless required by your host; there is only one HTML entry point.

### Important limitations
- No account system, cloud save, real multiplayer, or global statistics. Local saves are per-browser and per-origin; moving from local file or another domain will not automatically transfer them. Export the save from Data Vault before switching origins and import it on the deployed site.
- The optional Node `server/ai-proxy.mjs` is NOT deployed by this static configuration. The AI narrative feature should remain disabled unless you separately deploy a hardened, authenticated, rate-limited backend. Never put `AI_API_KEY` in browser code or a public repository.
- This package has not been deployed to a public hosting account; deployment requires owner access and DNS configuration.
- No strict CSP is imposed yet because the existing app uses inline styles and dynamically generated HTML. Perform a CSP compatibility audit before enabling an enforcing policy.
- Do not serve the `server/` or `work/` directories publicly. The static publish root is only `files/`.

### Local verification
From the package root: `python3 -m http.server 8099 --directory files` then visit `http://localhost:8099/`. For browser automation, install Playwright and Chromium separately and run the scripts in `work/` per the original handoff.

### Rollback
Keep the original uploaded source ZIP as a baseline. On Netlify, roll back to a previous successful deploy if needed.
