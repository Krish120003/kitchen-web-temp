# Kitchen Web + PocketBase Docker Setup

This project combines your Next.js "Kitchen Web" application with PocketBase as a backend database solution.

## What is PocketBase?

PocketBase is a lightweight, self-hosted backend solution that provides:
- **Real-time database** with SQLite
- **Built-in admin dashboard** for data management
- **Authentication & authorization** out of the box
- **File storage** capabilities
- **Real-time subscriptions**
- **RESTful API** auto-generated from your schema
- **JavaScript/TypeScript SDK** for easy integration

## Architecture

- **kitchen-web**: Your Next.js frontend application (Port 3000)
- **pocketbase**: PocketBase backend service (Port 8090)
- **Networking**: Both services communicate through a Docker bridge network

## Quick Start

1. **Start the services:**
   ```bash
   docker-compose up -d
   ```

2. **Access PocketBase Admin:**
   - Open http://localhost:8090/_/
   - Create your first admin user
   - Set up your database collections

3. **Access your Next.js app:**
   - Open http://localhost:3000
   - Your app can communicate with PocketBase at `http://pocketbase:8080` (internal) or `http://localhost:8090` (external)

## PocketBase Setup

### First Time Setup
1. Go to http://localhost:8090/_/
2. Create an admin account
3. Start creating your collections (like tables in a database)
4. Configure authentication settings if needed

### Data Persistence
Your PocketBase data is stored in `./pocketbase/pb_data/` and will persist between container restarts.

### Integration with Next.js
To connect your Next.js app to PocketBase, install the PocketBase JavaScript SDK:

```bash
pnpm add pocketbase
```

Then in your Next.js app:
```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://localhost:8090');
```

## Available Commands

```bash
# Start services in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start services
docker-compose up --build

# View PocketBase logs specifically
docker-compose logs -f pocketbase

# View Next.js app logs specifically
docker-compose logs -f kitchen-web
```

## Environment Variables

The following environment variables are available:

- `POCKETBASE_URL`: URL to PocketBase service (set to http://pocketbase:8080 for internal communication)
- `NODE_ENV`: Set to production in Docker

## File Structure

```
├── docker-compose.yml          # Docker services configuration
├── Dockerfile                  # Next.js app container definition
├── pocketbase/                 # PocketBase data directory
│   ├── pb_data/               # Database and uploaded files
│   ├── pb_migrations/         # Database migrations
│   ├── pb_hooks/              # Custom hooks
│   └── pb_public/             # Public assets
```

## Development vs Production

This setup is suitable for:
- ✅ Development and testing
- ✅ Small to medium production deployments
- ✅ Self-hosted solutions

For larger production deployments, consider:
- Adding a reverse proxy (nginx/caddy)
- Setting up SSL certificates
- Implementing backup strategies
- Using Docker secrets for sensitive data

## Troubleshooting

### PocketBase Admin Not Accessible
- Ensure PocketBase container is running: `docker-compose ps`
- Check logs: `docker-compose logs pocketbase`

### Next.js App Can't Connect to PocketBase
- Verify both services are on the same network
- Use the internal URL `http://pocketbase:8080` for server-side requests
- Use `http://localhost:8090` for client-side requests

### Data Loss
- Ensure the `./pocketbase/pb_data/` directory has proper permissions
- Check that volumes are properly mounted: `docker-compose config`

## Learn More

- [PocketBase Documentation](https://pocketbase.io/docs/)
- [PocketBase JavaScript SDK](https://github.com/pocketbase/js-sdk)
- [Next.js Docker Documentation](https://nextjs.org/docs/app/building-your-application/deploying#docker-image) 