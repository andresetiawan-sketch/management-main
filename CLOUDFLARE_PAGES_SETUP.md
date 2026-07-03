# Cloudflare Pages — Setup Otomatis

Panduan singkat untuk mengotomatisasi deployment ke Cloudflare Pages untuk project ini.

Required GitHub secrets (set di repository Settings → Secrets):

- `CF_API_TOKEN` — API token dengan izin Pages:Edit dan Pages:Deploy
- `CF_ACCOUNT_ID` — Cloudflare account ID
- `CF_PAGES_PROJECT_NAME` — Nama project Pages yang akan dibuat/digunakan

Apa yang ditambahkan:

- `.github/workflows/deploy_pages.yml` — workflow yang membangun frontend (`frontend`) dan menggunakan `cloudflare/pages-action` untuk deploy ke Pages saat push ke `main`.
- `scripts/setup_cloudflare_pages.sh` — skrip helper untuk build lokal dan (jika `wrangler` tersedia) melakukan `wrangler pages deploy`.

Cara cepat (lokal):

1. Pastikan environment variables ter-set:

```bash
export CF_API_TOKEN=...
export CF_ACCOUNT_ID=...
export CF_PAGES_PROJECT_NAME=your-pages-name
```

2. Jalankan skrip helper (membangun dan mencoba publish via `wrangler`):

```bash
bash scripts/setup_cloudflare_pages.sh
```

Cara menggunakan CI/GitHub Actions:

1. Tambahkan secrets `CF_API_TOKEN`, `CF_ACCOUNT_ID`, dan `CF_PAGES_PROJECT_NAME` di repo Settings → Secrets.
2. Push ke branch `main` — workflow `.github/workflows/deploy_pages.yml` akan membangun `frontend` dan deploy ke Pages.

Catatan:
- Workflow mengasumsikan build output berada di `frontend/dist`. Sesuaikan `directory` di workflow jika output berbeda.
- Untuk membuat project Pages pertama kali, Anda dapat menggunakan `wrangler` secara manual atau melalui Cloudflare dashboard. Workflow akan deploy ke `projectName` yang Anda tentukan.
