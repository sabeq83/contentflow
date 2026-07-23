#!/bin/bash

# Configuration
APP_DIR="/home/sabeqmursyid/apps/contentflow_v2"

echo "============================================="
echo "  Deploying ContentFlow v2 (On Server)       "
echo "============================================="
echo "Directory: ${APP_DIR}"
echo "---------------------------------------------"

# Pindah ke direktori aplikasi
cd "${APP_DIR}" || { echo "CRITICAL: Direktori target ${APP_DIR} tidak ditemukan!"; exit 1; }
echo "[1/4] Berada di direktori: $(pwd)"

# Melakukan penarikan kode terbaru dari GitHub
echo "[2/4] Melakukan penarikan kode terbaru dari GitHub (git pull)..."
git pull origin main || { echo "CRITICAL: Git pull gagal!"; exit 1; }

# Memperbarui dependensi & build Next.js
echo "[3/4] Memperbarui dependensi Node.js & Build Next.js..."
npm install || { echo "CRITICAL: Gagal npm install!"; exit 1; }
npm run build || { echo "CRITICAL: Gagal npm run build!"; exit 1; }

# Merestart server Next.js (Port 3000)
echo "[4/4] Merestart server Next.js (Port 3000)..."
if command -v pm2 &> /dev/null; then
  pm2 restart contentflow_v2 || pm2 start npm --name "contentflow_v2" -- start
else
  pkill -f "next-server" || pkill -f "next start" || true
  sleep 1
  nohup npm run start -- -p 3000 </dev/null > nextjs.log 2>&1 &
fi
sleep 2

echo "Server Next.js v2 berhasil diluncurkan di port 3000!"
echo "============================================="
echo "  DEPLOYMENT NEXT.JS V2 SELESAI SUKSES!      "
echo "============================================="
