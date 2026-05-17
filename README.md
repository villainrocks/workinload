<!-- This code fixed By Tg:@ImxCodex -->
# NexusPanel Advance By Codex

Telegram receipt automation panel with a React/Vite frontend and an Express API.

## Runtime Storage

The app now uses Supabase as the source of truth. Local runtime files such as `data/state.json` and `data/config.db` are not used by the server.

Expected Supabase tables:

- `admins`
- `accounts`
- `groups`
- `account_configs`

Admin passwords created through the app are stored as `scrypt` hashes. Existing plaintext admin passwords are accepted once and migrated to a hash on successful login.

## Environment

Create `.env` from `.env.example` and set:

```bash
PORT=3002
ALLOWED_ORIGINS=http://localhost:5173
TG_API_ID=123456
TG_API_HASH=your_telegram_api_hash
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_or_anon_key
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=change-this-password
```

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm run lint
npm run build
```
