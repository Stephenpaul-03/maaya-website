# Maaya Stores website

The website and content are independent Git repositories in a shared workspace:

```text
Maaya Stores/                 # workspace, not a Git repository
  website/                    # maaya-website: app, editor, schemas, build
  content/                    # maaya-content: content/*.json and book-covers/
  .legacy/                    # preserved history and migration backups; not published
```

## Set up

Clone `Stephenpaul-03/maaya-website` into `website` and `Stephenpaul-03/maaya-content` into its sibling `content` directory. In `website`, run `npm ci`, copy `.env.example` to `.env`, and set the production `SITE_URL` before deployment. The default `CONTENT_REPO_DIR=../content` can point to another directory **outside** the website repository. Use the actual credential-free origin URL in `CONTENT_REPO_URL`; locally the `github-personal` SSH alias is supported.

```sh
cd website
npm run dev          # visitor site
npm run edit:text    # edit all shop/site wording
npm run edit:content # homepage curation, journals, lists and offers
npm test
npm run build
npm run build:pages  # GitHub Pages static export
```

The commands prepare content automatically. `npm run content:prepare` validates the sibling repository and generates ignored `.cache/content/*.json` imports and `public/book-covers/` assets. These are disposable build outputs, never editable source. No website seed JSON or cover images are tracked. Schemas and the content rendering code stay in `src/content/`.

## Editing and publishing

The local editor reads and saves JSON **directly in `../content/content/`**, with revision checks and backups under `website/.cache/editor-backups/`. Saving regenerates the website snapshot for live preview. Direct JSON edits are supported too; run `npm run content:prepare` afterward or restart dev. `npm run covers:sync` writes downloaded covers into the content repo, then refreshes generated assets.

- `npm run content:pull`: pull the actual content repo and regenerate; refuses to overwrite uncommitted content edits.
- `npm run content:publish`: validate, commit bundle files and push the actual content repo. Unrelated staged files and remote divergence are rejected.
- `npm run content:export`: export a reviewed bundle without pushing.
- Website code is committed/pushed separately from `website/` with ordinary Git commands.

There is no nested `.cache/content-repo`, sync-state pairing, or `--accept-remote` overwrite mode. Ordinary Git history in each repository is the source of truth. Do not add credentials to JSON, remote URLs or `NEXT_PUBLIC_*` variables. `.env`, backups and generated files are ignored.

For offline work, leave `CONTENT_FETCH_ON_BUILD=0`. CI sets it to `1`, clones/fetches the configured content repo and requires a clean fast-forward before generating the website. The repositories are connected to maaya-website and maaya-content; private content needs appropriate CI authentication.

See [content field reference](src/content/README.md), [publishing](docs/content-publishing.md) and [GitHub Pages deployment](docs/github-pages.md).
