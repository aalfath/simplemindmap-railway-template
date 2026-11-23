#!/bin/sh
# Start script for SimpleMindMap on Railway: checks the settings, prepares the volume,
# writes the basic-auth file and the nginx config, then runs nginx in the foreground.
# Any setup failure exits non-zero so Railway's ON_FAILURE restart policy applies.
set -eu

PORT="${PORT:-8080}"
DATA_DIR="${DATA_DIR:-/data}"
AUTH_USERNAME="${AUTH_USERNAME:-admin}"
AUTH_PASSWORD="${AUTH_PASSWORD:-}"
MAX_BODY_SIZE="${MAX_BODY_SIZE:-25m}"

fail() { echo "simplemindmap: $*" >&2; exit 1; }

case "$PORT" in ''|*[!0-9]*) fail "PORT must be a number (got '$PORT')";; esac
[ -n "$AUTH_PASSWORD" ] || fail "AUTH_PASSWORD is empty. Set it (the template generates one) so your maps are not public."
[ "${#AUTH_PASSWORD}" -ge 8 ] || fail "AUTH_PASSWORD must be at least 8 characters."
case "$AUTH_USERNAME" in ''|*:*|*' '*) fail "AUTH_USERNAME must be non-empty, without ':' or spaces.";; esac
case "$AUTH_PASSWORD" in *"
"*) fail "AUTH_PASSWORD must be a single line.";; esac

# Server-side storage: one file per localStorage key under $DATA_DIR/api/state/.
mkdir -p "$DATA_DIR/api/state" "$DATA_DIR/tmp"
touch "$DATA_DIR/.write-test" 2>/dev/null || fail "$DATA_DIR is not writable (is the volume attached?)"
rm "$DATA_DIR/.write-test"
chown -R nginx:nginx "$DATA_DIR/api" "$DATA_DIR/tmp"

# nginx reads this file in its worker (user nginx). {PLAIN} keeps us free of extra tools.
umask 027
printf '%s:{PLAIN}%s\n' "$AUTH_USERNAME" "$AUTH_PASSWORD" > /etc/nginx/simplemindmap.htpasswd
chown root:nginx /etc/nginx/simplemindmap.htpasswd
chmod 640 /etc/nginx/simplemindmap.htpasswd
umask 022

sed -e "s#__PORT__#${PORT}#g" \
    -e "s#__DATA_DIR__#${DATA_DIR}#g" \
    -e "s#__MAX_BODY_SIZE__#${MAX_BODY_SIZE}#g" \
    /etc/nginx/simplemindmap.conf.template > /etc/nginx/nginx.conf

nginx -t -q || fail "nginx config test failed"
echo "simplemindmap: SimpleMindMap $(cat /app/VERSION) on port ${PORT}, data in ${DATA_DIR}/api/state, login user '${AUTH_USERNAME}'"
exec nginx -g 'daemon off;'
