# PowerElectronics Lab — SEO & Crawlability Guide

This guide details the SEO architecture, social link preview setup, prerendering pipeline, and step-by-step instructions for submitting the site to **Google Search Console (GSC)** and social media preview crawlers.

---

## ⚡ Overview of Implementation

1. **Pre-rendered Static HTML (`scripts/prerender.js`)**
   - Automatically pre-generates full HTML snapshots into `dist/` for all SPA routes (`/`, `/foundation-lab`, `/single-6-pulse-charger`, `/dual-charger-scheme`, `/static-switch`, `/soft-starter`, `/harmonics-filter`).
   - Ensures non-JS crawlers (Googlebot, Meta AI, WhatsApp, Twitter bot) receive populated HTML tags with titles, headings, and simulator descriptions.

2. **Open Graph & Twitter Cards (`index.html` & `public/og-image.png`)**
   - High-resolution 1200x630 dark-mode social banner (`public/og-image.png`).
   - Explicit static `og:title`, `og:description`, `og:image`, `og:image:width`, `og:image:height`, and `twitter:card` tags in `<head>`.

3. **Structured Data (JSON-LD)**
   - Schema.org `EducationalApplication` authored by **Anil Sharma** enumerating all 6 interactive simulators.

4. **Sitemap & Robots Directives (`public/sitemap.xml` & `public/robots.txt`)**
   - Clean XML sitemap mapping all simulator routes.
   - `robots.txt` pointing crawlers to `https://powerelectronicslab.netlify.app/sitemap.xml`.
   - Netlify `_redirects` (`/* /index.html 200`) and `X-Robots-Tag = "all"` header configured in `netlify.toml`.

---

## 🔍 How to Submit Sitemap to Google Search Console (GSC)

### Step 1: Log in to Google Search Console
1. Visit [Google Search Console](https://search.google.com/search-console).
2. Sign in with your Google account.

### Step 2: Add & Verify Property
1. Click **Add Property** in the top-left dropdown.
2. Select **URL prefix** and enter:
   `https://powerelectronicslab.netlify.app`
3. Verification options:
   - **HTML Tag**: Add the provided `<meta name="google-site-verification" content="..." />` tag to `index.html`.
   - **Netlify DNS / File**: Or upload the verification HTML file to `public/`.
4. Click **Verify**.

### Step 3: Submit `sitemap.xml`
1. In the left navigation sidebar, click **Sitemaps**.
2. Under **Add a new sitemap**, type:
   `sitemap.xml`
3. Click **Submit**.
4. Confirm GSC reports status **"Success"**.

### Step 4: Request Indexing for Key Routes
1. Use the top search bar (**URL Inspection**) to test:
   - `https://powerelectronicslab.netlify.app/`
   - `https://powerelectronicslab.netlify.app/foundation-lab`
   - `https://powerelectronicslab.netlify.app/single-6-pulse-charger`
   - `https://powerelectronicslab.netlify.app/dual-charger-scheme`
   - `https://powerelectronicslab.netlify.app/static-switch`
   - `https://powerelectronicslab.netlify.app/soft-starter`
   - `https://powerelectronicslab.netlify.app/harmonics-filter`
2. Click **TEST LIVE URL** to verify Googlebot fetches static HTML content.
3. Click **REQUEST INDEXING**.

---

## 📲 Social Link Preview Testing (WhatsApp, LinkedIn, Facebook, X)

To test how social media cards look when sharing your site:

1. Open [OpenGraph.xyz](https://www.opengraph.xyz).
2. Enter `https://powerelectronicslab.netlify.app`.
3. Verify that the title, description, and `og-image.png` render cleanly with no missing text or black fallback boxes.

---

## 🧪 Automated Local Verification

Run the automated build and SEO audit script:

```bash
npm run build && npm run test:seo
```

This command builds the Vite application, executes static prerendering, and asserts that:
- `<title>` and `<meta name="description">` exist and are non-empty.
- All Open Graph (`og:*`) and Twitter Card tags are present.
- `<noscript>` fallback and JSON-LD schema exist.
- All 6 simulator names are present in the static HTML payload.
