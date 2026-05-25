#!/usr/bin/env bash
# RoboShosso · capa de simulación.
# Detecta el stack del repositorio, instala dependencias y ejecuta sus
# chequeos (lint, tests, build). No aborta al primer fallo: corre todo y
# resume el resultado en una tabla Markdown.
#
# Uso: roboshosso/simulate.sh [archivo_resumen.md]
# Salida: 0 si todos los pasos pasan; 1 si alguno falla.

set -uo pipefail

SUMMARY_FILE="${1:-roboshosso-sim.md}"
OVERALL=0
ROWS=""
DETECTED=""

# Ejecuta un paso, captura su código de salida y registra el resultado.
run_step() {
  local name="$1"; shift
  echo "::group::${name}"
  if "$@"; then
    ROWS+="| ${name} | ✅ pasó |"$'\n'
    echo "→ ${name}: OK"
  else
    local code=$?
    ROWS+="| ${name} | ❌ falló (exit ${code}) |"$'\n'
    OVERALL=1
    echo "→ ${name}: FALLÓ (exit ${code})"
  fi
  echo "::endgroup::"
}

note() { DETECTED+="- ${1}"$'\n'; }

# ---------------------------------------------------------------- Node.js
if [[ -f package.json ]]; then
  note "Node.js (package.json)"
  if [[ -f package-lock.json ]]; then
    run_step "npm ci" npm ci
  else
    run_step "npm install" npm install
  fi
  # --if-present: el paso pasa silenciosamente si el script no existe.
  run_step "lint"  npm run lint  --if-present
  run_step "test"  npm test      --if-present
  run_step "build" npm run build --if-present
fi

# ----------------------------------------------------------------- Python
if [[ -f requirements.txt || -f pyproject.toml || -f setup.py ]]; then
  note "Python"
  python3 -m pip install --upgrade pip >/dev/null 2>&1 || true
  if [[ -f requirements.txt ]]; then
    run_step "pip install -r requirements.txt" python3 -m pip install -r requirements.txt
  elif [[ -f pyproject.toml || -f setup.py ]]; then
    run_step "pip install ." python3 -m pip install .
  fi
  if command -v ruff >/dev/null 2>&1; then run_step "ruff" ruff check .; fi
  if python3 -c "import pytest" >/dev/null 2>&1; then run_step "pytest" python3 -m pytest -q; fi
fi

# --------------------------------------------------------------------- Go
if [[ -f go.mod ]]; then
  note "Go (go.mod)"
  run_step "go build" go build ./...
  run_step "go test"  go test ./...
fi

# ------------------------------------------------------------------- Rust
if [[ -f Cargo.toml ]]; then
  note "Rust (Cargo.toml)"
  run_step "cargo build" cargo build --quiet
  run_step "cargo test"  cargo test  --quiet
fi

# --------------------------------------------- Fallback: Makefile con test
if [[ -z "${DETECTED}" && -f Makefile ]] && grep -qE '^test:' Makefile; then
  note "Makefile (target test)"
  run_step "make test" make test
fi

# ----------------------------------------------------------------- Resumen
if [[ -z "${ROWS}" ]]; then
  STATUS_LINE="ℹ️ No detecté un stack conocido (Node, Python, Go, Rust o Makefile). No se ejecutó ninguna simulación."
  TABLE=""
else
  if [[ "${OVERALL}" -eq 0 ]]; then
    STATUS_LINE="✅ **Simulación OK** — todos los chequeos pasaron."
  else
    STATUS_LINE="❌ **Simulación con fallos** — revisa la tabla."
  fi
  TABLE="| Paso | Resultado |"$'\n'"| --- | --- |"$'\n'"${ROWS}"
fi

{
  echo '<img src="https://robohash.org/roboshosso.png?set=set1&size=110x110" align="right" width="96" height="96" alt="RoboShosso" />'
  echo "## 🤖 RoboShosso · Simulación"
  echo ""
  echo "**Stack detectado:**"
  echo ""
  if [[ -n "${DETECTED}" ]]; then echo "${DETECTED}"; else echo "_(ninguno)_"; fi
  echo ""
  echo "${STATUS_LINE}"
  echo ""
  echo "${TABLE}"
} > "${SUMMARY_FILE}"

# También al resumen del job en GitHub si está disponible.
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  cat "${SUMMARY_FILE}" >> "${GITHUB_STEP_SUMMARY}"
fi

cat "${SUMMARY_FILE}"
exit "${OVERALL}"
