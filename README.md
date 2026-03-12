# ⚡ Grip
### *Self-Mastery and habit tracking Platform*

> **"What gets measured, gets managed. What gets logged with a regret slider, gets rethought."**

[![Built with Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://typescriptlang.org)

---

## 🎯 Mission Briefing

Grip combines **anti fab** with **habit tracking** to help you master yourself and get detailed insights into your preferences and behaviors, while also being able to connect with friends and compare for even more motivation.

Track the content you consume, your habits, and your progress towards your goals. 

---

## 🖥️ Screenshots

| Lab (Dashboard) | Analytics | Social |
|:-:|:-:|:-:|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Analytics](docs/screenshots/analytics.png) | ![Social](docs/screenshots/social.png) |

> *Screenshots pending deployment. Placeholder images go in `/docs/screenshots/`.*

---

## 🛠️ Tactical Feature Set

### 🔬 Extraction Lab (Dashboard)
The primary data-entry interface. Two ingestion modes:

- **Link Intelligence Mode** — Choose between the fast **Standard Scraper** (Meta-tag parsing) or the premium **AI Deep Scrape** (Powered by Gemini). The AI mode uses neural analysis to extract precise metadata, performers, and optimized tags with specialized **Booru-syntax** for Rule34 and other imageboards.
- **Manual Override** — For offline incidents or when discretion requires no URL trail. Full form with category tags, duration, and performer fields.

Both paths write to the same Supabase `sessions` table. Both earn XP. Neither judges you.

---

### 🛡️ Shield Protocol
The dashboard's emergency module — for the moments where the *intention* to log a session hasn't materialized yet, but the *urge* very much has.

- **Tactical Intervention** — Generates randomized physical tasks (push-ups, cold water, etc.) that award +10 XP on completion. The logic being: if you can do 20 push-ups first, you're welcome to reconsider.
- **Breathing Protocol** — A guided 4-4-4 box breathing cycle with a 60-second countdown.
- **Cost of Failure** — Displays your current streak in days with a "This resets everything" prompt. Subtle. Effective.
- **Urge Defeated** — Log a *near-miss* for +50 XP. Because self-control is also an event worth tracking.

---

### 📊 Analytics Command Center
Turn your session history into actionable intelligence.

- **Behavior Timeline** — Monthly session frequency chart.
- **Category Breakdown** — Pie chart of your most-logged content categories.
- **Type Mix** — Real Life vs. Animation/Art and Video vs. Picture/Illustration ratio.
- **Behavior Shift** — Custom A/B tag comparison over time. Select any two tags and see which one is trending. 
- **Spotlight Performer** — Frequency analysis for a specific performer across your archive.
- **Regret Heatmap** — Calendar view, colored by regret score. Looks like a GitHub contribution graph. Means something completely different.

---

### 🤖 AI Intelligence Overlay
A high-end recommendation engine that turns your data into actionable insights.

- **Precision Recommendations** — AI analyzes your tracking profile (themes, formats, top performers) to suggest content tailored to your unique taste.
- **Neural Search Logic** — Generates optimized, direct search links for Pornhub and Rule34.
- **Booru Syntax Engine** — Automatically translates tags into valid Booru-syntax (underscores, lowercase, multi-tag separation) for surgically precise results on imageboards.
- **Fallback Kaskade** — Robust backend utilizing a chain of Gemini models (3.0 Flash, 3.1 Lite, 2.5 Lite) to ensure 24/7 feature availability.

---

### 🌐 Social & Brotherhood Ranking
Optional. Opt-in. Pseudonymous.

- **Global Leaderboard** — Ranked by XP, streak, or badge count. Compete with other Sentinels without revealing who you are or what you watch.
- **Friend Network** — Send encrypted handshakes (friend requests), accept connections, view ally profiles.
- **Pending Requests Inbox** — Bell icon with badge counter, always visible on mobile. No excuses.
- **Privacy Controls** — Per-user settings for `show_stats_publicly` and `show_preferences_publicly`. Set to `global`, `friends`, or `private`. RLS-enforced at the database level.

---

### 🏆 XP & Gamification Engine
Because dopamine can be retargeted.

| Action | XP Reward |
|---|---|
| Log a session (Lab Entry) | +5 XP base + (regret_score × 2) |
| Urge Defeated (Shield) | +50 XP |
| Tactical Intervention completed | +10 XP |
| Quest milestone reached | +50 XP |

Levels are calculated as `floor(totalXP / 100) + 1`. Badge unlocks (Sentinel & Collector categories) are computed from session count and streak length — no separate DB column required.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router, RSC) |
| **Database & Auth** | Supabase (PostgreSQL + RLS) |
| **Styling** | Tailwind CSS v3 |
| **Animations** | Framer Motion |
| **UI Components** | shadcn/ui (Radix primitives) |
| **Charts** | Recharts |
| **Notifications** | Sonner (toast) |
| **Icons** | Lucide React |
| **AI** | Google Gemini (Cascade Fallback Logic) |
| **Language** | TypeScript 5 |
| **Deployment** | Vercel |

---

## 📱 PWA Support

Grip is installable as a Progressive Web App on iOS and Android.

- Add to home screen via Safari/Chrome share menu
- Enjoy the app like feeling

---

## 🔐 Privacy Architecture

- All data is stored in your **own Supabase project** — nothing passes through Antigravity's servers.
- RLS policies enforce that you can only read your own sessions unless another user has explicitly set their profile to `public` or you are mutual friends.
- The link scraper runs server-side (`/api/scrape`) — no URLs are logged server-side beyond the current request.
- **Neural Privacy** — AI analysis is processed with strict safety settings and minimal data overhead to maintain your anonymity.
- Pseudonymous usernames. Real data. Zero third-party tracking.

---

## 🗺️ Roadmap

- [ ] AI intergration (gemini/huggingface API) for detailed recomendations
- [ ] Montly report similar to Spotify Wrapped
- [ ] Daily Quest system with rotating objectives
- [ ] Export to CSV / PDF report
- [ ] Mobile push notifications (PWA)
- [ ] Partner accountability mode (opt-in streak sharing)
- [ ] Custom badge creation
- [ ] Browser extension for live logging (chrome web store/firefox extensions)

---

**Built with questionable search history.**
