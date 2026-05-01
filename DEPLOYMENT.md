# Deployment

FarDing's Friendship Points is a long-running Discord worker. It does not expose a web port.

The bot uses SQLite, so production hosting must provide persistent storage for `DATABASE_PATH`. Do not run production with the database on an ephemeral filesystem, or points can be lost on restart or redeploy.

## Recommended: Render Background Worker

Render supports background workers and persistent disks. This repository includes `render.yaml` and a `Dockerfile` for that path.

1. Push the latest code to GitHub.
2. In Render, create a new Blueprint from this repository.
3. Confirm it creates a Background Worker named `fardings-friendship-points`.
4. Confirm a persistent disk is attached at `/data`.
5. Set these secret environment variables in Render:

```text
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-application-client-id
DISCORD_GUILD_ID=your-test-server-id-or-empty-for-global-commands
```

The blueprint sets these non-secret values:

```text
NODE_ENV=production
DATABASE_PATH=/data/fardings-friendship-points.sqlite
WEEKLY_CRON=0 9 * * 1
LOG_LEVEL=info
```

After the worker deploys, check the logs for a successful Discord login.

## Register Slash Commands

Slash commands are registered by a one-time command, not by the worker start command.

For a test server, keep `DISCORD_GUILD_ID` set and run:

```bash
npm run register
```

You can run this locally before deploying, or from a one-off shell on your hosting provider if available.

Run it again whenever commands change, such as after adding `/friends`.

## Railway

Railway can also work well. Create a service from GitHub, set the start command to `npm start`, and add a persistent volume. Mount the volume at `/app/data` and set:

```text
DATABASE_PATH=/app/data/fardings-friendship-points.sqlite
```

Then add the same Discord environment variables as above.

## Fly.io

Fly.io is a good fit if you are comfortable with the CLI. Deploy the Dockerfile, create a volume, mount it at `/data`, and set secrets with `fly secrets set`.

Use:

```text
DATABASE_PATH=/data/fardings-friendship-points.sqlite
```

## Production Checklist

- `DISCORD_TOKEN` is set as a secret, not committed to GitHub.
- `DATABASE_PATH` points to persistent storage.
- Only one production copy of the bot is running for the same Discord app.
- Slash commands have been registered after the latest command changes.
- Logs show the bot logged in successfully.
