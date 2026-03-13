#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   SONAR_URL="https://sonar.dev.abvprp.com" \
#   SONAR_TOKEN="your_token" \
#   PROJECT_KEY="aboveproperty_aboveproperty.java_AZh-ETkgTq6qrDHSx3LQ" \
#   PR_KEY="1419" \
#   ./.github/scripts/sonar/sonar_pr_uncovered_lines.sh
#
# Optional:
#   PAGE_SIZE=500 SHOW_CODE=true DEBUG=true ./.github/scripts/sonar/sonar_pr_uncovered_lines.sh

: "${SONAR_URL:?SONAR_URL is required}"
: "${SONAR_TOKEN:?SONAR_TOKEN is required}"
: "${PROJECT_KEY:?PROJECT_KEY is required}"
: "${PR_KEY:?PR_KEY is required}"

PAGE_SIZE="${PAGE_SIZE:-500}"
SHOW_CODE="${SHOW_CODE:-false}"
DEBUG="${DEBUG:-false}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Error: required command '$1' not found" >&2
    exit 1
  }
}

require_cmd curl
require_cmd jq
require_cmd python3

urlencode() {
  python3 - <<'PY' "$1"
import sys, urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=""))
PY
}

validate_auth() {
  local auth_json
  auth_json="$(curl -fsS -u "${SONAR_TOKEN}:" \
    "${SONAR_URL}/api/authentication/validate")"

  if [[ "$(echo "${auth_json}" | jq -r '.valid // "false"')" != "true" ]]; then
    echo "Error: SONAR_TOKEN is not authenticating successfully with Basic auth." >&2
    exit 1
  fi
}

api_get() {
  local url="$1"
  curl -fsS -u "${SONAR_TOKEN}:" "$url"
}

debug_payload_shape() {
  local label="$1"
  local json="$2"

  if [[ "${DEBUG}" == "true" ]]; then
    echo "DEBUG payload shape for ${label}:"
    echo "${json}" | jq '
      if type == "array" then
        {type: type, preview: .[0]}
      elif type == "object" then
        {type: type, keys: keys, preview: (.sources[0]? // .lines[0]? // .components[0]? // .)}
      else
        {type: type, preview: .}
      end
    '
    echo
  fi
}

validate_auth

echo "SonarQube PR new-code coverage details"
echo "SONAR_URL   = ${SONAR_URL}"
echo "PROJECT_KEY = ${PROJECT_KEY}"
echo "PR_KEY      = ${PR_KEY}"
echo

# IMPORTANT:
# - strategy=all so we get descendant files, not only direct children like pom.xml
# - qualifiers=FIL so we only keep files
FILES_JSON="$(api_get "${SONAR_URL}/api/measures/component_tree?component=$(urlencode "${PROJECT_KEY}")&pullRequest=$(urlencode "${PR_KEY}")&qualifiers=FIL&strategy=all&metricKeys=new_coverage,new_uncovered_lines,new_uncovered_conditions&ps=${PAGE_SIZE}")"

debug_payload_shape "component_tree" "${FILES_JSON}"

TOTAL_FILES="$(echo "${FILES_JSON}" | jq '.components | length')"

if [[ "${TOTAL_FILES}" -eq 0 ]]; then
  echo "No files returned for this PR/project combination."
  exit 0
fi

echo "Files found: ${TOTAL_FILES}"
echo

echo "${FILES_JSON}" | jq -r '
  def metric_value($metric):
    (
      [
        .measures[]?
        | select(.metric == $metric)
        | (.value // .period.value // (.periods[0].value // empty))
      ][0]
    ) // "0";

  .components[]
  | [
      .key,
      (.path // .name // .key),
      metric_value("new_coverage"),
      metric_value("new_uncovered_lines"),
      metric_value("new_uncovered_conditions")
    ]
  | @tsv
' | while IFS=$'\t' read -r FILE_KEY FILE_PATH NEW_COVERAGE NEW_UNCOVERED_LINES NEW_UNCOVERED_CONDITIONS; do

  ENCODED_FILE_KEY="$(urlencode "${FILE_KEY}")"

  # /api/sources/lines expects FILE_KEY, not PROJECT_KEY
  LINES_JSON="$(api_get "${SONAR_URL}/api/sources/lines?key=${ENCODED_FILE_KEY}&pullRequest=$(urlencode "${PR_KEY}")&from=1&to=10000")"

  debug_payload_shape "${FILE_PATH}" "${LINES_JSON}"

  if [[ "${SHOW_CODE}" == "true" ]]; then
    MATCHES="$(echo "${LINES_JSON}" | jq -r '
      def line_entries:
        if type == "array" then .
        elif type == "object" then (.sources // .lines // [])
        else []
        end;

      line_entries[]
      | select((.isNew // false) == true)
      | select(
          (
            ((.lineHits // .utLineHits // null) == 0)
            and
            ((.lineHits // .utLineHits // null) != null)
          )
          or
          ((.conditions // 0) > (.coveredConditions // 0))
        )
      | "\(.line)|hits=\(.lineHits // .utLineHits // "null")|cond=\(.coveredConditions // 0)/\(.conditions // 0)|\(.code // "" | gsub("<[^>]*>"; ""))"
    ')"
  else
    MATCHES="$(echo "${LINES_JSON}" | jq -r '
      def line_entries:
        if type == "array" then .
        elif type == "object" then (.sources // .lines // [])
        else []
        end;

      [
        line_entries[]
        | select((.isNew // false) == true)
        | select(
            (
              ((.lineHits // .utLineHits // null) == 0)
              and
              ((.lineHits // .utLineHits // null) != null)
            )
            or
            ((.conditions // 0) > (.coveredConditions // 0))
          )
        | .line
      ]
      | join(",")
    ')"
  fi

  # Print files that Sonar says have uncovered new-code lines/conditions
  if [[ "${NEW_UNCOVERED_LINES}" != "0" || "${NEW_UNCOVERED_CONDITIONS}" != "0" ]]; then
    echo "--------------------------------------------------------------------------------"
    echo "File: ${FILE_PATH}"
    echo "New coverage: ${NEW_COVERAGE}%"
    echo "New uncovered lines: ${NEW_UNCOVERED_LINES}"
    echo "New uncovered conditions: ${NEW_UNCOVERED_CONDITIONS}"

    if [[ -n "${MATCHES}" ]]; then
      if [[ "${SHOW_CODE}" == "true" ]]; then
        echo "Problematic new-code lines:"
        while IFS= read -r line; do
          [[ -n "${line}" ]] && echo "  ${line}"
        done <<< "${MATCHES}"
      else
        echo "Line numbers: ${MATCHES}"
      fi
    else
      echo "Line numbers: none returned by /api/sources/lines"
    fi

    echo
  fi
done