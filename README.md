# Cyber Run: Neon Escape

Single-player neon endless runner for Telegram Mini Apps.
- Portrait mode (400x600)
- Start + Leaderboard buttons
- Footer branding: "Made by Darian"
- HUD: score, combo, power-up icons, username/avatar
- Health bar
- Dynamic level generation
- Combo multiplier
- Dynamic difficulty scaling
- Boss events (random types) every 500 score
- Game Over screen with stats chart
- Group-based leaderboard (isolation by Telegram chat/group)

## Setup

1. Add assets in `frontend/assets/`.
2. Set Vercel KV token/env per Vercel docs.
3. Deploy to Vercel: `vercel` (ensure `vercel.json` routes).
4. Configure Telegram Mini App:
   - WebApp URL -> your Vercel deployment URL
   - Share in a group to have `groupId` populated via `initDataUnsafe.chat.id`.

## Notes

- PlayerId, username, avatar, groupId fetched via Telegram WebApp API.
- Scores are stored per-group; same player in another group shows 0 unless they play there.
- No live multiplayer; concurrent single-player runs are supported.