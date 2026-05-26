#!/bin/bash
# Generate a self-signed TLS certificate for nginx.
# Run this once on the VPS before starting docker compose.
set -e
mkdir -p "$(dirname "$0")/ssl"
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$(dirname "$0")/ssl/key.pem" \
  -out    "$(dirname "$0")/ssl/cert.pem" \
  -subj "/C=AZ/ST=Baku/L=Baku/O=DMS/CN=$(hostname -I | awk '{print $1}')"
echo "SSL certificate generated in nginx/ssl/"
