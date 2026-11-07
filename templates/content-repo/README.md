# Store content repository

Content JSON and cover assets live here independently of the website.

Automatic rebuilding is disabled until Actions variable `WEBSITE_REPOSITORY` is set to `OWNER/NEW-WEBSITE-REPO`. Add secret `WEBSITE_DISPATCH_TOKEN` scoped to that new repository to enable dispatch. Never commit credentials.

The website must configure CONTENT_REPO_URL to this repository's clone URL and CONTENT_REPO_DIR to its local sibling checkout. See the website README for editor and publishing commands.
