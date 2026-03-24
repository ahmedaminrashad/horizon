#!/usr/bin/env bash
#
# Horizon Backend — install system/runtime dependencies on Ubuntu (e.g. 25.10).
# Does not clone the app or run npm install in the project; use deploy.sh for that.
#
#   chmod +x install-deps-host.sh install-prerequisites.sh
#   ./install-deps-host.sh
#
# Optional (non-interactive):
#   INSTALL_NGINX=yes|no          (default: no)
#   INSTALL_PHPMYADMIN=yes|no   (default: no)
#   ALLOW_NON_UBUNTU=1          skip Ubuntu OS check
#   ALLOW_ROOT=1                allow running install-prerequisites as root (e.g. sudo ALLOW_ROOT=1 ./install-deps-host.sh)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DEBIAN_FRONTEND=noninteractive

# Sensible defaults for servers/CI; override when running this script only.
export INSTALL_NGINX="${INSTALL_NGINX:-no}"
export INSTALL_PHPMYADMIN="${INSTALL_PHPMYADMIN:-no}"

usage() {
  cat <<'EOF'
Usage: install-deps-host.sh [-h]

 install-prerequisites.sh with Ubuntu check and non-interactive defaults.
 Optional packages (see install-prerequisites.sh):
   INSTALL_NGINX=yes|no
   INSTALL_PHPMYADMIN=yes|no

Examples:
  ./install-deps-host.sh
  INSTALL_NGINX=yes ./install-deps-host.sh
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

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  check_ubuntu

  if [[ ! -f "${SCRIPT_DIR}/install-prerequisites.sh" ]]; then
    echo "install-prerequisites.sh not found in ${SCRIPT_DIR}" >&2
    exit 1
  fi

  bash "${SCRIPT_DIR}/install-prerequisites.sh"
}

main "$@"
