# TradeWheels: Detailed Code Explanation

This is a companion document to the main [README](https://github.com/Mahd-M/TradeWheels), going deeper into how TradeWheels is actually built: the database schema, the reasoning behind specific decisions, and the trade-offs I made along the way.

I wrote this mainly for other students or developers who want to see how a real, non-tutorial-sized feature gets built end to end, from the database up through the API and into the UI. If you just want a quick overview of what the app does, the [main README](https://github.com/Mahd-M/TradeWheels#readme) covers that. This document assumes you've already looked at it and want to go further.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Core Architecture Decisions](#core-architecture-decisions)
- [Feature: Authentication & Authorization](#feature-authentication--authorization)
- [Feature: Car Listings](#feature-car-listings-crud-search-filtering-pagination)
- [Feature: Car Photos](#feature-car-photos-upload--multi-photo-galleries)
- [Feature: Favourites](#feature-favourites)
- [Feature: Comments & Replies](#feature-comments--replies)
- [Feature: Real-Time Messaging](#feature-real-time-messaging)
- [Feature: Message Requests & User Blocking](#feature-message-requests-one-shot-first-contact--user-blocking)
- [Feature: Recommendation Engine](#feature-recommendation-engine)
- [Feature: My Cars](#feature-my-cars)
- [Shared UI Infrastructure](#shared-ui-infrastructure)
- [Environment Variables](#environment-variables)
- [Setup & Troubleshooting Notes](#setup--troubleshooting-notes)
- [Known Limitations & Trade-offs](#known-limitations--trade-offs)
- [Update Log](#update-log)

---

## Project Structure

```
tradewheels/
├── backend/
│   ├── db.js                    (connection pool, created once and reused everywhere)
│   ├── auth.js                  (bcrypt/JWT helper functions: hashPassword, signToken, etc.)
│   ├── middleware.js            (requireAuth, requireAdmin, requireOwnerOrAdmin, and related checks)
│   ├── upload.js                (multer config and a shared deleteUploadedFile helper)
│   ├── server.js                (app wiring, CORS, Socket.io bootstrap, route mounting)
│   ├── createAdmin.js           (terminal script; the only way I can create an admin account)
│   ├── deleteAdmin.js           (terminal script)
│   ├── personas.js              (shared persona definitions used by both seed scripts below)
│   ├── seedNewCars.js           (bulk-generates ~3,000 realistic listings)
│   ├── seedFavourites.js        (persona-aware seed data)
│   ├── seedCarViews.js          (persona-aware seed data)
│   ├── .env
│   ├── routes/
│   │   ├── auth.js              (register, login, logout, me)
│   │   ├── cars.js              (list, single, create, update, delete)
│   │   ├── recommendations.js   (featured, trending, for-you, recently-viewed-similar, similar, view)
│   │   ├── favourites.js
│   │   ├── comments.js
│   │   ├── conversations.js     (includes accept, decline, block, unblock)
│   │   ├── admin.js
│   │   └── uploads.js
│   ├── sockets/
│   │   └── index.js             (Socket.io auth and event-handler logic)
│   ├── utils/
│   │   └── carQuery.js          (shared buildCarFilters + hover-image SQL fragments)
│   ├── uploads/                 (multer's disk storage target, created automatically on boot)
│   └── test/
│       └── db.test.js
├── src/
│   ├── hooks/
│   │   └── useDebounce.js
│   ├── constants/
│   │   └── api.js                (API_URL / SOCKET_URL, derived from window.location.hostname)
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   ├── FavouritesContext.jsx
│   │   ├── ListingsFilterContext.jsx
│   │   ├── MessagesContext.jsx
│   │   ├── SocketContext.jsx
│   │   └── ConfirmContext.jsx
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── CarForm.jsx
│   │   ├── SearchBar.jsx
│   │   ├── FilterBar.jsx
│   │   ├── FeaturedCars.jsx
│   │   ├── HomeForYou.jsx
│   │   ├── BecauseYouLooked.jsx
│   │   ├── PickedForYou.jsx
│   │   ├── SimilarCars.jsx
│   │   ├── CarCarousel.jsx
│   │   ├── CarCard.jsx
│   │   ├── CarImageGallery.jsx
│   │   ├── ImageUploadField.jsx
│   │   ├── FilteredCars.jsx
│   │   ├── MyCars.jsx
│   │   ├── Comments.jsx
│   │   ├── AddNewCity.jsx
│   │   ├── AdminCarsTable.jsx
│   │   ├── AdminReportsTable.jsx
│   │   ├── Pagination.jsx
│   │   └── FormField.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Listings.jsx
│   │   ├── CarDetails.jsx
│   │   ├── SellCar.jsx
│   │   ├── EditCar.jsx
│   │   ├── Favourites.jsx
│   │   ├── MyCars.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Messages.jsx
│   │   ├── Conversation.jsx
│   │   ├── AdminDashboard.jsx
│   │   └── PageNotFound.jsx
│   ├── index.css                (Tailwind, plus the carousel's fade-in keyframe)
│   ├── main.jsx
│   └── App.jsx
```

I have two pairs of files in this project that intentionally share a name: `backend/auth.js` (the bcrypt/JWT helper functions) is different from `backend/routes/auth.js` (the HTTP routes), and `src/pages/MyCars.jsx` (a thin page wrapper) is different from `src/components/MyCars.jsx` (the actual grid). The routes file requires the helper file directly, and the page renders the component.

## Core Architecture Decisions

* **I define `createBrowserRouter([...])` at module scope in `App.jsx`, outside the `App` component.** Building the router config inside `App` would recreate the router object on every re-render, which React Router explicitly warns against. This is actually the reason I reach for Context for `Auth`, `Favourites`, `Messages`, and `Sockets` state instead of prop-drilling: the router can't receive live props from `App`'s own state, so any page has to reach shared data on its own.
* **My providers nest outside in: `ConfirmProvider` → `AuthProvider` → `SocketProvider` → `MessagesProvider` → `FavouritesProvider` → `RouterProvider`.** Each inner provider can depend on anything wrapping it, never the reverse. `SocketProvider` needs `useAuth()` to know when to connect or disconnect. `MessagesProvider` needs both the socket and the authenticated user. `FavouritesContext` needs `useAuth()` because favourites are scoped per user. `ConfirmProvider` sits outermost since it depends on nothing else.
* **Every filter setter in `ListingsFilterContext` resets pagination to page 1 in the same state update that changes the filter.** React batches both into one re-render, so a filter change never fires a request for the old page number against the new filter first.
* **I centralized the hover-image `OUTER APPLY` pattern in `utils/carQuery.js` instead of repeating it per route.** Any route returning `Cars.*` for card display (`/api/cars`, `/featured`, `/trending`, `/similar`, `/for-you`, `/favourites`, and so on) splices in the same `HOVER_IMAGE_JOIN`/`HOVER_IMAGE_SELECT` fragment, so "what does a car's hover photo mean" is defined once instead of drifting per route.
* **Route-mount order matters in exactly one place.** I mount `recommendations.js` (which owns single-segment paths under `/api/cars`: `/featured`, `/trending`, `/for-you`, `/recently-viewed-similar`) before `cars.js` (which owns `/api/cars/:id`) in `server.js`. Express matches routes top to bottom with no concept of "more specific wins," so mounting them the other way would cause `GET /api/cars/featured` to be swallowed by `:id` trying, and failing, to bind `"featured"` as an integer.
* **`routes/conversations.js` reaches the Socket.io `io` instance through `req.app.get('io')`, never a direct import.** I create `io` in `server.js`. Importing it directly from a routes file would create a require cycle (`server.js` imports the routes file, which would import `server.js` back). `app.set('io', io)` in `server.js`, followed by `req.app.get('io')` in the route handler, is the standard way around that in Express, since `req.app` always points at the top-level app instance even from inside a mounted router.
* **`server.js` wraps Express in a raw `http.createServer(app)` instead of calling `app.listen()` directly.** `app.listen()` was always shorthand for exactly this; it just never exposed the underlying server object, and Socket.io needs that object directly to intercept the WebSocket upgrade handshake, which only the raw `http.Server` emits.

## Feature: Authentication & Authorization

**Architecture: a single JWT, 7-day expiry, stored only in an httpOnly cookie.** I skipped an access/refresh-token split and any in-memory token, which keeps the system simpler than a two-token setup at the cost of one real trade-off: there's no way to shorten a compromised token's blast radius or revoke a single session early, short of rotating `JWT_SECRET`, which logs everyone out at once.

**Schema.** `Users` (`id, name, email UNIQUE, passwordHash, role 'user'|'admin', createdAt`). `Cars.ownerId` is a nullable FK to `Users(id)` with `ON DELETE SET NULL`, so deleting a user's account unlinks their listings rather than deleting the listings themselves. `Favourites` uses a composite `UNIQUE(userId, carId)` so more than one user can favourite the same car.

**Password and token helpers (`auth.js`).** I use `bcryptjs` for `hashPassword`/`comparePassword` (a pure-JS implementation, chosen over the native `bcrypt` package to avoid native-module build issues on Windows) at cost factor 10; the salt is baked into the hash string itself, so I don't need a separate salt column. `signToken`/`verifyToken` wrap `jsonwebtoken`. A JWT is signed, not encrypted, so its payload is plainly readable by anyone; only the signature is protected by `JWT_SECRET`. `verifyToken` throws on a bad signature or expired token, so every caller wraps it in `try/catch`.

**Middleware (`middleware.js`) built by composition.** `requireAuth` is a plain `(req, res, next)` function, which is what makes it Express middleware. `requireAdmin` composes `requireAuth` by calling it directly and passing its own logic in as the `next` callback, instead of chaining two separate middlewares on the route. `requireOwnerOrAdmin` follows the same pattern for `Cars.ownerId`, `requireCommentOwnerOrAdmin`/`requireCommentOwner` follow it for `Comments.userId`, and `requireConversationParticipant` follows it for `Conversations.user1Id`/`user2Id`. I use one composition pattern for every ownership check in the app. `attachUserIfPresent` decodes the cookie if one exists but never blocks the request either way, which I use on routes that are public but still want to know who's asking, such as comment listing and view tracking.

**Routes (`routes/auth.js`).** `POST /register` hardcodes `role` to `'user'` server-side and never reads it from `req.body`, which prevents self-granted admin access through a crafted request. `POST /login` returns an identical error message and status for "no such user" and "wrong password," so the login form can't be used to enumerate valid emails. `GET /me` re-reads the user from the database rather than trusting only the token payload, so a demoted or deleted user isn't still treated as trusted just because their token hasn't expired yet. I create the one admin account in the system through a standalone script, `createAdmin.js`, since the register route can never produce one itself.

**CORS for credentials.** `cors({ origin: allowedOrigins, credentials: true })` is required because a credentialed cross-origin request is rejected by the browser unless the origin is named explicitly (never `*`) and `Access-Control-Allow-Credentials: true` is present in the response. Three separate gates all have to pass for the cookie to actually work: `SameSite` (whether the browser is willing to attach it at all), this CORS config (whether the browser lets JS see or send it cross-origin), and `credentials: 'include'` on the client's `fetch` call (whether the frontend is actually asking for it to be sent).

**Frontend.** `AuthContext` follows the same shape as my other contexts (`createContext` plus a Provider plus a `useX` hook), but it also carries a `loading` flag that most of the others don't need. `user === null` is ambiguous between "not logged in" and "haven't checked yet," and that distinction matters for both `ProtectedRoute` and `Navbar`; without it, a logged-in user would briefly flash "Login" before switching to "Logout" on every refresh. `ProtectedRoute` checks, in order: `loading` first, then `!user` (redirecting to `/login` with `replace` and `state={{ from: location }}` so the user lands back where they started after logging in), then `adminOnly && !isAdmin` (redirecting to `/`, not `/login`, since "logged in but not allowed" is a different situation from "not logged in at all").

**Ownership is enforced in two places.** `CarDetails.jsx` computes `canManage = user && (isAdmin || user.id === car.ownerId)` to decide whether the Edit/Delete buttons render at all, but that's a UI convenience only. The actual enforcement is `requireOwnerOrAdmin` on the backend, which runs independently of what the frontend shows or hides.

**Current limitations:**
- No rate limiting on login or register, so brute-force guessing is currently unmitigated.
- A small, accepted race condition on near-simultaneous duplicate registrations: two requests could both pass the "does this email exist" check before either one inserts.
- `COOKIE_NAME` is read from `process.env` in `auth.js` before that same file's own `require('dotenv').config()` call runs a few lines later. This works today because `server.js` already calls `dotenv.config()` earlier in the process, but it's a fragile ordering dependency if this file were ever required standalone.

## Feature: Car Listings (CRUD, Search, Filtering, Pagination)

My catalog currently holds roughly 3,000 cars: 23 hand-entered originals plus about 3,000 bulk-generated by `seedNewCars.js`. I weighted the generation by segment (30% hatchback, 35% sedan, 20% SUV, 10% pickup/van, 5% luxury/exotic) so that exotic cars stay a genuine minority in the catalog, which matters for the recommendation demos: "click a Civic, see more sedans" is a weak signal if exotic cars are as common as Corollas.

**Filtering, search, sorting, and pagination all run server-side.** `GET /api/cars` accepts `page`, `pageSize`, `search`, `city`, `bodyType`, `transmission`, and `sort` as query params, and returns `{ cars, totalCount, totalPages, currentPage }` instead of a raw array. I built a shared `buildCarFilters(request, query)` helper in `utils/carQuery.js` that builds the `WHERE` clause once, and I call it separately for the count query and the data query so `totalPages` always agrees with the actual rows returned. This wasn't how I originally built it. I started out fetching the entire table and filtering, sorting, and paginating it client-side, which stopped being workable once the catalog scaled past a few thousand rows (see the Update Log). Default page size is 12 on the public Listings page and 20 in Admin.

**Search matches token by token.** I trim the submitted search string, split it on whitespace, and check each token with `OR` across `make`, `model`, and `city`, while `AND`ing the tokens themselves together:
```sql
WHERE (make LIKE '%toyota%' OR model LIKE '%toyota%' OR city LIKE '%toyota%')
  AND (make LIKE '%corolla%' OR model LIKE '%corolla%' OR city LIKE '%corolla%')
```
This is what lets `"Toyota Corolla"` match a row where `make = 'Toyota'` and `model = 'Corolla'` are two different fields on the same row. A single whole-string `LIKE` never would.

**Ordering is deterministic.** SQL Server's `OFFSET/FETCH` requires a stable `ORDER BY` to produce non-overlapping pages. My default is `ORDER BY Cars.createdAt DESC`, so a freshly posted car (timestamped `GETDATE()` at insert time) sorts to page 1 as a side effect of the recency default, not because of any special-case logic. `sort=low`/`sort=high` switch to `price ASC`/`DESC` instead.

**Pagination survives a refresh.** I derive `currentPage` in `ListingsFilterContext` directly from the URL's own `?page=` query param through `useSearchParams`, instead of keeping it in separate component state. There's only one place this number lives, so refreshing deep in results (page 220, for example) no longer bounces back to page 1. `goToPage` writes to the URL with `replace: true` so paging through results doesn't spam browser history. I gave `AdminCarsTable.jsx` the same approach for the same reason.

**Numeric validation and the fraud declaration (`CarForm.jsx`, shared by `SellCar` and `EditCar`).** I coerce Year, Price, and Mileage with `Number(...)` and check for `NaN` first. After that, order matters: `Year <= 0` gets a plain error, while `Year < 1885` but still positive gets a distinct message referencing Karl Benz's 1886 Patent-Motorwagen, since checking `<= 0` first means only a genuinely implausible year triggers that message. `Year > currentYear` is rejected, where `currentYear` is computed at submit time rather than hardcoded. `Price <= 0` is rejected. `Mileage < 0` is rejected, but `Mileage === 0` is explicitly allowed, since a brand-new, zero-kilometre car is a real listing. Once validation passes, I gate submission behind a confirmation modal in which the seller declares the listing's specifications true and accurate, naming the consequences of fraud (listing removal, ban, reserved legal rights) before the real submit call ever fires. Since `CarForm` backs both the create and edit flows, this same gate appears on both.

**Current limitations:**
- The `LIKE '%token%'` search pattern can't use an index because of the leading wildcard, so it's always a full-table scan. This is fine at my current catalog size; Full-Text Search (`CONTAINS`/`FREETEXT`) would be the natural next step at a much larger scale.
- I have indexes on `bodyType`, `city`, `transmission`, `createdAt`, and `price` to support filtering and sorting, but none of them help the search clauses above, for the reason just described.

## Feature: Car Photos (Upload & Multi-Photo Galleries)

Photos originally worked as a pasted image URL and nothing else. The current system supports real device uploads and a full per-car photo gallery.

**Upload (`backend/upload.js`, `POST /api/upload`).** I configured `multer` with disk storage (`backend/uploads/`, created automatically on server start), a `fileFilter` restricting uploads to JPG/PNG/WEBP/GIF by MIME type, and a 5MB size limit. I call `upload.single('image')` as a plain function inside the route handler rather than as route-level middleware, which lets multer's own errors (wrong type, file too large) get caught and returned in the same `{ error: ... }` JSON shape every other route uses. I build the served URL from `req.protocol` and `req.get('host')` at request time, so it automatically resolves to whichever origin the request actually arrived on, including a phone on the same local network, with no hardcoded host.

**Schema.** `CarImages` (`id, carId, imageUrl, sortOrder`), `ON DELETE CASCADE`, since a gallery row is meaningless without its car. `Cars.image` still exists and I keep it in sync as the cover photo (`sortOrder = 0`), so every existing consumer of `Cars.image`, such as `CarCard` and `AdminCarsTable`, needed no changes when I introduced this table.

**Cleanup is a real filesystem operation, not just a database delete.** SQL Server has no idea the filesystem exists, so every delete path that removes an image also has to explicitly delete the file:
- `DELETE /api/cars/:id` fetches every `CarImages` URL before the row delete, since the cascade wipes the database rows but I'd otherwise lose the ability to find the actual files afterward.
- `PUT /api/cars/:id` diffs the submitted image list against what's currently stored and only deletes files that were genuinely dropped, so re-submitting the same set in a different order (after picking a new cover, for example) deletes nothing.
- `DELETE /api/upload` fires the instant a photo is removed from the picker, before the listing is even submitted, closing the original gap where browsing multiple file selections silently orphaned every discarded preview.
- `deleteUploadedFile()` in `upload.js` is shared by all three call sites and never rejects. I treat a missing file as a no-op rather than a failure, so a stale cleanup call never blocks a car delete or edit from completing.

**Frontend (`ImageUploadField.jsx`).** It manages an array rather than a single string: a multi-select file input, a thumbnail grid with per-photo remove and "Make Cover" controls (which promotes any photo to position 0), and the original paste-a-URL fallback, with both modes appending into the same list. On file select, the image uploads immediately as its own request, and only once the server confirms does the parent form's image list actually update. An in-flight upload shows a local preview through `URL.createObjectURL`, but that `blob:` URL is never what gets submitted, since it's only valid inside the tab that created it. I disable Submit on `CarForm` while any upload is in progress, mainly to stop a stale photo being submitted during an edit, where the old image URL is already non-empty and wouldn't otherwise trip the "fill in all fields" check.

**Card-grid hover swap.** I built a shared `HOVER_IMAGE_JOIN`/`HOVER_IMAGE_SELECT` SQL fragment in `utils/carQuery.js` (an `OUTER APPLY` that picks the second-lowest-`sortOrder` `CarImages` row) and splice it into every route returning `Cars.*` for card display. A car with only one photo gets `hoverImage: null`, and `CarCard.jsx` treats that as no swap for that card. `CarCard` stacks two `<img>` elements with a `group-hover:opacity` crossfade rather than swapping `src` directly, which avoids a load flash on hover.

**Gallery (`CarImageGallery.jsx`).** This replaces the old single static hero image on `CarDetails.jsx` with a main image, prev/next arrows, and a clickable thumbnail strip, using the same modulo-wrap navigation as `CarCarousel.jsx`. I mount it with `key={car.id}` rather than resetting it through an effect, since clicking through to a different car from `SimilarCars`/`PickedForYou` re-renders `CarDetails` without unmounting it, so the `key` forces a fresh instance and the active photo index resets to 0 automatically. The gallery's outer frame uses a fixed height per breakpoint rather than a height derived from whichever photo happens to be active, letterboxing every photo (through `object-contain`) inside the same frame regardless of its own aspect ratio. This fixed a real bug I ran into: without a fixed frame, a portrait photo next to a landscape one visibly resized the whole box on every click, and the prev/next arrows, positioned relative to that same box, jumped along with it.

**Current limitations:**
- Abandoning the form after uploading photos but before submitting still orphans those files on disk. Only an explicit "remove this thumbnail" click triggers cleanup, and I don't have a background job that reaps files nobody finished submitting.
- No image resizing or compression. The original file, up to 5MB, is stored and served as-is.
- No malware or content scanning on uploads.
- No drag-to-reorder. "Make Cover" is the only reordering control.
- `PUT /api/cars/:id` deletes and re-inserts the entire `CarImages` row set on every edit, even if the photo list didn't actually change. This is simple and correct at my current scale of a handful of photos per car.
- Cars I seeded or bulk-inserted directly through SQL rather than through the app only ever got exactly one `CarImages` row from the original backfill migration, so they won't show a hover-swap photo until re-saved through the multi-photo form. I ran a one-time script to backfill a placeholder second photo per car purely to validate the hover mechanism at full catalog scale; those placeholder rows are tagged with a distinctive URL pattern so I can cleanly remove them once real second photos exist.

## Feature: Favourites

**Schema.** `Favourites` (`userId, carId`), both FKs `ON DELETE CASCADE`, with a composite `UNIQUE(userId, carId)` constraint. I rebuilt this table from an earlier version whose single-column `UNIQUE carId` made it impossible for more than one user to ever favourite the same car.

**Scoped by user on every route.** Every `Favourites` route filters `WHERE userId = @userId`. This matters most on the `DELETE` route: without that filter, any logged-in user could delete another user's favourite just by knowing a car's id.

**Frontend.** `FavouritesContext` follows `AuthContext`'s shape and depends on it directly: it waits on `authLoading` before doing anything, fetches only if `user` exists, and explicitly resets to an empty array on logout, which prevents one user's leftover favourites flashing for the next person to use the same browser. `toggleFavourite` updates optimistically, and I don't currently roll it back if the underlying request fails.

**No restriction on favouriting your own listing.** A user can favourite a car they own, the same as anyone else's; I don't special-case ownership in `favourites.js`.

## Feature: Comments & Replies

I built this on the same ownership pattern as the rest of the app, applied to a new resource. Users can comment on a listing, reply one level deep to another comment, edit their own comments (marked "(edited)," with no history kept), and delete their own comments. Admins can delete or moderate any comment. Any logged-in user other than a comment's author can report it, and can withdraw that report later. Reports don't hide anything automatically; they surface the comment in a "Reported Comments" panel on `AdminDashboard`, where an admin can delete the comment or dismiss the report without deleting it.

**Schema.** `Comments` (`id, carId, userId, parentId, content, isEdited, isDeleted, createdAt, updatedAt`) and `CommentReports` (`id, commentId, reportedBy, reason, createdAt`), with a composite `UNIQUE(commentId, reportedBy)` so one user can't report the same comment twice. `parentId` self-references `Comments.id`; `NULL` means top-level, and a non-null value means a reply. I capped replies at one level by design, so a reply's `parentId` always points to a genuine top-level comment and never to another reply, which keeps the delete logic to one shape instead of an arbitrary-depth chain.

**Two SQL Server "multiple cascade paths" errors (Msg 1785), fixed two different ways.** First, `CommentReports.reportedBy → Users` cascading alongside `Comments.userId → Users → CommentReports.commentId` created two independent delete paths from `Users` converging on `CommentReports`. I fixed this by setting `reportedBy` to `ON DELETE NO ACTION`, meaning a user with filed reports can't be deleted until those rows are cleared, which currently isn't an issue since I don't have a user-delete route. Second, and more fundamentally, `Comments.parentId` self-referencing its own table can never be `CASCADE` at all. SQL Server refuses `CASCADE` on any self-referencing FK, since it can't guarantee a recursive delete chain terminates safely. That constraint is the real reason for the soft-delete logic below.

**Delete is soft or hard, decided by reply count.** Since the database blocks a hard delete on a comment that still has replies, my delete route checks reply count first: it soft-deletes (`isDeleted = 1`, content replaced with "[deleted]") if replies exist, and hard-deletes otherwise. Orphaned replies never happen as a result, and a soft-deleted comment with no remaining replies becomes eligible for a real delete on a second click.

**Middleware.** `requireCommentOwnerOrAdmin` mirrors `requireOwnerOrAdmin`, checking `Comments.userId`. Editing has its own, stricter `requireCommentOwner` with no admin override, since silently rewriting what someone else said is a different kind of action than removing it. `attachUserIfPresent` lets the public comment-listing route know who's asking, so it can correctly flag `reportedByMe` per comment for a logged-in visitor without requiring login just to read comments.

**Routes.** `GET /:carId/comments` (public, paginated, returns top-level comments with replies nested and a `reportedByMe` flag), `POST /:carId/comments` (a comment, or a reply if `parentId` is present; I enforce one-level nesting server-side regardless of what the client sends), `PUT /comments/:id` (owner-only edit), `DELETE /comments/:id` (soft or hard, per the rule above), `POST`/`DELETE /comments/:id/report` (file or withdraw a report; self-reporting is blocked server-side), and two admin-only routes, `GET /admin/reports` and `DELETE /admin/reports/:commentId` for dismissing a report without deleting the comment.

**Current limitations:**
- Replies are capped at one level; replying to a reply attaches to its parent instead.
- A soft-deleted top-level comment can linger as an empty "[deleted]" placeholder if its replies are removed one at a time afterward.
- Replies aren't paginated, so a heavily replied comment renders all of its replies on the page. Top-level comments are paginated at 5 per page.
- Edit has no history. I only store the latest version, and "(edited)" signals a change happened, not what changed.
- Edit is owner-only with no admin override, unlike delete.

## Feature: Real-Time Messaging

This is one-to-one chat between two users, entered from a car listing's "Message Seller" button and continued afterward from a general inbox, mirroring how PakWheels ties a chat to a specific ad. Unlike the rest of the app, messages don't wait for a page load or a manual refresh. I push them live through Socket.io in both directions, to whichever page the recipient happens to be on. An unread-count badge on the Navbar's Messages link works the same way the Favourites badge does.

**Schema.** `Conversations` (`id, user1Id, user2Id, carId, status, autoAccepted, createdAt`) and `Messages` (`id, conversationId, senderId, content, isRead, createdAt`). `carId` is nullable, recording which listing a conversation started from for inbox context, but a conversation isn't required to be tied to one. A `CHECK (user1Id <> user2Id)` constraint blocks a user from messaging themselves at the database level.

**Cascade paths.** Both of `Conversations`' foreign keys to `Users` (`user1Id`, `user2Id`) are `ON DELETE NO ACTION`, since two FKs from the same table both cascading to the same parent hits the same Msg 1785 condition I described in the Comments section above. `carId → Cars` is `ON DELETE SET NULL`, since deleting a listing shouldn't destroy the conversation history two people already had about it, only its context. `Messages.conversationId → Conversations` is `CASCADE`, and `Messages.senderId → Users` is `NO ACTION`.

**Socket authentication and rooms.** I wrote an `io.use(...)` middleware, shaped like `(socket, next)` instead of Express's `(req, res, next)`, that reads the same httpOnly `token` cookie off the handshake headers and verifies it with my existing `verifyToken`, functioning as `requireAuth`'s equivalent for sockets. Every authenticated socket joins a personal `user:{id}` room on connect, which I use for inbox-level pushes regardless of what page someone's on. A separate `conversation:{id}` room is joined only while that chat window is open, through a client-emitted `join_conversation` event that re-verifies participant status against the database server-side rather than trusting whatever id the client sends.

**REST routes (`routes/conversations.js`).** `GET /conversations` returns the inbox list, with each row including a computed `unreadCount`, the other participant's name, optional car context, and the most recent message. `GET /conversations/:id/messages` returns paginated history and is participant-gated. `POST /conversations` is a find-or-create call that checks both id orderings so re-messaging the same seller lands back in the same thread. `PUT /conversations/:id/read` marks the other participant's messages as read.

**Socket events.** `join_conversation`/`leave_conversation` manage room membership. `send_message` does the real work: it re-validates that the sender is an actual participant, inserts the message, and then broadcasts twice, once to the conversation room for anyone else currently viewing that thread, and once to the recipient's personal room as a separate `inbox_update` event. I deliberately exclude the sender's own socket from that broadcast; the sender instead gets their confirmed message back through an acknowledgement callback, which avoids needing to de-duplicate a message that would otherwise arrive twice. Because `inbox_update` only reaches the recipient by this design, the sender's own inbox preview updates through a separate function, `updateConversationPreview`, called directly from the sender's own send acknowledgement.

**Frontend.** `SocketContext` and `MessagesContext` follow the same shape as `AuthContext`/`FavouritesContext`, connecting once `user` resolves and resetting on logout. I track which conversation is currently open in `MessagesContext` with a `useRef` rather than `useState`, so the `inbox_update` listener always reads the live value at call time instead of a value frozen when the effect last ran. `setActiveConversationId` and `markConversationRead` are wrapped in `useCallback` for the same reason, since without stable identity, both being effect dependencies in `Conversation.jsx` produced an infinite render loop once ESLint's exhaustive-deps rule flagged them as missing. `Messages.jsx` is the inbox, `Conversation.jsx` is the chat window (REST for history and pagination, sockets for live send/receive), and a "Message Seller" button on `CarDetails.jsx` reuses the same post-login redirect-back mechanism as `ProtectedRoute`.

**Current limitations:**
- No message editing or deletion once sent.
- No typing indicators. Read state is a single `isRead` flag per message, which is sufficient for one-on-one chat but would need a per-user "last read" table for group chat.
- No offline queue or automatic retry. If the socket is disconnected when Send is clicked, the message doesn't go through, and this is surfaced only as an immediate error.
- No rate limiting on `send_message`.
- The inbox list updates a conversation's preview text and unread badge live, but doesn't re-sort its position until the next full fetch.
- A small duplicate-row race is possible on `POST /conversations`: two near-simultaneous first messages between the same pair could each pass the "does this exist" check before either inserts.

## Feature: Message Requests, One-Shot First Contact & User Blocking

I layered this directly on top of the messaging system above, not as a parallel one. The first message from someone you haven't talked to before arrives as a request rather than an open thread, and the recipient has to accept it before replying, similar to how Instagram or LinkedIn gate first contact from a stranger.

**I didn't need a new table to know who started a conversation.** `Conversations.user1Id` was already, implicitly, "whoever initiated," since `POST /conversations` always writes `req.user.id` into `user1Id`, and the find-or-create lookup never re-orders it on a later message. A single `status` column (`'pending' | 'accepted' | 'declined'`, defaulting to `'pending'`, with existing rows backfilled to `'accepted'` at migration time) was enough to build the first version of this feature on top of that existing fact.

**Enforcement happens in three places.**
1. The `send_message` socket handler is the real gate. It re-fetches status from the database on every send rather than trusting a client-held value. While a conversation is pending, the recipient is blocked entirely, and the initiator is capped at exactly one message; a second attempt is rejected until the recipient decides. A declined thread blocks both sides permanently. I don't need a `senderId` filter for the one-message cap, since the recipient is already fully blocked while pending, so any message already present in a still-pending conversation can only belong to the initiator.
2. `Conversation.jsx` hides the input unless `canSend` is true, which is a UI convenience only.
3. `join_conversation` is deliberately not gated on status, so both participants can still see messages live while a request is pending. Only sending is blocked for the recipient, so they can evaluate what they're about to accept or decline rather than deciding blind.

**Status changes push live.** Accepting or declining fires a normal `PUT` request, and the route emits a `conversation_status_changed` event directly into the initiator's personal room, so their "waiting for them to accept" note disappears without a refresh.

**One conversation per pair, per car, not one per pair overall.** My find-or-create query originally matched only on `(user1Id, user2Id)`, so messaging the same seller about a different car silently reused the first thread ever started. I fixed this by fetching every conversation between the pair and checking, in order: if a thread for this specific car already exists, reopen it regardless of status; if no thread exists for this car but any other conversation between the pair is declined, block creation with a 403; otherwise, insert a fresh pending row. A decline reads as "I don't want to talk to this person," not "about this one car," so the block applies across all of a pair's conversations rather than being tied to a specific listing.

**Blocking is a standing, pair-level relationship, independent of any one conversation or car.** I added a new table, `UserBlocks` (`id, blockerId, blockedId, createdAt`), with a composite `UNIQUE(blockerId, blockedId)` and both FKs `ON DELETE NO ACTION`. Declining a still-pending request also writes a `UserBlocks` row, since decline and block are the same underlying action to me, reachable either from the one-time Accept/Decline banner on first contact or a persistent Block/Unblock button in the conversation header. `send_message` checks `UserBlocks` first on every send, independent of any one conversation's own status, so a block placed from one thread instantly stops sending in every thread with that person. Only the person who placed a block can lift it, and unblocking also heals any of that pair's declined conversations back to accepted.

**A returning, already-accepted pair skips the pending flow entirely.** `Conversations.autoAccepted` (`BIT NOT NULL DEFAULT 0`) tags a conversation that was auto-accepted because the pair already has an accepted thread elsewhere. `POST /conversations` checks for this before creating a row for a new car.

**Frontend.** `Conversation.jsx`'s `canSend = status === 'accepted' || (status === 'pending' && isInitiator && messages.length === 0)`. I reuse the same `ConfirmContext` modal used for logout and delete to warn the initiator, before that one allowed message sends, that they won't get a follow-up until accepted. `CarDetails.jsx`'s "Message Seller" flow distinguishes who is blocked on a 403: the person who placed the block gets an "Unblock and retry" option, and the person who was blocked gets a plain, final notice. A `user_block_changed` socket event keeps both sides' UI in sync on block or unblock.

**Current limitations:**
- Decline is terminal. A declined thread stays declined unless explicitly unblocked.
- No dedicated "Requests" inbox tab. Pending and declined states are inline badges on the existing conversation list.
- No UI on the inbox list itself surfaces block state.
- The one-shot limit caps the number of sends to one, not the message's length.
- No `UNIQUE` constraint enforces "one conversation per pair per car," since a composite index can't cleanly express that regardless of which column holds which user id, so a genuine near-simultaneous double-click race is still theoretically possible.

## Feature: Recommendation Engine

I built four distinct recommendation techniques that exist side by side in this app. None of them are machine learning; there's no training and no model weights, only deterministic scoring logic I wrote directly in SQL. Content-based and popularity-based filtering are legitimate, standard categories of recommendation system used in real production systems, but they don't learn from data the way a trained model would.

| Route | Technique | Category |
|---|---|---|
| `GET /cars/:id/similar` | Weighted attribute scoring against one specific car | Content-based filtering |
| `GET /cars/trending` | View-count aggregation over a rolling window | Popularity-based ranking |
| `GET /cars/for-you` | Cross-user favourite overlap, with a profile-based fallback | Collaborative filtering, plus content-based cold-start |
| `GET /cars/recently-viewed-similar` | Recency-weighted view history from the current session | Session-based, recency-weighted |

**`GET /cars/:id/similar`, content-based.** I score every other car against the source car's own attributes: `bodyType` match (40 points, the hardest constraint, since a sedan shopper generally isn't cross-shopping pickups), `make` match (30), `transmission`/`fuelType` match (10 each), and price within plus or minus 30% (10, used as a tie-breaker rather than a filter). I made the price band a scoring bonus rather than a `WHERE` clause, since a hard price filter could return zero results for an unusual listing with nothing else nearby in price. As a bonus, the query degrades gracefully instead, falling back in the worst case to `ORDER BY ABS(price - @price) ASC`.

**`GET /cars/trending`, popularity-based.** This joins `Cars` against a `CarViews` aggregate over a configurable window (`?days=`, default 7, not 24 hours, since a 24-hour window would only ever surface a handful of hand-seeded cars and miss the longer-tail "popular" tier my seed data also generates). I use a real `JOIN` against the aggregate rather than a `LEFT JOIN`, so a car with zero views in the window doesn't appear at all, which is why `FeaturedCars.jsx`'s fallback chain below exists. One limitation: `COUNT(*)` has no recency decay, so a view from six days ago counts identically to one from six minutes ago, and total volume can outrank genuine momentum.

**`GET /cars/for-you`, collaborative filtering with cold-start handling, requires authentication.** I built this as two tiers, tried in order, because personalized recommendation runs into the cold-start problem: a brand-new user has no favourites or views for tier 1 to work with.
- Tier 1 finds every other user who shares at least one favourited car with the requesting user, and surfaces cars those users favourited that the requesting user hasn't, ranked by how many similar-taste users favourited each one. This is genuine collaborative filtering, the closest of the four routes to what people usually mean by "recommendation model."
- Tier 2, which I use to pad a short or empty tier 1 result, builds an aggregate taste profile from the user's own favourites and views (favouriting weighted three times a view, since a deliberate "I want this" is stronger evidence than passively looking), finds their single most-signaled body type and make, and scores other cars against that profile using the same weighted approach as `/similar`.

Both tiers exclude the user's own listings. I deliberately don't pad results to the requested limit here the way `/featured` does, since returning fewer than 6 cars is correct behavior, and padding a personalized section with random filler would dilute the point of it. A `basis` field (`'collaborative' | 'profile' | 'mixed' | 'none'`) lets the frontend show which tier actually produced the result.

**`GET /cars/recently-viewed-similar`, session-based, requires authentication.** This is a fourth, distinct category: it builds a `topBodyType`/`topMake` profile using cumulative rather than mutually exclusive time weighting. A view inside the last 5 minutes is, by definition, also inside the last 24 hours, so it earns both the base weight of 1 and a recency bonus of 3, for a total of 4, rather than one bucket or the other. It excludes cars viewed in the last 5 minutes from its own results, since there's no point recommending back the exact car just opened. Both this route and `for-you`'s tier 2 break ties on body type or make selection with `ORDER BY SUM(weight) DESC, MAX(activityAt) DESC`, since `GROUP BY` row order isn't guaranteed stable on a genuine weight tie.

**`POST /cars/:id/view`** feeds the trending route. It's public, since anonymous visitors should still count toward view totals, with two guards: an owner viewing their own listing doesn't count, and a 30-minute dedupe applies for logged-in users so a rapid refresh doesn't inflate the count.

**Frontend wiring.** `FeaturedCars.jsx` tries trending first and pads with a random sample only if trending returns fewer than 6 cars, changing its own heading to reflect which tier actually filled the section. `HomeForYou.jsx` sits at the top of `Home.jsx` with three distinct states: a logged-out banner, a logged-in cold-start banner, or the real grid. `BecauseYouLooked.jsx` sits just below it, with no banner of its own, since repeating that nudge a second time on the same page would be redundant, and it renders nothing if the user is logged out or has no recent view history. `SimilarCars.jsx` and `PickedForYou.jsx` both live on `CarDetails.jsx`, rendered as an infinitely looping carousel rather than a static grid.

**My seed data is persona-aware rather than random noise.** `personas.js` defines each seeded test account's declared taste in one shared place, so `seedFavourites.js` and `seedCarViews.js` can't drift apart on the same account's behavior. An earlier version of `seedCarViews.js` attributed most aggregate views to random real users regardless of persona, which, combined with the catalog's own sedan/hatchback skew, buried every seeded account under noise that a handful of manual test clicks couldn't out-weigh. I moved aggregate trending and popular views to anonymous visitors instead, since `/trending` never reads `userId` anyway, and I gave each persona its own small, coherent view history matching its declared criteria.

**Current limitations:**
- None of the four routes are trained or ML-based.
- `recently-viewed-similar`'s recent bucket is anchored to first-view time rather than "currently viewing," so a car can age out of the recent bucket while still open on screen.
- Neither `for-you` nor `recently-viewed-similar` enforces a minimum signal threshold, so a single view is enough to fully decide the profile.
- `for-you`'s collaborative tier depends on genuine cross-user favourite overlap existing in the seed data, which isn't guaranteed by random seeding alone at my catalog size.
- Both `/featured` and my seed scripts use `ORDER BY NEWID()` for random sampling, which is a known anti-pattern at real scale since it forces a full scan and sort.

## Feature: My Cars

This is a dedicated `/my-cars` page showing only the logged-in user's own listings. I reused the existing Listings search, filter, sort, and pagination machinery here instead of rebuilding it.

**The reuse mechanism is a single prop.** `ListingsFilterContext` accepts an `endpoint` prop that defaults to `/cars`:
```jsx
export const ListingsFilterProvider = ({ children, endpoint = '/cars' }) => {
  // ...
  fetch(`${API_URL}${endpoint}?${params.toString()}`, { credentials: 'include' })
  // ...
}
```
`Listings.jsx` never passes `endpoint`, so it behaves exactly as before. The `MyCars` page passes `endpoint="/cars/mine"`. Debounced search, URL-synced pagination, and page-reset-on-filter-change all run as the same code for both pages, not a copy, since `FilterBar.jsx` never talks to a URL directly and only reads and writes filter state through `useListingsFilter()`.

**Backend: `GET /cars/mine`.** I registered this above `GET /:id` in `routes/cars.js`, for the same route-collision reason as `/featured` and `/trending`: Express would otherwise try to match `"mine"` as an attempted `:id` value. The route requires authentication, since it can't answer "mine" without a verified identity, and `ownerId` is always taken from `req.user.id` rather than a query param or request body.

**Deletion updates the list immediately.** `ListingsFilterContext` exposes a `removeCar(carId)` helper that filters the car out of `cars` and decrements `totalCount` in one call. The `MyCars` component calls it directly after a successful delete. An earlier version of this page tracked deletions with its own separate local state as an overlay on top of the context, which worked but was redundant once I realized the backend delete was already the real source of truth, so I simplified it away.

**Card states beyond the happy path.** Zero cars with no filters active shows a "Post an Ad" call to action. Zero cars with filters active shows a different message, "None of your listings match this search," with no call to action, since suggesting someone with 5 existing listings post a 6th just because their search came up empty would be the wrong suggestion.

**Routing: `/my-cars`, not `/cars/my-cars`.** Both would technically work, since React Router's data router scores routes by specificity regardless of registration order. I chose `/my-cars` for consistency with `/favourites` and `/admin`, neither of which is nested under `/cars` despite showing conceptually similar "special car list" views.

## Shared UI Infrastructure

**`ConfirmContext` replaces native browser dialogs.** `window.confirm`/`window.alert` looked visually out of place against the rest of the app's styled UI, so I built a single `ConfirmProvider`, wrapped at the app root, that exposes a `useConfirm()` hook to any component. `confirm({...})` returns a `Promise<boolean>`, an awaitable replacement for `window.confirm`, and `alertUser({...})` returns a `Promise<void>`, replacing `alert()`. Both support a title, a message, custom button labels, and a `danger` flag that swaps the primary action's styling. I use it for logout, listing delete, admin car and report delete, and the message-request confirmations, giving me one modal implementation instead of a bespoke confirm dialog per feature.

**`Pagination.jsx` windows around the current page rather than rendering a button per page.** My original approach for Comments, one button per page, is fine for a handful of pages but would mean hundreds of buttons at my current catalog size and page size, so `Pagination.jsx` shows a small window around the current page (for example, `1 … 23 24 25 26 27 … 252`), capping at roughly 7 to 9 buttons regardless of total page count. I also added a direct "Go to page" number input with range validation, in place of separate First/Last jump buttons, since the windowing already always includes page 1 and the final page as ordinary numbered buttons. I share it across `FilteredCars.jsx`, `MyCars.jsx`, `AdminCarsTable.jsx`, and `Comments.jsx`.

**`CarCarousel.jsx` takes pre-built `<CarCard>` elements, not raw car data.** This follows the same pattern as `CarCard`'s own `overlay`/`footer` slots: the carousel never needs to know what a "favourite" or a "for-you" result is, so any current or future rail can plug in without the component growing feature-specific props. Looping uses plain modulo wraparound on `next`/`prev` (`(i + 1) % total`), which lets the visible window straddle the array boundary, such as showing cars 11, 0, and 1 at once, with no special-cased wraparound branch. I track `itemsPerView` (1, 2, or 3, matching the app's existing breakpoints) through a `resize` listener rather than pure CSS, since the carousel only renders the currently visible slice of items and needs that exact count in JavaScript to compute which slice that is. `canLoop = total > visibleCount` handles short result sets by rendering a static, non-looping row instead of crashing or duplicating cards.

**Responsive design follows Tailwind's mobile-first model consistently across the app.** An unprefixed class applies at every screen size, and a breakpoint prefix overrides it starting from that width up. The navbar collapses behind a hamburger menu below 1024px, with the mobile dropdown conditionally rendered rather than just hidden with CSS, so a closed menu doesn't exist in the DOM at all. A sitewide spacing scale and width caps keep the app from crowding on a phone or over-stretching on a wide monitor. I gave `CarDetails` a single stacked column rather than a two-column layout specifically to avoid a cropping trade-off: a two-column grid's default stretch behavior combined with `object-cover` cropped photos to fit the box, so I changed the layout at the root instead. `object-contain` inside a fixed-height frame guarantees no cropping, at the cost of rare portrait photos letterboxing on a wide screen. My admin tables render both a full `<table>` and a stacked-card list for the same data simultaneously, toggled purely by CSS, which is fine at my current row counts but would need a single, JS-driven representation if the admin view ever needed to show thousands of rows at once.

**Current limitations:**
- The carousel only renders the currently visible cards into the DOM, so a keyboard or screen-reader user can't reach the off-screen cards without clicking through the carousel first.
- I verified the responsive layout in Chrome DevTools' device toolbar at a handful of preset widths, not on physical devices.

## Environment Variables

Names only. Actual values live in a local `.env` file and are never committed.

**Backend `.env`:** `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_NAME`, `DB_PORT`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `COOKIE_NAME`, `CLIENT_URL`

## Setup & Troubleshooting Notes

A few problems I actually ran into while building this, in case they save someone else the same afternoon.

**PowerShell script execution blocked (`UnauthorizedAccess`).** If `npm run dev` fails with an error like `File ...npm.ps1 cannot be loaded because running scripts is disabled on this system`, it's because Windows blocks third-party script execution by default under its Restricted policy. I fixed it by running PowerShell as Administrator and using:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
`RemoteSigned` allows locally created scripts to run while still requiring downloaded scripts to be signed by a trusted publisher.

**`DB_SERVER=localhost` is correct for a default SQL Server install.** I first tried a named-instance format (`<hostname>\instancename`), which produced an `EINSTLOOKUP` error, because that format triggers a SQL Server Browser (UDP 1434) lookup that the `mssql`/`tedious` driver depends on, unlike SSMS, which can fall back to shared memory for local connections. Dropping the instance suffix resolved it.

**LAN and mobile access.** I derive `API_URL`/`SOCKET_URL` in `src/constants/api.js` from `window.location.hostname` at runtime instead of hardcoding them:
```js
export const API_URL = `http://${window.location.hostname}:5000/api`
export const SOCKET_URL = `http://${window.location.hostname}:5000`
```
This resolves to `localhost` on the same machine and to the LAN IP automatically when I load the app from a phone on the same network. `server.js`'s CORS `allowedOrigins` array needs the LAN origin added alongside `CLIENT_URL` for this to work end to end, and Vite's dev server needs `--host` to bind beyond `localhost` (`npm run dev -- --host`). The backend binds to all network interfaces by default with no equivalent flag needed.

**Useful debugging commands:**
```bash
# Decode a JWT's payload without verifying it (run from backend/)
node -e "console.log(require('jsonwebtoken').decode('TOKEN_HERE'))"

# Fully verify a JWT (signature and expiry), the same check requireAuth performs
node -e "require('dotenv').config(); console.log(require('jsonwebtoken').verify('TOKEN_HERE', process.env.JWT_SECRET))"
```
- To see a logged-in cookie's raw value, open DevTools, go to Application/Storage, then Cookies, and find the `token` row. httpOnly blocks page JS from reading it, not the browser's own inspector.
- To sanity-check a session end to end, log in through the app, then navigate directly to `http://localhost:5000/api/auth/me`. Same-site navigation attaches the cookie automatically.

## Known Limitations & Trade-offs

Each feature section above lists its own specific trade-offs. These are the ones that span more than one feature:

* **No rate limiting anywhere in the app.** Login, register, message sending, and comment posting are all currently unmitigated against abuse or brute-force attempts.
* **Several small, accepted race conditions**, all in the same family: near-simultaneous duplicate registrations, near-simultaneous first messages between the same pair, and near-simultaneous duplicate favourites can each theoretically create a duplicate row. I haven't fixed any of these, since a proper fix would require a database-level constraint that's disproportionate to this project's real concurrency level.
* **Optimistic UI updates have no rollback on failure**, most notably favouriting. A failed request leaves the UI temporarily wrong until the next real refetch.
* **A single JWT with no refresh-token split.** This is simpler to build and reason about, at the cost of no way to shorten a compromised token's blast radius short of rotating the secret for everyone.
* **`ORDER BY NEWID()`** is used for random sampling in `/cars/featured` and both seed scripts, which is a known anti-pattern at real scale.
* **Verified on one real device profile.** I've confirmed LAN and mobile access on an iPhone over Safari and Chrome; I haven't done broader cross-device testing.

## Update Log

I use version numbers in this log instead of dates. A whole major-version bump (2.0, 3.0, 4.0, and so on) marks a completely new system or capability I added to the app. A minor bump (.1, .2, .3) marks a meaningful addition or enhancement to something that already existed. A two-digit micro bump (.11, .12, .13) marks a small bug fix alone, with nothing added or changed structurally. Version numbers track the state of the whole project over time, in the order things actually shipped, regardless of which feature area each change touched.

### v1.0, Initial application
The original marketplace: car listing CRUD, browsing, and basic search and filtering, with no accounts and no ownership. I found and fixed two early bugs as part of establishing this baseline: a "featured cars" shuffle that looked identical on every refresh, because its randomness was seeded from car ids and was therefore fully deterministic, and a broken image preview in the listing form that stayed hidden even after a working URL was pasted in afterward, caused by a missing `key` on the `<img>` element.

### v2.0, Authentication & Authorization
The full JWT and bcrypt system described in [Feature: Authentication & Authorization](#feature-authentication--authorization): the `Users` table, password hashing, httpOnly-cookie JWT sessions, the `requireAuth`/`requireAdmin`/`requireOwnerOrAdmin` middleware, per-user favourites, `AuthContext`/`ProtectedRoute`, ownership-gated editing through a shared `CarForm`, and the first version of `AdminDashboard`.

### v3.0, Comments & Replies system
The full threaded-comments system described in [Feature: Comments & Replies](#feature-comments--replies): one-level replies, edit with a marker, soft-delete around the self-referencing FK constraint, reporting, and an admin moderation panel.

**v3.1**, a search performance pass: a `useDebounce` hook to stop filtering on every keystroke, memoized filter and sort logic, and a Home-page refactor extracting `SearchBar.jsx`/`FeaturedCars.jsx` into standalone components.

**v3.11**, reverted an earlier attempted fix for the featured-cars shuffle back to the original approach, since the "correct" fix caused real performance problems in practice while the original worked fine.

**v3.2**, a broad component architecture refactor: a shared `CarCard.jsx` consolidating duplicated card markup behind `overlay`/`footer` props, `AdminDashboard` split into `AdminCarsTable.jsx`/`AdminReportsTable.jsx`, city management extracted into `AddNewCity.jsx`, a shared `FormField.jsx` for `Login`/`Register`, and the first version of `ListingsFilterContext.jsx`/`FilterBar.jsx`/`FilteredCars.jsx`.

### v4.0, Real-Time Messaging system
The full Socket.io-backed one-to-one chat system described in [Feature: Real-Time Messaging](#feature-real-time-messaging): a raw HTTP server wrapping Express, socket authentication through the same JWT cookie, `user:{id}`/`conversation:{id}` rooms, REST inbox routes, and the `Messages`/`Conversation` pages.

**v4.11**, fixed a bug where switching from Home's search bar to the Listings page left the filter permanently stuck on the URL's original search term, caused by a URL-to-context sync running directly in the render body instead of inside a `useEffect`.

**v4.1**, added message-request semantics on top of messaging: the `Conversations.status` column, accept/decline routes, and the enforcement described in [Feature: Message Requests, One-Shot First Contact & User Blocking](#feature-message-requests-one-shot-first-contact--user-blocking).

**v4.2**, a full responsive design pass across the app: a hamburger navbar below 1024px, a sitewide padding and width-cap scale, the stacked-layout `CarDetails` redesign with uncropped images, mobile-stacking fixes for forms, and the table/card duality for admin views. I also fixed a text-clipping bug in `CarDetails`' spec boxes the same day, replacing `truncate` with `break-words`.

**v4.3**, diagnosed and fixed LAN and mobile access end to end: hardcoded `localhost` API URLs replaced with hostname-derived ones, and the LAN origin added to the CORS allowlist.

**v4.13**, closed a gap left by the fix above: seven files were still redeclaring their own local, hardcoded `API_URL` instead of importing the shared constant. Replaced all seven with the shared import.

**v4.14**, two unrelated bug fixes shipped together: the accept/decline routes had accidentally been nested inside the `/read` route handler's function body instead of registered as top-level routes, so they didn't exist in Express's route table until `/read` had been hit at least once; and `useCars()` was being called twice independently per page visit, firing two identical requests, fixed by passing `loading` down as a prop instead.

### v5.0, Recommendation Engine
The full recommendation system described in [Feature: Recommendation Engine](#feature-recommendation-engine): the catalog scaled to about 3,022 cars, a new `CarViews` table, and the first three routes (similar, trending, for-you) wired into `FeaturedCars.jsx`, `SimilarCars.jsx`, and the new `HomeForYou.jsx`.

**v4.4** (shipped just ahead of v5.0, in the same release window), recommendation data groundwork: `seedNewCars.js` bulk-generates the catalog through `mssql`'s table-valued bulk insert, and I rewrote `seedCarViews.js`/`seedFavourites.js` to resolve car ids dynamically from the live catalog instead of hardcoding them.

**v4.5** (same release window), the scaling fix this growth required: I moved filtering, search, sorting, and pagination server-side for Cars, added a shared windowed `Pagination.jsx`, gave `AdminDashboard` a tab switcher that defers fetching the inactive tab, and retired `FeaturedCars.jsx`'s client-side shuffle in favor of a server-side `GET /cars/featured` route.

**v5.11**, fixed a server crash I introduced with the new `/for-you` route, where middleware was referenced before the line that requires it had actually executed, due to registration order.

**v5.1**, fixed a seeding bug I found during a live demo: `for-you` barely reacted to real behavior on pre-existing seeded accounts, only working cleanly on a brand-new one. I fixed it with a new shared `personas.js` and a rewritten, persona-aware seeding pass.

**v5.2**, split `for-you` into two distinct home-page sections with different time horizons: "Picked For You" for durable taste, and a new "Because You Looked At Similar Cars" for session-based signals, through a new `GET /cars/recently-viewed-similar` route and `BecauseYouLooked.jsx`.

**v5.3**, simplified `Pagination.jsx`: removed the First/Last jump buttons and added a direct "Go to page" number input instead. `Comments.jsx` switched from its own button-per-page markup to this shared component.

**v5.4**, converted `SimilarCars.jsx` from a static 6-car grid into a 12-car, infinitely looping carousel through a new shared `CarCarousel.jsx`, and added a new `PickedForYou.jsx` rail on `CarDetails.jsx`.

**v5.12**, fixed three small UI bugs together: missing flex-centering on several action buttons, a missing close control on the Seller Contact info box, and a car-id-keyed effect to reset that box's open state when navigating between cars.

**v5.13**, fixed a visible flash when clicking between cars through Similar/Picked-for-You, caused by resetting a piece of state inside a `useEffect` after the browser had already painted the new car. Fixed by resetting the state during render instead.

**v5.5**, added `PageNotFound.jsx` as a fallback for unmatched routes and for a non-admin user attempting to reach `/admin` directly.

**v5.6**, introduced `ConfirmContext`, replacing native `window.confirm`/`window.alert` across the app, and wired it into logout, listing delete, and both admin tables' delete/dismiss actions.

**v5.7**, tightened message requests to a true one-shot first contact, since the initiator could previously send unlimited messages into a still-pending thread. Added the matching cap and confirmation step described in [Feature: Message Requests, One-Shot First Contact & User Blocking](#feature-message-requests-one-shot-first-contact--user-blocking).

### v6.0, Car photo uploads
Real device-upload support for car photos, replacing "paste a URL" as the only option: a `multer`-based upload route, and the upload/paste toggle in a new `ImageUploadField.jsx`.

**v6.1**, expanded uploads into full multi-photo galleries: the new `CarImages` table, real file cleanup on every delete path, the rewritten array-based `ImageUploadField.jsx` with per-photo remove and "Make Cover," and the new `CarImageGallery.jsx` replacing the old single static hero image.

**v6.11**, diagnosed why the new card-grid hover swap wasn't visibly appearing across most of the catalog: cars bulk-inserted directly through SQL for scale testing only ever had one `CarImages` row each. Added a one-time backfill script seeding a placeholder second photo per car.

**v6.12**, fixed the sender's own inbox never updating live after sending a message, since only the recipient's did by my original broadcast design. Added `updateConversationPreview`, called from the sender's own send acknowledgement.

**v6.2**, fixed two related bugs in `POST /api/conversations`: messaging the same seller about two different cars collapsed into one thread instead of two, and a declined request had no effect on starting a fresh thread about a different car with the same person.

**v6.13**, fixed a layout bug in the new photo gallery, where the outer frame had no height of its own and resized on every photo with a different aspect ratio. Fixed with a fixed-height frame per breakpoint.

**v6.3**, added the cross-listing relationship layer: the `UserBlocks` table, auto-accept for already-connected pairs, and the persistent Block/Unblock control.

**v6.14**, replaced the placeholder hover-swap images I added in v6.11 with real car-interior photos sourced directly through SQL.

**v6.4**, split the roughly 1,700-line `server.js` into `routes/`, `sockets/index.js`, and `utils/carQuery.js`, a pure reorganization with no behavior change.

**v6.5**, fixed a pagination bug where refreshing deep in the public Listings results silently reset to page 1, because `currentPage` lived only in local state with nothing writing it back to the URL. Fixed by deriving `currentPage` directly from the URL's own `?page=` parameter.

**v6.15**, applied the identical URL-desync pagination fix from v6.5 to `AdminCarsTable.jsx`.

**v6.6**, added the `/my-cars` page: the `GET /cars/mine` backend route and the `MyCars.jsx` page and component pair, built largely by reusing the existing Listings filtering machinery.

**v6.16** (current), simplified `MyCars.jsx`'s delete flow by removing a redundant local overlay that had been tracking deletions client-side, replacing it with a small `removeCar` helper added directly to `ListingsFilterContext`.
