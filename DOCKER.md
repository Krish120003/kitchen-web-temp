# 🐳 Docker Deployment Guide

This project automatically builds and publishes Docker images to GitHub Container Registry (ghcr.io) for free public access.

## 🚀 Quick Start

### Option 1: Docker Run (Simplest)
```bash
# Create data directory for the SQLite database
mkdir -p data

# Run the latest version
docker run -d \
  --name kitchen-web \
  -p 3000:3000 \
  -v ./data:/data \
  ghcr.io/$(whoami)/kitchen-web:latest

# Access your app at http://localhost:3000
```

### Option 2: Docker Compose (Recommended)
```bash
# Use the production compose file
docker-compose -f docker-compose.prod.yml up -d

# Or set your GitHub repository and use it
export GITHUB_REPOSITORY="yourusername/kitchen-web"
docker-compose -f docker-compose.prod.yml up -d
```

### Option 3: Custom Docker Compose
Create your own `docker-compose.yml`:
```yaml
services:
  app:
    image: ghcr.io/yourusername/kitchen-web:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data
    environment:
      - DATABASE_URL=file:/data/db.sqlite
      - NODE_ENV=production
    restart: unless-stopped
```

## 🏷️ Available Image Tags

The GitHub Actions workflow automatically creates several image tags:

- `latest` - Latest build from the main branch
- `main` - Latest build from the main branch
- `develop` - Latest build from the develop branch  
- `v1.0.0` - Specific version tags (when you create releases)
- `1.0` - Major.minor version tags
- `1` - Major version tags
- `main-abc1234` - Branch name with commit SHA

## 🔄 Updating Your Deployment

### Pull Latest Image
```bash
# Stop the container
docker stop kitchen-web

# Pull the latest image
docker pull ghcr.io/yourusername/kitchen-web:latest

# Start with the new image
docker start kitchen-web
```

### With Docker Compose
```bash
# Pull and restart with latest image
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## 🏗️ Development vs Production

### Development (Local Build)
Use the original `docker-compose.yml` for development:
```bash
docker-compose up -d
```
This builds the image locally from your current code.

### Production (Published Image)
Use `docker-compose.prod.yml` for production:
```bash
docker-compose -f docker-compose.prod.yml up -d
```
This uses the pre-built image from GitHub Container Registry.

## 🌍 Public Access

The Docker images are publicly accessible, meaning:
- ✅ Anyone can pull them without authentication
- ✅ Perfect for deployment on any platform (VPS, cloud, etc.)
- ✅ No rate limits for public repositories
- ✅ Completely free through GitHub

## 🚀 Deployment Platforms

You can deploy this Docker image on any platform that supports Docker:

### Railway
```bash
# Use the image directly
ghcr.io/yourusername/kitchen-web:latest
```

### Render
```dockerfile
# Use in your Render Dockerfile
FROM ghcr.io/yourusername/kitchen-web:latest
```

### DigitalOcean, Linode, AWS, GCP, Azure
All support pulling from public registries like ghcr.io.

## 🔧 Environment Variables

The Docker image supports these environment variables:
- `DATABASE_URL` - Database connection string (default: `file:/data/db.sqlite`)
- `NODE_ENV` - Environment mode (default: `production`)

## 📊 Multi-Architecture Support

The images are built for both:
- `linux/amd64` - Intel/AMD 64-bit
- `linux/arm64` - ARM 64-bit (Apple Silicon, ARM servers)

Docker will automatically pull the correct architecture for your platform.

## 🛠️ Troubleshooting

### Image Not Found
Make sure you're using the correct repository name:
```bash
# Check your GitHub repository name
# Format: ghcr.io/username/repository-name:tag
ghcr.io/yourusername/kitchen-web:latest
```

### Permission Issues
The images run as a non-root user. Make sure your data volume has proper permissions:
```bash
chmod 755 ./data
```

### Database Issues
The SQLite database is stored in the `/data` volume. Make sure it's properly mounted:
```bash
# Create the directory first
mkdir -p data
# Then run the container
docker run -v ./data:/data ghcr.io/yourusername/kitchen-web:latest
``` 