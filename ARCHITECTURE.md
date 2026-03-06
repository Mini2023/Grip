# ARCHITECTURE.MD - Projekt: Grip Control

## 1. Vision & UI/UX
- **Ziel**: Diskrete Web-App für Tracking (The Lab) und NoFap-Support (The Shield).
- **Vibe**: "High-Performance Dashboard". Dark Mode (Slate/Zinc), technischer Look wie ein Trading-Tool.
- **Responsive Design**: 
  - **Desktop**: Sidebar-Navigation links, breite Grid-Layouts für Recharts-Graphen.
  - **Mobile (PWA)**: Bottom-Navigation, Fokus auf schnelle Eingabe ("Log Session") und den Timer.

## 2. Tech-Stack
- **Framework**: Next.js 14+ (App Router).
- **Styling**: Tailwind CSS & Lucide React (Icons).
- **UI-Komponenten**: Shadcn/UI (Wichtig: Card, Button, Tabs, Switch, Dialog, Scroll-Area).
- **Backend**: Supabase (Auth, Database, Realtime).
- **Charts**: Recharts (AreaChart für Trends, BarChart für Kategorien).

## 3. Datenbank-Schema (Supabase)
- `profiles`: User-Basisdaten, `current_streak_start`, `preferred_mode` ('lab' oder 'shield').
- `tracking_sessions`: Enthält `duration_minutes`, `mood_before/after`, `tags` (Array für Kategorien/Darsteller), `is_relapse`.
- `friendships`: Verknüpft User (IDs) mit `status` ('pending', 'accepted').
- `relapses`: Historie der Rückfälle für statistische Auswertung im Shield-Modus.

## 4. Kern-Features
- **Dual-Mode Switch**: Ein globaler Toggle in der Navbar, der das gesamte UI-Thema und die Dashboard-Inhalte ändert.
- **The Lab**: Fokus auf Datenanalyse der Vorlieben (Tags/Kategorien).
- **The Shield**: Fokus auf Recovery, Live-Timer und den "Emergency Button" (KI-Motivation via Gemini).
- **Privacy**: Diskretion hat Vorrang. Keine expliziten Bilder oder Begriffe in der UI (nutze "Activity", "Session", "Focus").

## 5. Entwickler-Anweisungen (für die KI)
- Nutze den `app/` Directory (App Router).
- Kompakt und modular programmieren.
- Beachte die bestehenden Supabase-Tabellen und RLS-Policies.
- Implementiere PWA-Support (manifest.json, Meta-Tags).