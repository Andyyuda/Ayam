#!/bin/bash

# ============================================
# Install systemd service untuk Bot WhatsApp
# Jalankan sebagai root: bash install-service.sh
# ============================================

set -e

BOT_DIR="/root/botwa"
SERVICE_NAME="botwa"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "========================================"
echo "  Install Systemd Service - Bot WA"
echo "========================================"

# Cek apakah dijalankan sebagai root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Harus dijalankan sebagai root!"
  echo "   Gunakan: sudo bash install-service.sh"
  exit 1
fi

# Tanya lokasi folder bot
read -p "📁 Lokasi folder bot [default: /root/botwa]: " INPUT_DIR
BOT_DIR="${INPUT_DIR:-/root/botwa}"

if [ ! -f "${BOT_DIR}/main.js" ]; then
  echo "❌ File main.js tidak ditemukan di ${BOT_DIR}"
  echo "   Pastikan folder bot sudah benar."
  exit 1
fi

# Cari path node
NODE_PATH=$(which node)
if [ -z "$NODE_PATH" ]; then
  echo "❌ Node.js tidak ditemukan! Install dulu dengan:"
  echo "   curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install nodejs -y"
  exit 1
fi
echo "✅ Node.js ditemukan: $NODE_PATH ($(node -v))"

# Stop service lama jika ada
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  echo "⏹️  Menghentikan service lama..."
  systemctl stop "$SERVICE_NAME"
fi

# Install dependencies jika belum ada
if [ ! -d "${BOT_DIR}/node_modules" ]; then
  echo "📦 Menginstall dependencies npm..."
  cd "$BOT_DIR" && npm install
fi

# Buat file service
echo "📝 Membuat file service di ${SERVICE_FILE}..."
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Bot WhatsApp - klmpkbot
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=${BOT_DIR}
ExecStart=${NODE_PATH} ${BOT_DIR}/main.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=botwa
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Reload dan enable service
echo "🔄 Memuat ulang systemd..."
systemctl daemon-reload

echo "✅ Mengaktifkan service agar auto-start saat boot..."
systemctl enable "$SERVICE_NAME"

echo "▶️  Menjalankan service..."
systemctl start "$SERVICE_NAME"

sleep 2

# Cek status
if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo ""
  echo "========================================"
  echo "  ✅ SERVICE BERHASIL DIINSTALL!"
  echo "========================================"
  echo ""
  echo "📋 Perintah penting:"
  echo "   systemctl status $SERVICE_NAME    ← cek status"
  echo "   systemctl restart $SERVICE_NAME   ← restart bot"
  echo "   systemctl stop $SERVICE_NAME      ← hentikan bot"
  echo "   journalctl -u $SERVICE_NAME -f    ← lihat log realtime"
  echo ""
  echo "🔁 Bot akan otomatis nyala lagi jika mati atau VPS reboot."
else
  echo ""
  echo "❌ Service gagal jalan. Lihat error dengan:"
  echo "   journalctl -u $SERVICE_NAME -n 50"
fi
