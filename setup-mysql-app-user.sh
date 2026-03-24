#!/usr/bin/env bash
#
# Create a MySQL user with a password and grant privileges (Horizon Backend).
# Run on the server as a user with sudo (uses sudo mysql when root uses auth_socket).
#
# Default: ALL PRIVILEGES on one database (e.g. horizon) — recommended for the app.
# Optional: full server-wide grants on *.* (use with care).
#
# Examples:
#   sudo ./setup-mysql-app-user.sh
#
# Non-interactive:
#   sudo MYSQL_USER=horizon_app MYSQL_PASSWORD='your-secure-pass' ./setup-mysql-app-user.sh
#
# Remote connections (any host):
#   sudo MYSQL_HOST='%' MYSQL_USER=horizon_app MYSQL_PASSWORD='...' ./setup-mysql-app-user.sh
#
# Full server access (superuser-style on *.*):
#   sudo MYSQL_GRANT_SCOPE=server MYSQL_GRANT_SERVER_CONFIRM=YES MYSQL_USER=admin MYSQL_PASSWORD='...' ./setup-mysql-app-user.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }

# Escape single quotes for use inside SQL string literals
escape_sql_string() { printf '%s' "$1" | sed "s/'/''/g"; }

echo "=========================================="
echo "MySQL app user — create & grant"
echo "=========================================="
echo ""

if ! command -v mysql &>/dev/null; then
  print_error "mysql client not found. Install MySQL server first."
  exit 1
fi

if ! systemctl is-active --quiet mysql 2>/dev/null; then
  print_info "Starting MySQL..."
  sudo systemctl start mysql
  sleep 1
fi

mysql_as_root() {
  if sudo mysql -u root -e "SELECT 1" &>/dev/null; then
    sudo mysql -u root "$@"
  elif [[ -n "${MYSQL_ROOT_PASSWORD:-}" ]] && mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SELECT 1" &>/dev/null; then
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" "$@"
  else
    print_error "Cannot connect as MySQL root."
    print_info "Try: sudo mysql -u root   or set MYSQL_ROOT_PASSWORD for password auth."
    exit 1
  fi
}

MYSQL_USER="${MYSQL_USER:-horizon_app}"
MYSQL_DATABASE="${MYSQL_DATABASE:-horizon}"
MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_GRANT_SCOPE="${MYSQL_GRANT_SCOPE:-database}"

if [[ -z "${MYSQL_PASSWORD:-}" ]]; then
  read -sp "Password for MySQL user '${MYSQL_USER}'@${MYSQL_HOST}: " MYSQL_PASSWORD
  echo ""
  read -sp "Confirm password: " MYSQL_PASSWORD_CONFIRM
  echo ""
  if [[ "$MYSQL_PASSWORD" != "$MYSQL_PASSWORD_CONFIRM" ]]; then
    print_error "Passwords do not match."
    exit 1
  fi
fi

if [[ -z "$MYSQL_PASSWORD" ]]; then
  print_error "Password cannot be empty."
  exit 1
fi

if [[ "$MYSQL_GRANT_SCOPE" != "database" && "$MYSQL_GRANT_SCOPE" != "server" ]]; then
  print_error "MYSQL_GRANT_SCOPE must be 'database' or 'server' (got: $MYSQL_GRANT_SCOPE)"
  exit 1
fi

if [[ "$MYSQL_GRANT_SCOPE" == "server" ]]; then
  print_info "MYSQL_GRANT_SCOPE=server → grants ALL PRIVILEGES ON *.* (full server access)."
  if [[ "${MYSQL_GRANT_SERVER_CONFIRM:-}" != "YES" ]]; then
    read -p "Type YES to confirm: " confirm
    if [[ "$confirm" != "YES" ]]; then
      print_error "Aborted."
      exit 1
    fi
  fi
fi

PW_SQL="$(escape_sql_string "$MYSQL_PASSWORD")"

# Identifier quoting: allow alphanumeric and underscore only (avoid SQL injection in names)
if [[ ! "$MYSQL_USER" =~ ^[a-zA-Z0-9_]+$ ]] || [[ ! "$MYSQL_DATABASE" =~ ^[a-zA-Z0-9_]+$ ]]; then
  print_error "MYSQL_USER and MYSQL_DATABASE must contain only letters, numbers, and underscores."
  exit 1
fi

if [[ "$MYSQL_HOST" != "%" && "$MYSQL_HOST" != "localhost" && "$MYSQL_HOST" != "127.0.0.1" ]]; then
  if [[ ! "$MYSQL_HOST" =~ ^[a-zA-Z0-9.%_-]+$ ]]; then
    print_error "MYSQL_HOST contains invalid characters."
    exit 1
  fi
fi

print_info "Applying SQL..."

mysql_as_root <<SQL
CREATE DATABASE IF NOT EXISTS ${MYSQL_DATABASE};
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'${MYSQL_HOST}' IDENTIFIED WITH mysql_native_password BY '${PW_SQL}';
SQL

if [[ "$MYSQL_GRANT_SCOPE" == "database" ]]; then
  mysql_as_root <<SQL
GRANT ALL PRIVILEGES ON ${MYSQL_DATABASE}.* TO '${MYSQL_USER}'@'${MYSQL_HOST}';
FLUSH PRIVILEGES;
SQL
else
  mysql_as_root <<SQL
GRANT ALL PRIVILEGES ON *.* TO '${MYSQL_USER}'@'${MYSQL_HOST}' WITH GRANT OPTION;
FLUSH PRIVILEGES;
SQL
fi

print_success "User '${MYSQL_USER}'@'${MYSQL_HOST}' is ready."
echo ""
print_info "Add to your .env:"
echo "  DB_HOST=localhost"
echo "  DB_PORT=3306"
echo "  DB_USERNAME=${MYSQL_USER}"
echo "  DB_PASSWORD=<the password you set>"
echo "  DB_DATABASE=${MYSQL_DATABASE}"
echo ""
if [[ "$MYSQL_GRANT_SCOPE" == "database" ]]; then
  print_info "Granted: ALL PRIVILEGES ON ${MYSQL_DATABASE}.*"
else
  print_info "Granted: ALL PRIVILEGES ON *.* (WITH GRANT OPTION)"
fi
