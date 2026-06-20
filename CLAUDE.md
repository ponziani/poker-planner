# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Poker Weekend Alicante** is a simple availability planning web application for coordinating a poker weekend trip. It features a two-step voting interface where players enter their names and select which weekends they're available. The app displays real-time aggregated results showing which weekends have the most votes and who can attend each weekend.

**Tech Stack:**
- Frontend: Vanilla JavaScript (ES6+), HTML5, CSS3
- Backend: Turso (SQLite cloud database) with HTTP API
- No build tools, no package manager—pure vanilla approach for simplicity

## Architecture

### Frontend Architecture

The application follows a **state-driven single-page architecture** with three main layers:

1. **State Management** (`state` and `data` objects)
   - `state`: UI navigation and calendar context (current user, selected weekends, calendar month/year)
   - `data`: Persistent application data (names list, votes dictionary mapping names to weekend arrays)

2. **Database Abstraction Layer** (Turso/localStorage toggle)
   - `dbInit()`, `dbLoad()`, `dbSave()`, `dbAddName()` act as interfaces
   - `USE_LOCAL_STORAGE` flag switches between localStorage (testing) and Turso (production)
   - Turso uses HTTP API with JWT bearer token for authentication
   - All data is serialized to/from JSON; votes stored as `[satKey, satKey, ...]` arrays

3. **Two-Step UI Flow**
   - **Step 1 (Names)**: Player selection and registration
   - **Step 2 (Calendar)**: Weekend availability voting
   - Navigation via `goStep(n)` with smooth scrolling

### Key Data Structures

**Weekend Representation:**
- Saturday date stored as ISO string key: `YYYY-MM-DD` (e.g., `"2025-06-21"`)
- Sunday calculated dynamically via `getSundayFromSat(satKey)`
- Formatting helpers: `fmtWeekend()` (short: "za 21 & zo 22 Jun") and `fmtWeekendLong()` (full names)

**Voting Data:**
- `data.votes[name] = [satKey1, satKey2, ...]` (chronologically sorted weekends a player can attend)
- Aggregation in `getAggregated()` returns ranked list: `[{ satKey, voters }, ...]` sorted by vote count descending

### UI Components

**Calendar:**
- Monthly grid view with navigation (prev/next month)
- Connected weekend pills: Saturday has left-rounded styling, Sunday has right-rounded, creating a 2-day visual unit
- Disables past dates and weekdays; highlights "today" marker
- Toggle selection via `toggleWeekend(satKey)` which updates calendar and chip display

**Overview Panel (sticky):**
- Player status badges: green checkmark for voted, gray for waiting
- Best date spotlight: shows the weekend with most votes and attending players
- Bars section: stacked bars showing vote distribution across all weekends
- Who section: shows player avatars (initials) for each weekend

**Chip Display:**
- Decorative SVG poker chips (4 colors: blue, red, green, gold) in header with CSS filters
- Inline text chips for selected weekends with remove button

## Database Schema

**Turso Table (SQLite):**
```sql
CREATE TABLE votes (
  name TEXT PRIMARY KEY,
  weekends TEXT NOT NULL DEFAULT '[]'
)
```

- `name`: Unique player identifier
- `weekends`: JSON string of Saturday ISO date keys
- Initialized on first app load via `tursoInit()`

**localStorage Fallback:**
```json
{
  "names": ["Alice", "Bob"],
  "votes": { "Alice": ["2025-06-21", "2025-07-05"], "Bob": ["2025-06-21"] }
}
```

## Common Commands

Since this is a vanilla JS project with no build tools or package manager:

**Run locally:**
- Open `index.html` directly in a browser (file:// protocol)
- Or use a local HTTP server: `python -m http.server 8000` then visit `http://localhost:8000`

**Switch to localStorage (testing without database):**
- Edit `js/main.js` line 76: set `const USE_LOCAL_STORAGE = true;`
- Restart the app; data will persist in browser localStorage instead of Turso

**Switch to Turso (production database):**
- Set `const USE_LOCAL_STORAGE = false;` in `js/main.js`
- Ensure `TURSO_URL` and `TURSO_TOKEN` are valid in lines 3-4
- Turso token should be stored securely; the current token is visible but intended for read-write access to the specific database

**Debug Mode:**
- Open browser DevTools (F12)
- Inspect `window.state` and `window.data` to view current app state
- Check Network tab for Turso API calls (POST to `/v2/pipeline`)

## File Structure

```
poker-planner/
├── index.html          # Main entry point; defines two-step form layout
├── js/
│   └── main.js         # ~476 lines; all logic: state, DB, UI rendering, event handlers
├── css/
│   └── style.css       # ~476 lines; Mediterranean palette (blue, terracotta, sand, gold)
└── .claude/
    └── settings.local.json  # Claude Code permissions (rtk ls, rtk find)
```

## Key Functions by Category

**Navigation:**
- `goStep(n)`: Show step 1 or 2; render calendar and chips if step 2
- `goVoteAgain()`: Re-enter step 2 with current player's previous votes

**Step 1 (Names):**
- `renderNames()`: Generate name buttons with vote counts
- `selectName(name)`: Set current user and load their votes
- `addName()`: Register new player to database and UI

**Step 2 (Calendar):**
- `renderCal()`: Generate month grid with proper styling for past/today/selected weekends
- `toggleWeekend(satKey)`: Toggle a Saturday in selected list; update calendar and chips
- `renderChips()`: Show chip display of selected weekends with remove buttons
- `prevMonth() / nextMonth()`: Navigate calendar

**Database:**
- `tursoQuery(sql, args)`: Low-level HTTP POST to Turso API
- `tursoLoad() / tursoSave() / tursoAddName()`: High-level CRUD operations
- `localLoad() / localSave() / localAddName()`: localStorage equivalents
- Conditional wrappers (`dbInit`, `dbLoad`, etc.) route to correct backend based on `USE_LOCAL_STORAGE`

**Overview:**
- `getAggregated()`: Compute vote counts per weekend; return ranked list
- `renderOverview(showToast)`: Update player status, best date card, bars, and who section
- `renderNames()` also calls `renderOverview()` to keep UI in sync

**Utilities:**
- `toKey(date)`: Convert Date to ISO string
- `getSaturdayKey(date)`: Extract Saturday from any weekend day
- `getSundayFromSat(satKey)`: Calculate Sunday from Saturday key
- `fmtWeekend() / fmtWeekendLong()`: Format weekend dates in Dutch
- `initials(name)`: Extract initials for avatar display
- `chipSVG(...)`: Generate decorative poker chip SVG with radial gradients
- `setLoading(on)`: Show/hide loading bar
- `showError(msg)`: Display error banner for 5 seconds

## Styling Notes

**Responsive Design:**
- Desktop layout: left column (420px) for voting, right column (sticky overview panel)
- Mobile (≤860px): single column, overview reorders above (via CSS `order: -1`)

**Color Palette:**
- Night: `#0d1117`, Dark: `#141a24`, Panel: `#1a2235`
- Sky blue: `#1a6fa8` (primary accent)
- Terracotta: `#c9613a` (action buttons, selected state)
- Sand: `#e8d5b0` (weekend day text)
- Gold: `#d4a843` (headings, logo)
- Muted: `#7a8baa` (secondary text)

**Typography:**
- Display: Playfair Display (serif), used for titles and logo
- Body: Inter (sans-serif), used for UI text

## Important Implementation Details

1. **Weekend Pills:** The calendar uses CSS margin/padding tricks to visually "connect" Saturday and Sunday into a single rounded pill when selected. Saturday has `margin-right: -1px` and Sunday has `margin-left: -1px` with corresponding border-radius adjustments.

2. **Turso Typing:** Result rows are returned as nested value objects: `row[0].value`, `row[1].value`. Always access via `.value` property.

3. **Date Edge Cases:** 
   - `getSaturdayKey()` handles dates that are Saturday (return as-is), Sunday (subtract 1 day), or weekday (return null)
   - Calendar month navigation wraps year boundaries correctly

4. **UI Sync:** After database operations, manually call `renderOverview()` and `renderNames()` to keep UI in sync. The app does not auto-subscribe to database changes.

5. **Token Exposure:** Turso token is embedded in client-side code. This is intentional for this demo app; production systems should use a backend proxy.

## Troubleshooting

**"Turso error: 401":**
- Token expired or invalid; regenerate in Turso dashboard
- Update `TURSO_TOKEN` in `main.js`

**Data not persisting:**
- Check browser DevTools Network tab for failed POST requests to Turso
- Verify `USE_LOCAL_STORAGE = false` and token is set
- For offline testing, switch `USE_LOCAL_STORAGE = true`

**Calendar shows old month:**
- Check browser console for JavaScript errors
- Verify Date object is initialized correctly: `state.calYear` and `state.calMonth`

**Chips not updating:**
- Call `renderChips()` after modifying `state.selectedWeekends`
- Check that `toggleWeekend()` is being called

