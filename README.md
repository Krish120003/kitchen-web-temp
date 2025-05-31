# Kitchen Web App

A modern web application built with the T3 Stack (Next.js, tRPC, Prisma) designed to run in Docker with persistent data storage.

## 🛠️ Tech Stack

- **Framework:** Next.js 15 with App Router
- **Backend:** tRPC for type-safe APIs
- **Database:** SQLite with Prisma ORM
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Deployment:** Docker with mounted volumes

## 🚀 Docker Setup

This application is designed to run in Docker with a mounted `/data` directory for persistent storage.

### Prerequisites

- Docker and Docker Compose installed

### Quick Start

1. **Clone and build:**
   ```bash
   git clone <repository-url>
   cd kitchen-web
   ```

2. **Start with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Web app: http://localhost:3000
   - The database and images will be persisted in a Docker volume

### Data Structure

The `/data` directory contains:
- `db.sqlite` - SQLite database file managed by Prisma
- `images/` - Directory for uploaded images

### Manual Docker Commands

If you prefer to use Docker directly instead of Docker Compose:

```bash
# Build the image
docker build -t kitchen-web .

# Run with mounted volume
docker run -d \
  --name kitchen-web-app \
  -p 3000:3000 \
  -v kitchen_data:/data \
  -e DATABASE_URL="file:/data/db.sqlite" \
  kitchen-web
```

## 🔧 Development

For local development (outside Docker):

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with local database path
   ```

3. **Initialize database:**
   ```bash
   pnpm db:push
   ```

4. **Start development server:**
   ```bash
   pnpm dev
   ```

## 📁 Project Structure

```
kitchen-web/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/                   # Next.js app router pages
│   ├── server/
│   │   ├── api/              # tRPC routers
│   │   └── db.ts             # Prisma client instance
│   │   └── env.js                # Environment validation
│   ├── trpc/                 # tRPC configuration
│   └── scripts/
│       └── init-data.sh          # Docker initialization script
├── docker-compose.yml        # Docker Compose configuration
├── Dockerfile               # Multi-stage Docker build
└── README.md
```

## ⚠️ Important Notes

- **The `scripts/init-data.sh` should ONLY be run inside Docker containers**, not on your local machine
- The `/data` directory is automatically created and managed by Docker
- Database migrations are handled automatically on container startup
- All data persists in Docker volumes between container restarts

## 🗄️ Database Management

- **View database:** `docker exec -it <container-name> npx prisma studio`
- **Reset database:** Remove the Docker volume and restart the container
- **Backup database:** Copy the `db.sqlite` file from the Docker volume

## 📝 Environment Variables

- `DATABASE_URL` - Path to SQLite database file
- `NODE_ENV` - Environment (development/production)

See `.env.example` for all available environment variables.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker
5. Submit a pull request

## 📄 License

[Add your license here]
