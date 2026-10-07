#!/usr/bin/env bash
# Donut Bot - Masaüstü Uygulaması Başlatıcı
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Eğer yerel Tor/SOCKS5 proxy kuruluysa ve çalışmıyorsa başlat
if [ -f /sbin/tor ] && ! nc -z 127.0.0.1 9050 2>/dev/null; then
    /sbin/tor --SocksPort 9050 --DataDirectory /tmp/tor_data --RunAsDaemon 1 2>/dev/null || true
fi

exec npx electron desktop/main.js "$@"
