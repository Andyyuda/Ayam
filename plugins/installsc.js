const { Client: SSHClient } = require('ssh2');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: '.installsc',
  command: ['.installsc'],
  async execute(conn, sender, args, msg) {
    if (args.length < 2) {
      return conn.sendMessage(sender, {
        text: '❌ Contoh penggunaan:\n.installsc <ip> <password>'
      }, { quoted: msg });
    }

    const [ip, password] = args;
    const username = 'root';
    const localFilePath = path.join(__dirname, '../install.sh');
    const remoteFilePath = '/root/install.sh';

    if (!fs.existsSync(localFilePath)) {
      return conn.sendMessage(sender, {
        text: '❌ File install.sh tidak ditemukan di folder bot.'
      }, { quoted: msg });
    }

    const ssh = new SSHClient();

    ssh.on('ready', () => {
      conn.sendMessage(sender, {
        text: `✅ Terhubung ke VPS *${ip}*, mengirim skrip instalasi...`
      }, { quoted: msg });

      ssh.sftp((err, sftp) => {
        if (err) {
          ssh.end();
          return conn.sendMessage(sender, { text: '❌ Gagal membuka sesi SFTP.' }, { quoted: msg });
        }

        sftp.fastPut(localFilePath, remoteFilePath, (err) => {
          if (err) {
            ssh.end();
            return conn.sendMessage(sender, { text: '❌ Gagal mengirim file install.sh ke VPS.' }, { quoted: msg });
          }

          conn.sendMessage(sender, {
            text: '✅ File `install.sh` berhasil dikirim, memulai instalasi...'
          }, { quoted: msg });

          const cmd = `chmod +x ${remoteFilePath} && ${remoteFilePath}`;

          ssh.exec(cmd, (err, stream) => {
            if (err) {
              ssh.end();
              return conn.sendMessage(sender, { text: '❌ Gagal menjalankan skrip instalasi.' }, { quoted: msg });
            }

            stream.on('close', () => {
              ssh.end();
              conn.sendMessage(sender, {
                text: `✅ *Instalasi Berhasil!*\n\n📡 *IP:* ${ip}\n👤 *User:* root\n🔑 *Password:* ${password}`
              }, { quoted: msg });
            }).on('data', (data) => {
              console.log(`STDOUT: ${data}`);
            }).stderr.on('data', (data) => {
              console.log(`STDERR: ${data}`);
            });
          });
        });
      });
    }).on('error', (err) => {
      conn.sendMessage(sender, {
        text: `❌ Gagal konek ke VPS *${ip}*:\n${err.message}`
      }, { quoted: msg });
    }).connect({
      host: ip,
      port: 22,
      username,
      password
    });
  }
};