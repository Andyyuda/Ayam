#!/bin/bash

# Hapus file dan direktori lama
echo "🧹 Menghapus file dan folder lama..."
rm -rf botwa

# Perbarui sistem
echo "🔄 Update dan upgrade sistem..."
sudo apt update && sudo apt upgrade -y

# Hapus nodejs dan npm versi lama
echo "🧼 Menghapus Node.js dan npm versi lama..."
sudo apt purge -y nodejs npm
sudo rm -rf /usr/local/bin/node /usr/local/bin/npm /usr/bin/node /usr/bin/npm /usr/lib/node_modules

# Install curl jika belum ada
echo "⬇️ Memastikan curl terinstal..."
sudo apt install curl -y

# Install Node.js 20.x LTS dari NodeSource
echo "📦 Menginstal Node.js versi 20.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi versi Node dan npm
echo "🧪 Verifikasi Node dan npm..."
echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"

echo "📦 Menginstal dependensi npm..."
cd botwa
npm install
# Jalankan bot
echo "🚀 Menjalankan bot..."
npm start<<<