#!/usr/bin/env bash
#
# Horizon Backend — start deployment on an Ubuntu host (e.g. Ubuntu 25.10).
# Run from the repository root on the server after cloning.
#
#   chmod +x start-deploy-host.sh deploy.sh install-deps-host.sh
#   ./start-deploy-host.sh --full    # first-time: prerequisites + deploy
#   ./start-deploy-host.sh           # routine: deploy only (pull, build, migrate, PM2)
#
# Environment variables APP_DIR, NODE_ENV, PORT are passed through to deploy.sh.
# To skip the Ubuntu check: ALLOW_NON_UBUNTU=1 ./start-deploy-host.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

usage() {
  cat <<'EOF'
Usage: start-deploy-host.sh [options]

  Default: runs deploy.sh (assumes Node, npm, PM2, MySQL are already set up).

Options:
  --full     Run install-deps-host.sh first, then deploy.sh.
  -h, --help Show this help.

Environment:
  APP_DIR, NODE_ENV, PORT     Forwarded to deploy.sh
  ALLOW_NON_UBUNTU=1          Continue if OS is not Ubuntu
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
  local run_full=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --full) run_full=1 ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1" >&2
        usage
        exit 1
        ;;
    esac
    shift
  done

  check_ubuntu

  if [[ ! -f "${SCRIPT_DIR}/deploy.sh" ]]; then
    echo "deploy.sh not found in ${SCRIPT_DIR}" >&2
    exit 1
  fi

  if [[ "${run_full}" -eq 1 ]]; then
    if [[ ! -f "${SCRIPT_DIR}/install-deps-host.sh" ]]; then
      echo "install-deps-host.sh not found in ${SCRIPT_DIR}" >&2
      exit 1
    fi
    bash "${SCRIPT_DIR}/install-deps-host.sh"
  fi

  bash "${SCRIPT_DIR}/deploy.sh"
}

main "$@"
