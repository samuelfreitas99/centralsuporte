#!/bin/sh
# Publica a Central no túnel Cloudflare já existente neste servidor (o mesmo do voleidraft/finapp).
#
#   sudo ./deploy/cloudflare-tunnel.sh                       # usa suporte.voleidraft.top
#   sudo ./deploy/cloudflare-tunnel.sh outro.voleidraft.top
#
# O que faz (idempotente):
#   1. backup de /etc/cloudflared/config.yml
#   2. adiciona a regra "hostname -> http://localhost:5173" antes da regra final (404), sem tocar nas outras
#   3. valida a configuração; se falhar, restaura o backup
#   4. cria o registro DNS do subdomínio apontando para o túnel
#   5. reinicia o cloudflared
set -eu

HOST="${1:-suporte.voleidraft.top}"
CONFIG=/etc/cloudflared/config.yml
SERVICE_URL=http://localhost:5173

[ "$(id -u)" -eq 0 ] || { echo "Rode com sudo."; exit 1; }
[ -f "$CONFIG" ] || { echo "Não encontrei $CONFIG."; exit 1; }

TUNNEL=$(awk '/^tunnel:/ {print $2}' "$CONFIG")
BACKUP="$CONFIG.bak-$(date +%Y%m%d-%H%M%S)"
cp "$CONFIG" "$BACKUP"
echo "Backup: $BACKUP"

if grep -q "hostname: \"$HOST\"" "$CONFIG"; then
  echo "Regra para $HOST já existe; mantendo."
else
  awk -v host="$HOST" -v svc="$SERVICE_URL" '
    /^[[:space:]]*- service: http_status:404/ && !done {
      print "  # Central de Suporte"
      print "  - hostname: \"" host "\""
      print "    service: " svc
      print ""
      done = 1
    }
    { print }
  ' "$BACKUP" > "$CONFIG"
fi

if ! cloudflared tunnel --config "$CONFIG" ingress validate; then
  echo "Configuração inválida; restaurando o backup."
  cp "$BACKUP" "$CONFIG"
  exit 1
fi
cloudflared tunnel --config "$CONFIG" ingress rule "https://$HOST"

echo "Criando DNS $HOST -> túnel $TUNNEL ..."
if ! cloudflared tunnel route dns "$TUNNEL" "$HOST"; then
  echo "Não foi possível criar o DNS automaticamente (falta o cert.pem do cloudflared login?)."
  echo "Crie no painel da Cloudflare: CNAME  ${HOST%%.*}  ->  $TUNNEL.cfargotunnel.com  (Proxy ligado)"
fi

systemctl restart cloudflared
sleep 3
systemctl is-active --quiet cloudflared && echo "cloudflared reiniciado. Teste: https://$HOST"
