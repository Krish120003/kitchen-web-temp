#!/bin/bash

# Create /data directory structure if it doesn't exist
mkdir -p /data/images

# Set proper permissions
chmod 755 /data
chmod 755 /data/images

# Initialize the database if it doesn't exist
if [ ! -f "/data/db.sqlite" ]; then
    echo "Initializing database..."
    npx prisma db push
    echo "Database initialized successfully!"
else
    echo "Database already exists, skipping initialization."
fi

echo "Data directory setup complete!"
echo "Database location: /data/db.sqlite"
echo "Images directory: /data/images" 