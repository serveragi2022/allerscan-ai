# AllerScan AI

AI-assisted food allergen screening. Photograph a meal or an ingredient label and see which
allergens are **detected**, **possible**, or **unknown**, with the evidence and a suggested way to verify each one.

> **Safety first.** A photo cannot confirm all ingredients, hidden allergens, or cross-contact.
> AllerScan never says a food is "safe" or "allergen-free". A gray "not identified" result only means
> nothing in the available information pointed to that allergen. Anyone with a food allergy must verify
> the full ingredient label and manufacturer information.

## Features

- **Scan Food**: take a photo (live camera on desktop, native camera on phones) or upload JPG/PNG/WebP. Images are validated and resized in the browser before upload.
- **Scan Label**: front and back of a packaged product. Extracts product name, brand, ingredient list, declared allergens and "may contain" statements, and shows the extracted text so you can check it against the package.
- **Structured, validated analysis**: the model must return JSON that passes a strict Zod schema. Malformed output is rejected, never patched with invented findings.
- **Honest statuses**: red = detected/declared, orange = may be present, dashed = unknown, gray = not identified. There is no green.
- **My Allergies**: choose your allergens and labeling market (global, US, EU/UK, Philippines, Canada, Australia/NZ). Stored in the browser only.
- **Scan History**: saved in the browser (max 50), open, delete, clear, export JSON/CSV. Only a small thumbnail is kept, never the original photo.
- **No account required.** No server-side database. Nothing persists on the server.

## Tech stack

Next.js 15 (App Router, JavaScript), React 19, Tailwind CSS 3, lucide-react, Zod.
No native dependencies and no background processes, so it runs on standard Vercel serverless functions.

## Quick start

Requires Node.js 18.18 or newer.

```bash
npm install
cp .env.example .env.local   # then edit .env.local
npm run dev                  # http://localhost:3000
```

Other commands:

```bash
npm run build   # production build
npm run start   # serve the production build
```

The app loads without an AI key. Pages work, but scans return a clear "not configured" error and
the Scan pages show a setup banner. **No fake results are ever produced.**

## Configuring the AI provider

All AI calls are made server-side from `/api/analyze-food` and `/api/analyze-label`. The key is never
sent to the browser and must never be given a `NEXT_PUBLIC_` prefix.

| Variable | Required | Description |
| --- | --- | --- |
| `AI_PROVIDER` | no | `anthropic` (default) or `openai` (any OpenAI-compatible chat completions API) |
| `AI_API_KEY` | **yes** | API key for the provider |
| `AI_MODEL` | **yes** | A **vision-capable** model ID for that provider |
| `AI_BASE_URL` | no | Override the API base URL (gateways, proxies, compatible services) |
| `AI_TIMEOUT_MS` | no | Provider timeout, default `55000`. Keep it below the function limit |
| `AI_REASONING_EFFORT` | no | Lowers "thinking" on reasoning models to speed up scans (e.g. `low`, `minimal`). Sent as `reasoning_effort` on the `openai` provider |
| `AI_OPENAI_JSON_MODE` | no | Set to `false` if your OpenAI-compatible service rejects `response_format` |
| `RATE_LIMIT_PER_MINUTE` | no | Scans per IP per minute, default `10` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | no | Shared rate-limit counter across serverless instances (recommended in production) |

Examples:

```bash
# Anthropic
AI_PROVIDER=anthropic
AI_API_KEY=sk-ant-...
AI_MODEL=<a vision-capable Claude model ID>

# OpenAI
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=<a vision-capable model ID, e.g. gpt-4o>
```

Check your provider's documentation for the current model IDs. Model names change over time, which is why none is hard-coded.

To add another provider, add a function in `lib/ai-provider.js` and register it in `PROVIDERS`.

## Deploying to Vercel

1. Push this folder to a Git repository (GitHub, GitLab or Bitbucket).
2. In Vercel choose **Add New → Project** and import the repository. The framework is detected as Next.js; keep the defaults (`npm install`, `npm run build`).
3. Open **Settings → Environment Variables** and add `AI_PROVIDER`, `AI_API_KEY` and `AI_MODEL` (and any optional ones above) for **Production** and **Preview**. Leave "Sensitive" on for the key.
4. Click **Deploy**. Environment variable changes only apply to **new** deployments, so redeploy after editing them.
5. Optional but recommended: add the Upstash Redis integration from the Vercel Marketplace to get shared rate limiting.

Or with the CLI: `npm i -g vercel`, then `vercel` and `vercel --prod`.

Notes:

- Vercel serverless functions accept request bodies up to about 4.5 MB. The browser compresses each image to roughly 1.5 MB or less, and the server enforces 2 MB per image and 4 MB total.
- The analyze routes set `maxDuration = 60` seconds. Your plan's limit may be lower; if so, lower `AI_TIMEOUT_MS` and `maxDuration` in the route files.
- The camera requires HTTPS (Vercel provides it) or `localhost`.

## Project structure

```
app/
  page.js                    Home
  scan/page.js               Scan Food
  label/page.js              Scan Label
  allergies/page.js          My Allergies
  history/page.js            Scan History
  api/analyze-food/route.js  POST: food photo -> analysis
  api/analyze-label/route.js POST: label photos -> analysis
  api/status/route.js        GET: { aiConfigured: boolean } (no secrets)
components/                  UI (scanner, results, badges, history, ...)
lib/
  ai-provider.js             Provider-independent vision client (Anthropic / OpenAI-compatible)
  allergen-analyzer.js       Prompt, validation, guardrails, overall assessment
  allergens.js               Allergen catalogue and per-market lists
  schemas.js                 Zod schemas and enums
  image-validation.js        Type/size rules and magic-byte sniffing (client + server)
  image-client.js            Browser compression and thumbnails
  rate-limit.js              Upstash or in-memory rate limiting
  storage.js, use-profile.js localStorage profile, history, export
```

## How the safety rules are enforced in code

These are applied by the server in `lib/allergen-analyzer.js`, not left to the model:

- Output must match the Zod schema, otherwise the request fails with `502 AI_BAD_OUTPUT` and **no result is shown**.
- An appearance-only guess cannot be "detected" unless the model reports high confidence; otherwise it is downgraded to "possible".
- Claims of evidence the app cannot have (for example an ingredient label when no label is visible) are downgraded to "visual inference".
- Every allergen in the selected market and in your profile appears in the result. Anything the model skipped is marked "unknown".
- The overall assessment is computed from the findings and can never mean "safe".
- Text inside photos and the optional user note are treated as data, not instructions.

## API reference

`POST /api/analyze-food`: `multipart/form-data` with `image` (file), `market`, `context` (optional, max 500 chars), `userAllergens` (JSON array of allergen ids, optional).

`POST /api/analyze-label`: same, with `front` and/or `back` instead of `image`.

Success: `200 { "result": { ... } }`. Errors: `{ "error": { "code", "message" } }`.

| Status | Codes |
| --- | --- |
| 400 | `NO_IMAGE`, `INVALID_INPUT`, `BAD_FORM`, `EMPTY_IMAGE` |
| 413 | `REQUEST_TOO_LARGE`, `IMAGE_TOO_LARGE`, `IMAGES_TOO_LARGE` |
| 415 | `UNSUPPORTED_IMAGE`, `BAD_CONTENT_TYPE` |
| 422 | `NOT_FOOD` |
| 429 | `RATE_LIMITED` (with `Retry-After`) |
| 502 / 503 / 504 | `AI_BAD_OUTPUT`, `AI_UNAVAILABLE`, `AI_AUTH`, `AI_NOT_CONFIGURED`, `AI_BUSY`, `AI_TIMEOUT` |

Logs are structured JSON lines (event name, status, timing). Images, label text and user notes are never logged.

## Privacy

- Photos are sent to your configured AI provider for analysis and are not stored by this app.
- The allergy profile and scan history live in the browser's `localStorage` and are **lost if browser data is cleared** or in private browsing.
- History keeps a small thumbnail, not the original photo.
- Check your AI provider's data-retention terms before using real photos in production.

## Roadmap hooks (not implemented)

The result schema and prompt are ready for these, and nothing is faked in the meantime:

- Barcode scanning with a real product lookup (for example Open Food Facts), showing the source and warning when a record is incomplete or outdated. A database that does not list an allergen is never proof it is absent.
- Country-specific labeling rules beyond the configurable lists in `lib/allergens.js`.
- Optional cloud sync of profile and history (would need authentication and encryption).

## Troubleshooting

- **"AI analysis is not set up" banner / `AI_NOT_CONFIGURED`**: set `AI_API_KEY` and `AI_MODEL`, then restart (`npm run dev`) or redeploy on Vercel.
- **`AI_AUTH`**: the key is wrong, expired, or for a different provider than `AI_PROVIDER`.
- **`AI_UNAVAILABLE` with a 400 in the logs**: usually a model ID that does not exist or does not support images.
- **OpenAI-compatible gateway errors about `response_format`**: set `AI_OPENAI_JSON_MODE=false`.
- **`AI_TIMEOUT` / 504 on Vercel**: lower `AI_TIMEOUT_MS`, or raise the function duration your plan allows.
- **413 errors**: use smaller photos. Very large images normally get resized automatically in the browser.
- **Camera does not open**: it needs HTTPS or localhost and browser permission. The upload button always works as a fallback. iPhone HEIC photos are not supported; use "Most Compatible" in the camera settings.
- **Build fails after changing Node version**: delete `node_modules` and `.next`, then `npm install`.
- **Rate limit seems inconsistent on Vercel**: without Upstash credentials the limiter is per instance only.

## Disclaimer

AllerScan AI is an informational tool, not a medical device, and is not a substitute for professional
medical or dietary advice. Allergen labeling rules differ by country and change over time.
