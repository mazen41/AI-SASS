# 🎬 AI-SASS — AI Video Generation Platform

An AI-powered SaaS platform that generates videos from stories using AI scene management and narration.

## Features

- **Story-based Video Generation** — turn written stories into multi-scene videos
- **Scene Management** — parallel scene generation with per-story seed locking for consistency
- **AI Narration** — minimum 30s narration validation per scene
- **Job Queue** — race-condition-safe supervisor with database-backed job locks
- **Fal.ai Integration** — video generation via `fal-ai/wan-i2v` model
- **Character Consistency** — style and character locking across all scenes

## Tech Stack

- **Backend:** Laravel
- **AI Video:** Fal.ai (wan-i2v)
- **Queue:** Laravel Horizon / job supervisor

## Setup

```bash
composer install
cp .env.example .env
php artisan migrate
php artisan queue:work
```
