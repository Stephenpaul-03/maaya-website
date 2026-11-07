> Content source: the sibling **content** repository, under `../content/content/` from the website. All JSON file names below refer to that folder. This website directory contains only code, schemas and this reference. The editor saves to the sibling repo; `.cache/content/` is a generated build snapshot.

# Editing Margin’s content

All published copy and book content lives in the JSON files in this folder. React handles layout and behavior; you do not need to edit components to change titles, descriptions, labels, navigation, books, articles, reading lists, cover text, or the availability message.

Start `npm run edit:text` for general site copy, or `npm run edit:content` for the curation workspaces below. Text mode cannot modify catalog, journal, reading-list or offer JSON, nor homepage selection references or journal teaser copy. These restrictions are also enforced by the local save API. Both modes use this same content folder; stop the editor before switching commands.

For `offers.json`, the local editor's **Coupons** workspace supports adding, editing, pausing, ordering and removing offers, with desktop/mobile previews. **Save coupons** writes locally with a backup; **Publish & exit** updates the content repository. New offers start paused so unfinished promotions are not shown accidentally.

The editor's **Homepage** workspace manages `home.hero.featuredBookIds` (3 ordered books), `home.collection.featuredBookIds` (6 ordered books), `home.readingLists.featuredSlugs` (3 ordered lists), and `home.journal.featuredArticleSlug` (one journal). Each selection must exist and be unique within its section. Choosing a different journal copies its title and intro into the homepage feature's text. Mobile shows the first four collection books. Older content without collection/list selections falls back to the first six books and first three lists until saved through the workspace.

## File map

| File | What it controls |
| --- | --- |
| `site.json` | Brand name, logo accessibility label, monogram, browser metadata, navigation, footer, shared closing section |
| `home.json` | Homepage headings and descriptions, featured book IDs, featured journal article, shelf captions |
| `pages.json` | Main page headings, introductory copy, and the not-found page |
| `catalog.json` | Genres, languages, and every edition’s title, author, year, description, note, genre/language references, cover style, and cover footer |
| `reading-lists.json` | Reading-list titles, slugs, introductions, colors, and ordered book IDs |
| `journal.json` | Article slugs, titles, categories, reading times, introductions, paragraphs, artwork choice, and companion book IDs |
| `about.json` | Story paragraphs, values, and FAQ items |
| `shop.json` | Shared homepage/About contact details, social links, address, map, opening hours, courier information, and additional About story chapters |
| `ui.json` | Buttons, search prompts, accessibility labels, wishlist labels, empty states, sorting labels, notifications, and shared book/article labels |
| `offers.json` | Homepage deals, placement, layout, schedules, codes, terms, and action links |
| `inquiry.json` | WhatsApp business number, email recipient/subject, shared message template, and availability panel copy |

Each JSON file points to its schema in `schemas/`. Editors with JSON Schema support can highlight mistakes as you type. Schemas describe structure; edit the content files, not the schemas, for normal content changes.

## Shop details on the homepage and About page

Edit `shop.json` to update both pages together. The homepage shows a short introduction, practical visiting/contact details, social links, a map, and a courier summary. The About page includes those same details plus `chapters`, expanded courier details, and the existing story, values, and FAQ from `about.json`.

The initial business fields are populated with labelled demo data so the complete layout is visible: a fictional address, example opening hours, a reserved fictional phone number, an example.com inbox/social destinations, and a city-level Chennai map. These are not real shop details. Replace them before launch and clear `demoNotice` to remove the preview label. Story copy is also template copy. Clearing a business field hides its link and restores the relevant “coming soon” message.

- `contact.phone`: public number in international format, e.g. `+91 12345 67890`. Creates a phone link.
- `contact.email`: public inbox. Creates an email link.
- `contact.whatsapp`: international number, digits only. Creates a WhatsApp chat link.
- `contact.socials`: add entries like `{ "label": "Instagram", "url": "https://www.instagram.com/YOUR_HANDLE/" }`. Empty arrays show `socialPending`.
- `visit.address`: one string per address line.
- `visit.hours`: one string per opening-hours line.
- `visit.directionsUrl`: full HTTPS Google Maps share link or other directions URL.
- `visit.mapEmbedUrl`: in Google Maps, choose Share → Embed a map and copy only the `src` URL, starting `https://www.google.com/maps/embed?`. The demo uses a city query URL with `output=embed`, also supported. Do not paste the iframe HTML or a regular Maps share link. The map loads lazily in an iframe when configured.
- `courier`: edit `badge`, `title`, `summary`, and `details` to match your actual service and coverage. The detailed paragraph appears only on About.
- `chapters`: add or edit `{ "label", "title", "text" }` entries for the shop’s origins, team, and present-day story. These appear only on About; `text` supports `{brand}`.

All labels, descriptions, map accessibility text, and placeholder messages for these sections are editable in the same file. Empty phone/email/WhatsApp fields hide their links. Public shop contact fields are separate from the testing recipients in `inquiry.json`; update both files before launch. Run `npm run validate:content` after editing, then rebuild and redeploy.

## Change the WhatsApp recipient

Set `businessNumber` in `inquiry.json` to the bookshop’s WhatsApp number in international format: country code followed by the number, using digits only (no `+`, spaces, dashes, or parentheses). The current number is the owner-provided personal number for testing. Replace it with the business number before launch if needed.

With books saved, **Ask on WhatsApp** opens `https://wa.me/<businessNumber>?text=<encoded message>` with the complete wishlist prefilled. The reader reviews the message and taps Send in WhatsApp or WhatsApp Web. No message is sent automatically and no backend, API key, or WhatsApp Business API is required. WhatsApp may ask the visitor to open the app or sign in to WhatsApp Web.

An empty number disables the request action. Malformed numbers fail content validation. A syntactically valid number must also belong to an active WhatsApp account; the website cannot verify that registration.

The request always includes **all saved books still present in the catalog**. Duplicates are removed. The bookshelf is a purchase wishlist, with book details and a remove action. An empty bookshelf cannot generate a request.

## Email alongside WhatsApp

The bookshelf offers both **Ask on WhatsApp** and **Ask by email**. Email uses a standard `mailto:` link to open the visitor’s configured email app with the same complete wishlist. It does not use the Gmail-specific web compose URL. The visitor reviews the draft and sends it in their email app; an email app or browser mail handler must be configured on their device.

In `inquiry.json`, configure:

```json
"email": {
  "recipient": "availability@example.com",
  "subject": "Book availability request — {brand}"
}
```

The email address is a placeholder; replace it with the real bookshop inbox. An empty recipient disables only the email button. An empty `businessNumber` disables only WhatsApp. Both actions are disabled for an empty wishlist. The subject supports `{brand}` and `{count}`. The shared body and its book list are used by both channels. Button labels and explanatory copy remain under `ui` in the same JSON file.

## Shared message templates

`body.greeting`, `body.introduction`, and each `body.closing` entry support:

- `{brand}` — `site.json` → `brand.name`
- `{count}` — number of books in the request

`body.bookLine` also supports `{number}`, `{title}`, `{author}`, and `{languages}`. It must include `{title}`, `{author}`, and `{languages}` so the store knows which language edition is requested. Each book gets its own numbered line. Sections are separated by blank lines, and special characters are URL-encoded automatically.

The availability panel’s `ui.description` supports `{count}`. Existing templates in `ui.json` use their named placeholders, such as `{title}`, `{author}`, `{brand}`, and `{count}`. Preserve those names when editing the surrounding words. The about-page story paragraphs and FAQ answers support `{brand}`.

## Homepage deals and offers

Edit `offers.json` to control the entire offers section. The two supplied promotions are visibly labelled **SAMPLE OFFER** and have demo terms. Replace their content with your actual promotions before publishing, or set `enabled` to `false` to hide them.

### Position and layout

```json
"enabled": true,
"position": "after-collection",
"layout": "grid",
"columns": 2,
"emphasizeFirst": true,
"maxVisible": 3
```

| `position` | Location |
| --- | --- |
| `before-hero` | Below navigation, before the main hero |
| `after-hero` | After the hero, before the collection |
| `after-collection` | Between the collection and reading lists |
| `after-reading-lists` | Between reading lists and the journal feature |
| `after-journal` | Below the journal feature, before the shared closing section |

The section appears only once and only on the homepage. Choose `grid` with 1–3 `columns`, or `stack` for full-width cards. Small screens use one column. `maxVisible` accepts 1–12; active offers appear in the order of the `items` array. An empty array or no currently active offers hides the entire section without leaving a heading or gap.

The default homepage order is hero → book collection → offers → reading lists → journal → shop/contact/location/courier → footer. Practical shop information closes the page immediately before the footer. The old closing pitch and manifesto are no longer rendered (their legacy JSON fields remain for compatibility). Set `emphasizeFirst` to `true` to give the first currently active offer a stronger color and larger highlight. Set it to `false` for equal offer cards. Offer placement is still controlled by `position`.

Edit the section’s `eyebrow`, `title`, and `description` at the top level. All copy/coupon/terms labels live in `labels`.

### Individual offers

Each item has:

- `id`: unique lowercase hyphenated identifier.
- `enabled`: show/hide this offer independently.
- `badge`, `title`, `highlight`, `description`: promotional copy. Empty badge/highlight strings hide those elements.
- `theme`: `sage`, `butter`, or `clay`, with light/dark palette support.
- `code`: coupon text with a copy button. Set to `""` to omit it. If clipboard access fails, the code remains selectable.
- `terms`: expandable details; set to `""` to omit.
- `cta`: `label`, `href`, and `newTab`. Use a valid site route such as `#/collection`, `#/bookshelf`, `#/book/1`, or `#/reading-lists/a-quieter-weekend`; external destinations must be full HTTPS URLs. `newTab: true` opens a separate tab.
- `bookIds`: up to three existing catalog IDs for the decorative book covers. Use `[]` for a text-only offer.
- `startsAt` and `endsAt`: `null` for no boundary, or ISO timestamps with an explicit timezone.

Example scheduling fields:

```json
"startsAt": "2026-10-01T00:00:00+05:30",
"endsAt": "2026-11-01T00:00:00+05:30"
```

The start is inclusive and the end is exclusive. Active windows are evaluated against the visitor’s device clock; an already-open homepage refreshes them every 30 seconds and when the window regains focus. This is display scheduling, not a server-side promotion enforcement system. Publishing JSON changes still requires a rebuild and redeploy.

The showcase does not calculate prices or apply discounts automatically. Coupons can be copied and mentioned to the bookshop when enquiring. Offer links navigate to their configured destinations. Validation checks the structure, supported positions/layouts/themes, dates, duplicate IDs, catalog references, and destination links.

## Add or edit a book

1. Add an object to `catalog.json` → `books`, following an existing entry.
2. Give it a unique positive integer `id`. Keep existing IDs stable: saved books and editorial references depend on them.
3. Set `genreId` to an existing `genres[].id`. Add a genre record first if necessary. You can rename a genre’s display `label` without changing its ID.
4. Set `languageIds` to one or more IDs from `languages`, for example `["en"]` or `["en", "ta"]` for a bilingual edition.
5. Choose a cover `style`: `creative`, `coffee`, `disquiet`, `sweetgrass`, `architecture`, or `small`. These select existing CSS designs; the title, author, and footer come from the book’s JSON.
6. Use a four-digit string for `year`, for example `"2026"`.
7. Optionally add the new ID to a reading list or feature it on the homepage.

Catalog order is the default curated order. New books automatically appear in search and the collection and get an individual `/book/{id}` page. Additional cover designs require CSS development; selecting an existing design only requires JSON.

When removing a book, update any homepage, article, or reading-list references to it. Validation catches broken references. Previously saved IDs that are no longer in the catalog are excluded from the visible shelf and WhatsApp request.

## Configure book languages and editions

The `languages` array in `catalog.json` defines the available language options. Each entry has a stable language tag, a display name, its native name, and a writing direction:

```json
{
  "id": "ta",
  "label": "Tamil",
  "nativeLabel": "தமிழ்",
  "direction": "ltr"
}
```

Assign a language to a book record using:

```json
"languageIds": ["ta"]
```

- Use canonical language tags such as `en`, `ta`, `ml`, `hi`, `ar`, or `pt-BR`. IDs must be unique. New languages only require JSON changes.
- `label` is shown on cards, book previews, book pages, the bookshelf, and in WhatsApp requests. The filter also shows `nativeLabel`; both names and the language tag are searchable.
- Use `direction: "rtl"` for right-to-left languages such as Arabic. The title and cover title use the first language’s tag and writing direction; the surrounding interface stays in its configured language.
- **Separate editions need separate book records and unique book IDs.** For example, an English edition and a Tamil edition of the same work should each have their own ID and `languageIds`. This lets readers save and request both independently.
- Multiple language IDs describe **one bilingual or multilingual edition**, such as `["en", "ta"]`. They do not mean that readers are choosing between two separate editions.
- Enter native-script titles, authors, and other copy directly in UTF-8 JSON. JSON, search, display, and WhatsApp encoding preserve these characters.
- Language describes the edition being requested, not the original language in which a work was written. The existing sample titles are configured as English editions.
- English, Tamil, Malayalam, Hindi, and Arabic are starter definitions. They do not indicate stock availability. Languages with no matching books show the standard empty state.
- Collection language filters combine with genre and search; resetting filters clears all three. The WhatsApp message always includes all saved editions, along with their configured language names.
- Language-related interface copy lives in `ui.json` under `collection.languageLabel`, `collection.allLanguages`, and `book.facts.language`.

Validation rejects missing or unknown language references, duplicate IDs, invalid language tags, and unsupported writing directions.

## Featured content and editorial pages

- `home.json` → `hero.featuredBookIds` takes exactly three distinct IDs, ordered left, center, right.
- `home.json` → `journal.featuredArticleSlug` must match an article slug. Its promotional heading and description are separately editable in the same `journal` section.
- A reading list can contain any non-empty set of unique book IDs. Counts update automatically. Choose `sage`, `butter`, or `clay` for its color.
- An article needs a unique lowercase hyphenated `slug`, at least one paragraph, and a valid companion `book` ID. Choose `book`, `bookmark`, or `feather` for `artStyle`.
- Add more reading lists or articles using **New reading list** / **New journal** in the local editor, or by adding JSON entries. Their cards and detail pages are generated automatically. **Create & preview** saves locally; **Publish & exit** publishes the content updates.
- Changing a slug changes its URL. Update any matching homepage reference too.
- Navigation items can point to the supported page routes listed in `site.schema.json`. Reorder or rename these items in `site.json`.

## Wishlist

Edit the wishlist page heading in `pages.json` → `bookshelf`, and its count, empty-state, and remove labels in `ui.json` → `shelf`. Saved book IDs persist on this device. Previously saved books remain on the wishlist; legacy reading data is no longer used.

Collection sort-option `value` fields identify behavior; edit their labels without changing these identifiers.

## Formatting

Use plain text, not HTML or JSX. Rich text is not interpreted. Arrays named `lines`, `description`, or `title` in specific page sections represent authored line breaks; `paragraphs` represent separate paragraphs. Keep valid JSON syntax: double quotes, no comments, and no trailing commas.

## Validate and publish

From the project root:

```sh
npm run validate:content
npm run build
```

Validation checks required fields, field types, duplicate IDs/slugs, supported styles, message placeholders, and references between books, lists, articles, and the homepage. It runs automatically before `npm run dev` and `npm run build`.

Content is imported at build time. The dev server updates when JSON changes. For a deployed site, rebuild and redeploy the Next.js application after editing JSON. Page metadata comes from the JSON content; set SITE_URL in the server environment before building to generate canonical URLs and enable the sitemap.

## Maaya Stationery sister site

`/stationery` has its own header, footer, navigation, colours and motion within the same application. All shop copy, category cards, shopping-list sections, navigation labels, metadata and bookstore entry-card copy live in `stationery.json`. The file is validated and included in content export, pull and publishing.

Run `npm run edit` or `npm run edit:text`, choose **Maaya Stationery** in **Site preview**, then double-click text or use Fields (search `stationery`). Save uses the existing validation, revision checks and backups. Content curation mode continues to manage books, journals, reading lists and offers; stationery prose belongs in the text editor. Arrays have fixed slots for the designed sections; edit their existing entries. `\n` in selected headings creates a line break.

The shop-details card uses `shop.address`, `shop.hours`, `shop.phone`, `shop.email`, `shop.whatsapp`, `shop.directionsUrl` and `shop.mapEmbedUrl`. These start empty and display editable pending messages, independently of the bookstore demo details. Address and hours support newline-separated text. Add these values through Fields in the text editor; mapEmbedUrl accepts only a Google Maps embed URL, not iframe HTML. The page respects reduced-motion preferences.

The eight illustrated product cards are edited in `stationery.json` → `showcase`. They display in two rows of four on desktop and two columns on smaller screens. The illustrations show generic examples; the section does not publish invented prices or stock guarantees. The value explanation and supply-chain comparison share a desktop row. Individual headings, hero components, cards and shop details fade and rise on viewport entry using the same reveal animation as the bookstore. The ribbon loop and scroll animations respect reduced-motion preferences.
