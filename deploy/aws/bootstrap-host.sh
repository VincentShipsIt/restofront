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

if ! grep -q "# BEGIN RESTOFRONT" "$caddyfile"; then
  temporary_caddyfile="$(mktemp /etc/caddy/Caddyfile.XXXXXX)"
  {
    printf '%s\n' '{'
    printf '%s\n' '	on_demand_tls {'
    printf '%s\n' '		ask http://restofront:3000/api/domains/authorize'
    printf '%s\n' '	}'
    printf '%s\n\n' '}'
    cat "$caddyfile"
    printf '\n'
    cat "$caddy_fragment_source"
  } >"$temporary_caddyfile"

  docker run --rm \
    --volume "$temporary_caddyfile:/etc/caddy/Caddyfile:ro" \
    caddy:2 \
    caddy validate --config /etc/caddy/Caddyfile
  install -m 644 "$temporary_caddyfile" "$caddyfile"
  rm -f "$temporary_caddyfile"
fi

docker exec shipshit-caddy caddy validate --config /etc/caddy/Caddyfile
docker exec shipshit-caddy caddy reload --config /etc/caddy/Caddyfile
echo "Restofront host bootstrap complete; Caddy backup: ${backup}"
