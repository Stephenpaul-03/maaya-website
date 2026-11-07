# Two independent repositories

- Website: https://github.com/Stephenpaul-03/maaya-website — local `website/`.
- Content: https://github.com/Stephenpaul-03/maaya-content — local sibling `content/`.

`CONTENT_REPO_DIR=../content` in `website/.env` points at the real content repository. Its editable JSON is in `content/content/*.json`; its covers and manifest are in `content/book-covers/`. Schemas stay in the website repository. The website generates ignored build snapshots in `.cache/content/` and `public/book-covers/`.

Run the editor from `website` with `npm run edit:text` or `npm run edit:content`. Saving writes to the content repo and refreshes the preview snapshot. All editor modes use the same sibling checkout. Local backups remain in `website/.cache/editor-backups/`.

To publish content, use `npm run content:publish` or the editor's Publish & exit. It validates the content repo, fetches its origin, rejects remote divergence, rejects unrelated staged files, stages only bundle files, commits, and pushes without force. Other unstaged files stay local. To pull updates, first commit/publish your content edits, then run `npm run content:pull`. Resolve Git conflicts in the content repo directly; no automatic overwrite option exists.

Website code is pushed separately from `website/`. Build/development/test commands prepare the local content first. CI sets `CONTENT_FETCH_ON_BUILD=1` and `CONTENT_REPO_URL` to clone/fetch a clean content checkout beside the website.

The content workflow can dispatch `content-updated` to the website. Configure its `WEBSITE_DISPATCH_TOKEN` Actions secret as described in [GitHub Pages setup](github-pages.md); never put the token in JSON, source or chat. Without dispatch, run the website deployment workflow manually after content pushes.

The initial ad hoc monorepo history and migration snapshots are preserved in the workspace's `.legacy/` directory. They are outside both actual repos and are not deployment inputs.
