#!/bin/bash

# Configuration
SERVER_IP="100.78.186.123"
SERVER_USER="sabeqmursyid"
APP_DIR="~/apps/contentflow_v2"

echo "============================================="
echo "  Deploying ContentFlow v2 (Next.js) Prod    "
echo "============================================="
echo "Server: ${SERVER_USER}@${SERVER_IP}"
echo "Directory: ${APP_DIR}"
echo "---------------------------------------------"

# Memeriksa koneksi SSH via Tailscale
echo "Memeriksa koneksi ke server via Tailscale..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "${SERVER_USER}@${SERVER_IP}" "exit" 2>/dev/null; then
  echo "WARNING: Tidak dapat menghubungi server via SSH (mungkin server mati atau Tailscale belum aktif)."
  echo "Tetap melanjutkan pembangunan perintah, tetapi eksekusi mungkin gagal jika dijalankan sekarang."
fi

echo "Menghubungkan ke server dan menjalankan perintah deployment Next.js..."
ssh "${SERVER_USER}@${SERVER_IP}" "bash -c '
  cd ${APP_DIR} || { echo \"CRITICAL: Direktori target ${APP_DIR} tidak ditemukan di server!\"; exit 1; }
  echo \"[1/5] Berada di direktori: \$(pwd)\"
  
  echo \"[2/5] Melakukan penarikan kode terbaru dari GitHub (git pull)...\"
  git pull origin main || { echo \"CRITICAL: Git pull gagal!\"; exit 1; }
  
  echo \"[3/5] Memperbarui dependensi Node.js (npm install)...\"
  npm install || { echo \"CRITICAL: Gagal npm install!\"; exit 1; }

  echo \"[4/5] Membangun paket produksi Next.js (npm run build)...\"
  npm run build || { echo \"CRITICAL: Build Next.js gagal!\"; exit 1; }
  
  echo \"[5/5] Merestart server Next.js (Port 3000)...\"
  if command -v pm2 &> /dev/null; then
    pm2 restart contentflow_v2 || pm2 start npm --name \"contentflow_v2\" -- start
  else
    pkill -f \"next-server\" || pkill -f \"next start\" || true
    sleep 1
    nohup npm run start -- -p 3000 </dev/null > nextjs.log 2>&1 &
  fi
  sleep 2
  echo \"Server Next.js v2 berhasil diluncurkan di port 3000!\"
  
  echo \"=============================================\"
  echo \"  DEPLOYMENT NEXT.JS V2 SELESAI SUKSES!      \"
  echo \"=============================================\"
'"
