# GitHub Pages setup

Repositories:

- Website: `Stephenpaul-03/maaya-website` (`website/`).
- Content: `Stephenpaul-03/maaya-content` (`content/`).

Both use the local `github-personal` SSH alias. Push content first, then website:

```sh
git -C content push -u origin main
git -C website push -u origin main
```

The local website `.env` points to the sibling content directory and its SSH origin. `.env` is not committed.

## Website repository settings

In maaya-website → Settings → Secrets and variables → Actions → Variables, set:

- `CONTENT_REPO_URL`: `https://github.com/Stephenpaul-03/maaya-content.git`
- `SITE_URL`: `https://stephenpaul-03.github.io` (optional; this is also derived automatically)
- `NEXT_PUBLIC_BASE_PATH`: `/maaya-website` (optional; also derived automatically)

The build is skipped until CONTENT_REPO_URL is set. The workflow currently fetches content without credentials, so make maaya-content public for this setup. A private content repo needs a separate read-access credential and authenticated checkout configuration before deployment.

In Settings → Pages, select **GitHub Actions** as Source. Run **Deploy visitor site to GitHub Pages** after setting variables. Expected URL: `https://stephenpaul-03.github.io/maaya-website/`.

## Content repository settings

In maaya-content, set Actions variable `WEBSITE_REPOSITORY` to `Stephenpaul-03/maaya-website`. Add Actions secret `WEBSITE_DISPATCH_TOKEN`: a fine-grained token scoped to maaya-website, with Contents read/write access. The content workflow sends a repository_dispatch event to rebuild the site. Without the secret, deploy manually from the website Actions tab. Dispatch is skipped until WEBSITE_REPOSITORY is set. Never commit the token.

`npm run build:pages` requires SITE_URL and uses NEXT_PUBLIC_BASE_PATH when provided. It generates out/ with sitemap.xml and robots.txt. The local editor is excluded from the static deployment.
