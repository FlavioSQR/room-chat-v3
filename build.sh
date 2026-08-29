#!/bin/bash

echo "🔨 Building backend..."
cd backend
npm install
npm run build 2>/dev/null || echo "⚠️  No build script in backend"
cd ..

echo "🔨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "✅ Build completo!"
