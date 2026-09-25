# Docker Setup — PostgreSQL Database

This project uses Docker to run PostgreSQL in a container instead of installing it natively.

## 1. Install Docker Desktop

Download and install from: https://www.docker.com/products/docker-desktop

Verify installation:
\`\`\`bash
docker --version
docker compose version
\`\`\`

## 2. Confirm `docker-compose.yml` exists at project root

\`\`\`yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: food_ordering
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: yourpassword
      POSTGRES_DB: food_ordering
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
\`\`\`

## 3. Start the database container

From the project root:
\`\`\`bash
docker compose up -d
\`\`\`

The `-d` flag runs it in the background (detached mode).

## 4. Verify the container is running

\`\`\`bash
docker ps
\`\`\`

You should see a container named `food_ordering` with status `Up` and port `5432` mapped.

## 5. Update backend `.env` to match

\`\`\`
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/food_ordering
\`\`\`

## 6. Connect to the database directly (optional, for inspection)

\`\`\`bash
docker exec -it food_ordering psql -U postgres -d food_ordering
\`\`\`

Inside `psql`:
\`\`\`sql
\dt                    -- list tables
\d users               -- describe a table
SELECT * FROM users;
\q                     -- quit
\`\`\`

## 7. Run your backend

\`\`\`bash
cd backend
npm run dev
\`\`\`

Expected output includes:
\`\`\`
Database connected
\`\`\`

## Common Commands

| Command | Description |
|---|---|
| `docker compose up -d` | Start the database container (background) |
| `docker compose down` | Stop the container (data is preserved) |
| `docker compose down -v` | Stop and **delete all data** (fresh start) |
| `docker compose logs -f postgres` | View live database logs |
| `docker ps` | List running containers |
| `docker ps -a` | List all containers (including stopped) |

## Troubleshooting

**Port 5432 already in use:**
\`\`\`bash
lsof -i :5432
kill -9 <PID>
\`\`\`
Or stop a locally installed Postgres:
\`\`\`bash
brew services stop postgresql
\`\`\`

**"database does not exist" error:**
This usually means the Postgres volume was initialized with a different `POSTGRES_DB` name previously. Reset it:
\`\`\`bash
docker compose down -v
docker compose up -d
\`\`\`
⚠️ This deletes all existing data in the container — only do this if you don't need to preserve it.

**Container name not found:**
\`\`\`bash
docker ps
\`\`\`
Use the exact name shown under `NAMES` for any `docker exec` command.