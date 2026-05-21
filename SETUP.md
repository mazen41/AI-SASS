# StoryHero — Setup Guide

## Backend (Laravel)

### 1. Install Sanctum + dependencies
```bash
cd backend
composer install
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

### 2. Set up environment
```bash
# .env is already created. Generate the app key:
php artisan key:generate
```

### 3. Run migrations
```bash
php artisan migrate
```

### 4. Start the server
```bash
php artisan serve
# Runs on http://localhost:8000
```

---

## Frontend (Next.js)

### 1. Install dependencies
```bash
cd frontend
npm install
```

### 2. Start dev server
```bash
npm run dev
# Runs on http://localhost:3000
```

---

## What's built

### Backend endpoints
| Method | Endpoint        | Auth required |
|--------|----------------|---------------|
| POST   | /api/register   | No            |
| POST   | /api/login      | No            |
| POST   | /api/logout     | Yes (Bearer)  |
| GET    | /api/user       | Yes (Bearer)  |

### Frontend pages
| Route        | Description                          |
|-------------|--------------------------------------|
| /            | Landing page (full bilingual)        |
| /login       | Login page (EN/AR)                   |
| /register    | Register page (EN/AR)                |
| /dashboard   | Protected dashboard (placeholder)    |

### Frontend structure
```
frontend/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── globals.css         # Full design system
│   ├── page.tsx            # Landing page entry
│   ├── login/page.tsx      # Login page
│   ├── register/page.tsx   # Register page
│   └── dashboard/page.tsx  # Protected dashboard
├── components/
│   ├── Navbar.tsx          # Sticky bilingual navbar
│   └── LandingPage.tsx     # Full landing page
├── context/
│   ├── AuthContext.tsx     # Auth state + token management
│   └── LangContext.tsx     # EN/AR language toggling + RTL
└── lib/
    ├── api.ts              # API service layer (all fetch calls)
    └── i18n.ts             # All translations (EN + AR)
```
