#!/usr/bin/env bash
set -Eeuo pipefail

deploy_script_source="${1:-}"
caddy_fragment_source="${2:-}"
if [[ ! -f "$deploy_script_source" || ! -f "$caddy_fragment_source" ]]; then
  echo "Usage: bootstrap-host.sh <deploy-script> <caddy-fragment>" >&2
  exit 2
fi

install -m 755 "$deploy_script_source" /usr/local/bin/deploy-restofront
install -d -m 700 /etc/restofront /var/lib/restofront

caddyfile="/etc/caddy/Caddyfile"
backup="/etc/caddy/Caddyfile.$(date -u +%Y%m%dT%H%M%SZ).bak"
cp "$caddyfile" "$backup"

temporary_body="$(mktemp /etc/caddy/Caddyfile.body.XXXXXX)"
temporary_caddyfile="$(mktemp /etc/caddy/Caddyfile.XXXXXX)"
trap 'rm -f "$temporary_body" "$temporary_caddyfile"' EXIT

awk '
  /^# BEGIN RESTOFRONT$/ { in_restofront = 1; next }
  /^# END RESTOFRONT$/ { in_restofront = 0; next }
  !in_restofront { print }
' "$caddyfile" >"$temporary_body"

{
  if ! grep -q "on_demand_tls" "$temporary_body"; then
    printf '%s\n' '{'
    printf '%s\n' '	on_demand_tls {'
    printf '%s\n' '		ask http://restofront:3000/api/domains/authorize'
    printf '%s\n' '	}'
    printf '%s\n\n' '}'
  fi
  cat "$temporary_body"
  printf '\n'
  cat "$caddy_fragment_source"
} >"$temporary_caddyfile"

docker run --rm \
  --volume "$temporary_caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2 \
  caddy validate --config /etc/caddy/Caddyfile
install -m 644 "$temporary_caddyfile" "$caddyfile"

docker exec shipshit-caddy caddy validate --config /etc/caddy/Caddyfile
docker exec shipshit-caddy caddy reload --config /etc/caddy/Caddyfile
echo "Restofront host bootstrap complete; Caddy backup: ${backup}"
