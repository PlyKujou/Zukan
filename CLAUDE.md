# AnimeListThingy

A web app for tracking anime you've watched, want to watch, and everything in between.

## Project Overview

Users can manage personal anime lists, rate shows, and customize their profiles. Built with social features (forums, reviews, comments) planned for later phases.

## Core Features

### Anime Lists
- **Watched** — anime the user has completed
- **Watching** — currently airing or in-progress
- **Plan to Watch** — the backlog
- **Dropped** — abandoned shows
- **On Hold** — paused

### Per-Entry Data
- Rating (e.g. 1–10)
- Episode progress
- Start/finish dates
- Personal notes

### User Profiles
- Username and display name
- Profile picture
- Bio
- Public/private list visibility
- Stats (total watched, average rating, favorite genres)

### Planned / Future Features
- Forums
- Anime reviews (long-form)
- Comments on entries or reviews
- Friends / following system
- Activity feed

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Database / Auth**: Supabase (Postgres + Auth + Storage)
- **Anime Data**: Jikan API v4 (free MyAnimeList wrapper, no key needed)

## Project Structure

```
src/
  app/
    page.tsx               # Landing page
    layout.tsx             # Root layout with Navbar
    login/page.tsx         # Login
    signup/page.tsx        # Sign up
    search/page.tsx        # Anime search (Jikan)
    anime/[id]/page.tsx    # Anime detail + add-to-list
    dashboard/page.tsx     # User's lists (protected)
    profile/
      edit/page.tsx        # Edit profile (protected)
      [username]/page.tsx  # Public profile view
  components/
    Navbar.tsx
    AnimeCard.tsx
    AddToListButton.tsx
  lib/
    supabase/
      client.ts            # Browser Supabase client
      server.ts            # Server Supabase client
    jikan.ts               # Jikan API helpers
  middleware.ts            # Auth protection
supabase-schema.sql        # DB schema — run in Supabase SQL editor
```

## Setup

1. Create a Supabase project at supabase.com
2. Run `supabase-schema.sql` in the SQL editor
3. Copy `.env.local.example` to `.env.local` and fill in your project URL and anon key
4. `npm run dev`

## Development Notes

- Anime data should be sourced from a public API (e.g. Jikan/MyAnimeList, AniList GraphQL) rather than maintained manually.
- Keep list management and social features cleanly separated in the codebase so social features can be added without breaking core list functionality.
