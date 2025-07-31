#!/bin/bash

echo "Building Admin Panel..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project
echo "Building project..."
npm run build

echo "Admin panel build complete!"
echo "Files are in ../admin-panel/dist"