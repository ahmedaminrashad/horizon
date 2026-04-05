#!/usr/bin/env bash
#
# Horizon Backend — install Nginx, PHP-FPM, and phpMyAdmin on Ubuntu (Nginx site only).
# Copies nginx-phpmyadmin.conf from this repo into /etc/nginx/sites-available/ and enables it.
#
#   chmod +x install-nginx-phpmyadmin.sh
#   sudo ./install-nginx-phpmyadmin.sh
#
# Optional:
#   NGINX_SERVER_NAME=sql.example.com   override server_name (default: from repo conf or sql.indicator-app.com)
#   PMA_VERSION=5.2.1                   phpMyAdmin tarball version
#   ALLOW_NON_UBUNTU=1                  skip Ubuntu OS check
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DEBIAN_FRONTEND=noninteractive

PMA_VERSION="${PMA_VERSION:-5.2.1}"
PMA_DIR="/usr/share/phpmyadmin"
NGINX_SITE="phpmyadmin"
NGINX_AVAIL="/etc/nginx/sites-available/${NGINX_SITE}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${NGINX_SITE}"

usage() {
  cat <<'EOF'
Usage: sudo ./install-nginx-phpmyadmin.sh [-h]

Installs: nginx, php-fpm, PHP extensions, phpMyAdmin (if missing), and enables the
nginx-phpmyadmin site from this repository.

Environment:
  NGINX_SERVER_NAME   server_name for the vhost (optional)
  PMA_VERSION         phpMyAdmin release (default: 5.2.1)
  ALLOW_NON_UBUNTU=1  allow non-Ubuntu hosts
EOF
}

check_ubuntu() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck source=/dev/null
    . /etc/os-release
    if [[ "${ID:-}" != "ubuntu" && "${ALLOW_NON_UBUNTU:-}" != "1" ]]; then
      echo "This script targets Ubuntu hosts. Detected: ${PRETTY_NAME:-unknown}" >&2
      echo "Set ALLOW_NON_UBUNTU=1 to run anyway." >&2
      exit 1
    fi
    echo "Host: ${PRETTY_NAME:-Ubuntu}"
  else
    echo "Warning: /etc/os-release not found; continuing." >&2
  fi
}

ensure_root() {
  if [[ "${EUID:-}" -ne 0 ]]; then
    echo "Re-running with sudo..." >&2
    exec sudo DEBIAN_FRONTEND=noninteractive bash "$0" "$@"
  fi
}

detect_php_fpm_sock() {
  local sock
  sock="$(find /var/run/php -maxdepth 1 -type s -name '*.sock' 2>/dev/null | head -n1 || true)"
  if [[ -n "$sock" ]]; then
    echo "$sock"
    return 0
  fi
  # Common default after apt install php8.3-fpm
  for s in /var/run/php/php8.4-fpm.sock /var/run/php/php8.3-fpm.sock /var/run/php/php8.2-fpm.sock /var/run/php/php-fpm.sock; do
    if [[ -S "$s" ]]; then
      echo "$s"
      return 0
    fi
  done
  return 1
}

enable_php_fpm() {
  local unit
  unit="$(systemctl list-unit-files 'php*-fpm.service' --no-legend 2>/dev/null | awk '{print $1}' | head -n1 || true)"
  if [[ -n "$unit" ]]; then
    systemctl enable --now "${unit}"
    echo "Enabled: ${unit}"
  else
    echo "Warning: no php*-fpm.service found; start PHP-FPM manually after install." >&2
  fi
}

install_phpmyadmin_tarball() {
  if [[ -d "$PMA_DIR" && -f "$PMA_DIR/index.php" ]]; then
    echo "phpMyAdmin already present at ${PMA_DIR}"
    return 0
  fi

  echo "Downloading phpMyAdmin ${PMA_VERSION}..."
  local tmp="/tmp/phpMyAdmin-${PMA_VERSION}-all-languages.tar.gz"
  wget -qO "$tmp" "https://files.phpmyadmin.net/phpMyAdmin/${PMA_VERSION}/phpMyAdmin-${PMA_VERSION}-all-languages.tar.gz"

  echo "Extracting to ${PMA_DIR}..."
  tar -xzf "$tmp" -C /tmp
  rm -f "$tmp"
  rm -rf "$PMA_DIR"
  mv "/tmp/phpMyAdmin-${PMA_VERSION}-all-languages" "$PMA_DIR"
  chown -R www-data:www-data "$PMA_DIR"

  if [[ ! -f "$PMA_DIR/config.inc.php" ]]; then
    cp "$PMA_DIR/config.sample.inc.php" "$PMA_DIR/config.inc.php"
    local secret
    secret="$(openssl rand -base64 32)"
    sed -i "s/\$cfg\['blowfish_secret'\] = '';/\$cfg['blowfish_secret'] = '${secret//\'/\\\'}';/" "$PMA_DIR/config.inc.php"
  fi

  mkdir -p "$PMA_DIR/config"
  chmod 775 "$PMA_DIR/config" 2>/dev/null || chmod 777 "$PMA_DIR/config"
  echo "phpMyAdmin installed at ${PMA_DIR}"
}

deploy_nginx_conf() {
  local sock="$1"
  local server_name_override="${NGINX_SERVER_NAME:-}"

  if [[ -f "${SCRIPT_DIR}/nginx-phpmyadmin.conf" ]]; then
    cp "${SCRIPT_DIR}/nginx-phpmyadmin.conf" "$NGINX_AVAIL"
  else
    echo "nginx-phpmyadmin.conf not found in ${SCRIPT_DIR}; writing minimal vhost." >&2
    cat >"$NGINX_AVAIL" <<EOF
server {
    listen 80;
    server_name ${server_name_override:-sql.indicator-app.com};
    root ${PMA_DIR};
    index index.php;
    client_max_body_size 100M;
    location / { try_files \$uri \$uri/ =404; }
    location ~ \\.php\$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:${sock};
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 300;
        fastcgi_send_timeout 300;
    }
    location ~ /\\.(ht|git) { deny all; }
}
EOF
  fi

  # Point fastcgi_pass at the real socket (repo file may hardcode php8.3).
  sed -i "s#unix:/var/run/php/php[0-9.]*-fpm\\.sock#unix:${sock}#g" "$NGINX_AVAIL"
  sed -i "s#unix:/var/run/php/php-fpm\\.sock#unix:${sock}#g" "$NGINX_AVAIL"

  if [[ -n "$server_name_override" ]]; then
    sed -i "s/^[[:space:]]*server_name[^;]*;/    server_name ${server_name_override};/" "$NGINX_AVAIL"
  fi

  ln -sf "$NGINX_AVAIL" "$NGINX_ENABLED"
}

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  ensure_root "$@"
  check_ubuntu

  apt-get update -qq
  apt-get install -y \
    nginx \
    php-fpm \
    php-mysql \
    php-mbstring \
    php-zip \
    php-gd \
    php-curl \
    php-xml \
    php-json \
    wget \
    openssl

  enable_php_fpm

  local sock
  sock="$(detect_php_fpm_sock || true)"
  if [[ -z "$sock" ]]; then
    echo "PHP-FPM socket not found yet; restarting FPM..." >&2
    systemctl restart "php$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')-fpm" 2>/dev/null || true
    sock="$(detect_php_fpm_sock)" || {
      echo "Could not find PHP-FPM socket under /var/run/php. Install php-fpm and re-run." >&2
      exit 1
    }
  fi
  echo "Using PHP-FPM socket: ${sock}"

  install_phpmyadmin_tarball
  deploy_nginx_conf "$sock"

  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx

  echo ""
  echo "Done. Nginx + phpMyAdmin site enabled."
  echo "  Config: ${NGINX_AVAIL}"
  echo "  Root:   ${PMA_DIR}"
  echo "  Check server_name in the vhost and point DNS / firewall accordingly."
}

main "$@"
