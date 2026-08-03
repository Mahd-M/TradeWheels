# TradeWheels

A full-stack used-car marketplace, inspired by PakWheels. Built solo, end to end: React frontend, Node/Express backend, Socket.io for real-time chat, and SQL Server for the data layer.

---

## Overview

I built TradeWheels to take a full-stack project from a rough CRUD app all the way to something with the kind of features a real marketplace actually needs: authentication, ownership rules, real-time messaging with request/blocking logic, a recommendation engine, and an admin moderation layer. It started as an internship demo project and grew well past the original scope, mostly because problems like scaling to a few thousand listings, keeping a chat inbox in sync live, and deciding what "similar cars" should even mean turned out to be worth solving properly rather than faking.

## Features

- **Accounts and permissions.** Email/password auth with hashed passwords and JWT sessions stored in an httpOnly cookie. Listings have real ownership, admins have a separate role, and every protected action is enforced on the backend, not just hidden in the UI.
- **Listings.** Full create, edit, and delete for your own cars, with photo uploads, numeric validation, and a fraud declaration before anything gets published. Browsing supports search, filters (city, body type, transmission), sorting, and pagination, all handled server-side so it stays fast at a few thousand listings.
- **Multi-photo galleries.** Upload multiple photos per car straight from your device, reorder which one is the cover photo, and get a clean gallery view with a hover-swap preview on the listing cards.
- **Favourites.** Save any listing to come back to later, scoped per account.
- **Comments and moderation.** Threaded comments on each listing (one level of replies), editing, reporting, and an admin panel to review reported comments.
- **Real-time messaging.** One-on-one chat with sellers, pushed live over Socket.io rather than needing a refresh. First contact from a stranger arrives as a request that has to be accepted before the conversation opens up, and either side can block the other at any point.
- **Recommendations.** Four different techniques working together: content-based "similar cars," a popularity-based trending section, collaborative filtering for a personalized "for you" feed, and a session-based "because you looked at" rail.
- **A dedicated "My Cars" dashboard** for managing everything you've listed, and an admin dashboard for managing users, listings, and reported content across the whole platform.

## Tech Stack

**Frontend:** React (Vite), Tailwind CSS, React Router, Socket.io-client

**Backend:** Node.js, Express, Socket.io, `mssql`, JWT + bcrypt for auth, Multer for file uploads

**Database:** SQL Server

**Testing:** Node's built-in test runner, with core business logic pulled out into plain, framework-free modules specifically so it's testable in isolation

## Architecture Highlights

A few of the decisions I'm most glad I made, and why.

**JWT in an httpOnly cookie, with ownership checks built by composition.** Instead of writing a separate permission check for every protected route, I built one small set of middleware functions (`requireAuth`, `requireAdmin`, `requireOwnerOrAdmin`) where the more specific ones call the simpler ones directly. Adding ownership checks for comments and conversations later was just reusing the same pattern against a different table, instead of writing new logic each time.

**Server-side everything for listings, once the catalog got big.** I originally fetched the whole car table and filtered/sorted/paginated it in the browser, which worked fine until I seeded a few thousand listings to make the recommendation features meaningful and the frontend started choking. Moving filtering, search, sorting, and pagination into the SQL query itself (with a shared helper so the "how many total results" count and the actual page of results can never disagree) was the single biggest performance fix in the project.

**Real-time messaging built on rooms, not a single global channel.** Every logged-in user joins a personal Socket.io room on connect, so I can push an inbox update to someone no matter what page they're on, and a separate room per open conversation handles the live back-and-forth. Getting the sender/recipient broadcast logic right (so a message doesn't bounce back to the person who sent it, but their own inbox still updates) took a few iterations to get clean.

**Message requests and blocking, added without redesigning messaging.** Rather than building a parallel "requests" system, first contact from someone new just sets a `pending` status on the existing conversation record, and a block is a small standalone table checked before every send. Both features layer cleanly on top of a chat system that already worked, instead of needing their own infrastructure.

**Four recommendation techniques instead of one.** Content-based similarity, popularity-based trending, collaborative filtering for personalized picks, and a session-based "recently looked at" feed all live side by side. None of it is machine learning, it's deliberately scored SQL, but building four genuinely different approaches taught me more about the trade-offs between them than building one "good enough" version would have.

**Real cleanup on photo deletes, not just database rows.** SQL Server has no idea a file exists on disk, so every path that removes a photo (deleting a listing, editing one, or just removing a photo from the upload picker before submitting) explicitly deletes the underlying file too. It's a small thing, but it's the kind of detail that's easy to skip and leaves orphaned files behind for good.

**Shared, "dumb" UI components wherever the same shape showed up twice.** A car card, a pagination control, and a carousel all appear in several places in the app, and all three take pre-built content as props rather than knowing about favourites, recommendations, or comments themselves. Adding a new list or a new recommendation rail later meant reusing an existing component, not writing a new one.

## What I Learned

A few things that stood out most from building this:

- **React's mental model took a while to click**, especially around when a component re-renders and why. I hit a real infinite-render bug in the messaging system caused by an unstable function reference in a `useEffect` dependency array, and tracking that down taught me more about closures and `useCallback` than any tutorial had.
- **Real-time systems are a different kind of hard.** REST endpoints are easy to reason about one request at a time. Getting a Socket.io chat to behave correctly for both people in a conversation, at the same time, without duplicating or dropping messages, meant thinking about state in a way plain CRUD work never required.
- **Recommendation systems have a cold-start problem you can't avoid.** A brand-new user has no history to personalize anything from, and designing a fallback that degrades gracefully instead of just showing nothing (or something obviously random) turned out to be most of the actual work.
- **Performance problems show up exactly when you don't expect them.** Everything worked fine until the catalog crossed a few thousand rows, and moving from client-side to server-side data handling was a genuinely different way of thinking about where "the app" actually lives.

## Getting Started

### Prerequisites
- Node.js 18+
- SQL Server (a local instance is enough for development)

### Setup

```bash
# clone the repo
git clone https://github.com/Mahd-M/TradeWheels.gits
cd tradewheels

# install frontend dependencies (repo root)
npm install

# install backend dependencies
cd backend
npm install
```

Create a `.env` file inside `backend/` (see `.env.example` )

Run the database schema script against your SQL Server instance, then start both servers:

```bash
# from backend/
npm run dev

# from the repo root, in a separate terminal
npm run dev
```

The frontend runs on `http://localhost:5173` and the API on `http://localhost:5000`.

## Project Structure

```
tradewheels/
├── backend/
│   ├── routes/          # one file per resource: auth, cars, comments, conversations, admin...
│   ├── sockets/         # Socket.io connection handling and real-time events
│   ├── utils/           # shared SQL query helpers
│   ├── middleware.js    # auth and ownership checks
│   └── server.js
└── src/
    ├── context/         # global state: auth, favourites, messaging, sockets
    ├── components/      # reusable UI: car cards, forms, pagination, carousels
    └── pages/           # top-level routes: home, listings, car details, messages...
```

## Roadmap

Things I'd tackle next if I kept building this out:

- Rate limiting on auth and messaging endpoints
- Image compression and resizing on upload instead of storing originals as-is
- Drag-to-reorder for listing photos (right now, reordering is limited to setting a cover photo)
- Migrating from a local SQL Server instance to Azure SQL for easier deployment
- Vector embeddings on car descriptions to complement the existing SQL-based recommendation scoring

## Contact

Mahd, github.com/Mahd-M
