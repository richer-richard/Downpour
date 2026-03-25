#!/usr/bin/env bash
set -euo pipefail

APP_NAME="Downpour.app"
APP_DESTINATION="/Applications/${APP_NAME}"
APP_BUNDLE_PATH="apps/downpour-desktop/src-tauri/target/release/bundle/macos/${APP_NAME}"
FRONTEND_DIST_PATH="apps/downpour-desktop/dist"
TAURI_TARGET_PATH="apps/downpour-desktop/src-tauri/target"

log() {
  printf '\n[downpour-install] %s\n' "$*"
}

fail() {
  printf '\n[downpour-install] error: %s\n' "$*" >&2
  exit 1
}

prepend_path_once() {
  local value="$1"
  case ":$PATH:" in
    *":$value:"*) ;;
    *) PATH="$value:$PATH" ;;
  esac
}

node_major_version() {
  if ! command -v node >/dev/null 2>&1; then
    return 1
  fi

  node -p 'process.versions.node.split(".")[0]' 2>/dev/null
}

ensure_macos() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    fail "install.sh only supports macOS."
  fi
}

ensure_xcode_tools() {
  if xcode-select -p >/dev/null 2>&1; then
    log "Xcode developer tools found at $(xcode-select -p)"
    return
  fi

  log "Requesting Xcode Command Line Tools install"
  xcode-select --install || true
  fail "Finish installing Xcode Command Line Tools, then rerun ./install.sh."
}

ensure_homebrew() {
  if command -v brew >/dev/null 2>&1; then
    BREW_BIN="$(command -v brew)"
    log "Homebrew found at ${BREW_BIN}"
    return
  fi

  log "Installing Homebrew"
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  if [[ -x /opt/homebrew/bin/brew ]]; then
    BREW_BIN="/opt/homebrew/bin/brew"
  elif [[ -x /usr/local/bin/brew ]]; then
    BREW_BIN="/usr/local/bin/brew"
  else
    fail "Homebrew installation finished but brew was not found."
  fi
}

sync_homebrew_env() {
  if [[ -z "${BREW_BIN:-}" ]]; then
    BREW_BIN="$(command -v brew)"
  fi

  eval "$("${BREW_BIN}" shellenv)"
}

ensure_node() {
  local required_major=22
  local current_major=''

  current_major="$(node_major_version || true)"
  if [[ -n "${current_major}" && "${current_major}" -ge "${required_major}" ]]; then
    log "Node.js $(node -v) found"
    return
  fi

  log "Installing Node.js >= ${required_major} with Homebrew"
  if ! "${BREW_BIN}" list node >/dev/null 2>&1; then
    "${BREW_BIN}" install node
  fi

  sync_homebrew_env

  local brew_node_prefix=''
  brew_node_prefix="$("${BREW_BIN}" --prefix node 2>/dev/null || true)"
  if [[ -n "${brew_node_prefix}" && -d "${brew_node_prefix}/bin" ]]; then
    prepend_path_once "${brew_node_prefix}/bin"
  fi

  if ! command -v node >/dev/null 2>&1; then
    fail "Node.js installation completed but node is still unavailable."
  fi

  current_major="$(node_major_version)"
  if [[ "${current_major}" -lt "${required_major}" ]]; then
    fail "Node.js $(node -v) is below the required major version ${required_major}."
  fi

  log "Node.js $(node -v) ready"
}

ensure_pnpm() {
  local package_manager='pnpm@10.28.2'
  local expected_version='10.28.2'
  local current_version=''

  if [[ -f package.json ]]; then
    package_manager="$(sed -n 's/.*"packageManager": "\(pnpm@[^"]*\)".*/\1/p' package.json | head -n 1)"
    package_manager="${package_manager:-pnpm@10.28.2}"
    expected_version="${package_manager#pnpm@}"
  fi

  if ! command -v corepack >/dev/null 2>&1; then
    fail "corepack is unavailable even though Node.js is installed."
  fi

  corepack enable >/dev/null 2>&1 || true

  if command -v pnpm >/dev/null 2>&1; then
    current_version="$(pnpm --version 2>/dev/null || true)"
  fi

  if [[ "${current_version}" != "${expected_version}" ]]; then
    log "Activating ${package_manager}"
    corepack prepare "${package_manager}" --activate
  else
    log "pnpm ${current_version} found"
  fi

  if ! command -v pnpm >/dev/null 2>&1; then
    fail "pnpm is unavailable after Corepack activation."
  fi

  log "pnpm $(pnpm --version) ready"
}

ensure_rust() {
  if ! command -v rustup >/dev/null 2>&1; then
    log "Installing Rust stable toolchain"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile default --default-toolchain stable
  fi

  if [[ -f "${HOME}/.cargo/env" ]]; then
    # shellcheck source=/dev/null
    source "${HOME}/.cargo/env"
  fi

  prepend_path_once "${HOME}/.cargo/bin"

  if ! command -v rustup >/dev/null 2>&1; then
    fail "rustup is unavailable after installation."
  fi

  rustup toolchain install stable --profile minimal >/dev/null
  rustup default stable >/dev/null

  if ! command -v cargo >/dev/null 2>&1; then
    fail "cargo is unavailable after Rust installation."
  fi

  log "Rust $(rustc --version) ready"
}

install_workspace_dependencies() {
  log "Installing workspace dependencies with pnpm"
  pnpm install --frozen-lockfile
}

build_application() {
  log "Building Downpour from source"
  pnpm build
}

ensure_app_bundle_exists() {
  if [[ ! -d "${APP_BUNDLE_PATH}" ]]; then
    fail "Expected app bundle was not found at ${APP_BUNDLE_PATH}."
  fi

  log "Built app bundle found at ${APP_BUNDLE_PATH}"
}

copy_app_to_applications() {
  local use_sudo=0

  if [[ ! -w "/Applications" ]]; then
    use_sudo=1
    log "Administrator access is required to update ${APP_DESTINATION}"
  fi

  if [[ "${use_sudo}" -eq 1 ]]; then
    sudo rm -rf "${APP_DESTINATION}"
    sudo ditto "${APP_BUNDLE_PATH}" "${APP_DESTINATION}"
  else
    rm -rf "${APP_DESTINATION}"
    ditto "${APP_BUNDLE_PATH}" "${APP_DESTINATION}"
  fi

  if [[ ! -d "${APP_DESTINATION}" ]]; then
    fail "The app was built but ${APP_DESTINATION} was not created."
  fi

  log "Installed ${APP_NAME} to ${APP_DESTINATION}"
}

cleanup_build_outputs() {
  log "Removing local build artifacts"
  rm -rf "${FRONTEND_DIST_PATH}" "${TAURI_TARGET_PATH}"
}

print_summary() {
  log "Install complete. Launch Downpour from /Applications."
  log "If macOS warns on first launch, open the app from Finder or allow it in System Settings."
}

main() {
  local script_dir=''
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "${script_dir}"

  ensure_macos
  log "This installer may install Homebrew, Node.js, pnpm, and Rust, then build Downpour locally."
  ensure_xcode_tools
  ensure_homebrew
  sync_homebrew_env
  ensure_node
  ensure_pnpm
  ensure_rust
  install_workspace_dependencies
  build_application
  ensure_app_bundle_exists
  copy_app_to_applications
  cleanup_build_outputs
  print_summary
}

main "$@"
