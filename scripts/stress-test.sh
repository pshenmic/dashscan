#!/usr/bin/env bash
#
# Load test for the dashscan API, modelled on real production traffic.
#
# The endpoint mix and the sample addresses / tx hashes / block hashes below were
# taken from a real haproxy access log, so the request distribution and the
# cache-hit profile resemble what production actually serves.
#
# Engine is vegeta: it paces requests at an exact open-loop rate, so a slow
# server does NOT slow the generator down (no coordinated omission). That
# matters here — a closed-loop tool would quietly drop from 200 rps to 40 rps
# the moment the API starts struggling, and hide the very problem you're hunting.
#
#   ./stress-test.sh                      # 200 rps for 60s
#   RATE=50 DURATION=30s ./stress-test.sh # gentler
#   ./stress-test.sh ramp                 # 25 -> 50 -> 100 -> 150 -> 200 rps
#   ONLY=balance/chart ./stress-test.sh   # isolate one endpoint
#   ./stress-test.sh --yes                # skip the confirmation prompt
#
set -euo pipefail

BASE_URL="${BASE_URL:-https://dashscan.pshenmic.dev}"
RATE="${RATE:-200}"
DURATION="${DURATION:-20s}"
TIMEOUT="${TIMEOUT:-30s}"
CONNECTIONS="${CONNECTIONS:-500}"
RAMP_STEPS="${RAMP_STEPS:-25 50 100 150 200}"
RAMP_STEP_DURATION="${RAMP_STEP_DURATION:-30s}"
OUT_DIR="${OUT_DIR:-./loadtest-results}"
ONLY="${ONLY:-}"          # substring filter: only fire targets whose URL matches
XPUB="${XPUB:-}"          # set to exercise POST /xpub and POST /xpub/addresses

MODE="steady"
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    ramp)          MODE="ramp" ;;
    steady)        MODE="steady" ;;
    -y|--yes)      ASSUME_YES=1 ;;
    -h|--help)     sed -n '2,26p' "$0"; exit 0 ;;
    *)             echo "unknown argument: $arg" >&2; exit 1 ;;
  esac
done

# ---------------------------------------------------------------- dependencies

if ! command -v vegeta >/dev/null 2>&1; then
  cat >&2 <<'EOF'
vegeta is not installed. Install it with one of:

  brew install vegeta                                   # macOS
  go install github.com/tsenart/vegeta/v12@latest       # any platform with Go
  # or grab a release binary: https://github.com/tsenart/vegeta/releases

EOF
  exit 1
fi

# `shuf` is GNU-only; fall back to gshuf (brew coreutils) or perl on macOS.
shuffle() {
  if   command -v shuf  >/dev/null 2>&1; then shuf
  elif command -v gshuf >/dev/null 2>&1; then gshuf
  else perl -MList::Util=shuffle -e 'print shuffle(<STDIN>)'
  fi
}

# GNU date and BSD date disagree on relative dates.
date_days_ago() {
  if date -u -d '30 days ago' >/dev/null 2>&1; then
    date -u -d "$1 days ago" +%Y-%m-%dT%H:%M:%S.000Z
  else
    date -u -v-"$1"d +%Y-%m-%dT%H:%M:%S.000Z
  fi
}

# ------------------------------------------------------------- sample data
# Real identifiers observed in production. Mixed on purpose: some resolve (200),
# some don't (404). Testing only the happy path would understate DB load, and
# testing only misses would overstate cache effectiveness.

ADDRESSES_HIT=(
  XmqaBFjcEGBk3H4kc3m5HJfmAxNRr7HUHg
  XjUJKMEfyFUkJe2xoZMbwc4RzLg2uG6Ro5
  Xog8JpzJwvN1smpdLQWUBmDhcv4ZRokS3X
  XjSUPPNEg38TKARyi8tDRnxQdREvehe5Ts
  Xd4Z4T3P5uPEkinnU4gfPS4U1LgDnoTcfq
  XhrW5rePDYPCfY8wVnYphhaoVN4VCzWjQF
)

# This one returned 615KB in 3.9s in the log — the single heaviest request seen.
# Kept separate and used sparingly so it doesn't dominate the average.
ADDRESS_WHALE=XwjJQZDPAwLHuTxQTDH29tvrJk8G79XyqC

ADDRESSES_MISS=(
  XbxzUdJ2Gcsm8mWt4Hv2wmLaBp9zZ1rD9S
  XkoFhqcnennw4MoUBhTD99a5xg4ZyVhUY7
  XsvDx59pyMtakSE6WDNbU9JeVQJD4RBXGj
  Xf22SpQuzxtzwTQakMW9jftonivQE4ChNL
  Xh4LuZSkivYi1RtsedyLKfgKYjkmWweCyn
  Xb2xhtDc7nPkbeSNpEa9afGqsbZtn46ZSJ
  XpnEEUS94SaeySHfS3vboofg8j5ApQ7gvc
  XkjZSuA4VA6cRFVo4YDjAPCWpBn9UASucL
)

TXS=(
  07bfc86fad1163fcec5fb4569ff75552746a4d5b2bd5b10a636a83b46eaf5b13
  7709c868805aa351213dfa431b0d308b9f9129d3b32bdc9d1092f10301705f3a
  04e04fb0c70a044d74e03c0aee660e04a675fe6b4aed9b93d51a5e542f4e9bd6
  cd3b844d7e66e936465ec934c79ee8001714d527bc6576d4c59c8dcbabafb1a4
  7709e43103f5d297e8f158cb820249f4712442cdcda0f54c467581977bd00cef
  7993d9243d3d01cc4c004899d45593fa30cc66ac6ed5263a89f7e81543660f74
  922269c41d8ffb02710ae6d9969da5057c3baff89a00ad4a3d4a83f4e8028b18
  48cdc25cae3ee21b37d18f4bcf2049b0148d8b5499a6a8e9e064a541c64803df
  77216576965e2da9bb43e79ccfcea8ac09d61758da6af8ccb060c9f6333a5a89
  4b018f7d4e825ffce78af2cd95c8189189f03db62fd2c034e2547dc61694f626
  9f6c79c83a786676e70d04db886b3a5a1935c95621e575da9c04c3426daba4e9
  2c96362dc7997502aadc5a6685a0ecdb1820a50822235754eb71ed06703f6ef3
  8331a6cb5d6c716a0037d0cc720c9d468cc64be22965c7a72c81ee36b5978b21
)

# Fat transactions: 26KB-78KB responses, up to 795ms upstream in the log.
TXS_HEAVY=(
  11b0e33de0c86f4bb852638e280f8837d5ace139d670ed6270c64210c6c6711b
  f821837403ff96f405cd272122191a18a7b48078554a09548e99dcb4e31aea43
  d1e1269c67935c44fc6a8812fe36c93a8cf0306128b0a6c17997bd93910e04a5
  c0b92349194e254e7d4b0e28f45b74bcd206ce7a39915f6cd4724391254fb25d
)

BLOCKS=(
  0000000000000015c7c72058099272d2ea000a0f606718b528ff677c546a9099
  000000000000000bf535d1bc93017aabdb31caae731e19c1fbed9b3e77e9c6a5
  0000000000000026c832fd00f5cbd06a20c73203e9d1cd00a340bdd66ccba659
  00000000000000279cef81af6b8adc7f199c2175f48628835bf91e57425ef8b7
  00000000000000032bfa35ec5f88f8c71ddd82982ef150b061bc221f57ee451f
)

HEIGHTS=(1692172 2178760 2461627 1750634 2457941)

ADDR_BATCH_SMALL="XejccR788hYLDBjLw79K6LFykBvDX9vQRX,XfLiZr56DyfNQutQZbceeBMpwJZRED4FoC,XvuaxyJdbgzG9cAjmgFM8fmfx86NcByw3f"

TS_END="$(date_days_ago 0   | sed 's/:/%3A/g')"
TS_START="$(date_days_ago 30 | sed 's/:/%3A/g')"

# Indirect array access the bash-3.2 way — macOS still ships 3.2, which has no
# namerefs (`local -n`).
pick() {
  local _name="$1" _n _i
  eval "_n=\${#${_name}[@]}"
  _i=$(( RANDOM % _n ))
  eval "echo \"\${${_name}[$_i]}\""
}

# --------------------------------------------------------------- target list
# Weights approximate the observed production mix. Each loop iteration emits one
# target line; the list is shuffled once so vegeta's round-robin doesn't fire the
# same endpoint in lockstep bursts.

TARGETS_FILE="$(mktemp -t dashscan-targets.XXXXXX)"
BODY_FILE=""
cleanup() { rm -f "$TARGETS_FILE" ${BODY_FILE:+"$BODY_FILE"}; }
trap cleanup EXIT

emit() { printf 'GET %s%s\n\n' "$BASE_URL" "$1" >> "$TARGETS_FILE.raw"; }

: > "$TARGETS_FILE.raw"

for _ in $(seq 1 40); do emit "/transaction/$(pick TXS)"; done
for _ in $(seq 1 3);  do emit "/transaction/$(pick TXS_HEAVY)"; done
for _ in $(seq 1 9);  do emit "/address/$(pick ADDRESSES_HIT)"; done
for _ in $(seq 1 6);  do emit "/address/$(pick ADDRESSES_MISS)"; done
for _ in $(seq 1 8);  do emit "/address/$(pick ADDRESSES_HIT)/transactions?page=1&limit=10&order=desc"; done
for _ in $(seq 1 7);  do emit "/address/$(pick ADDRESSES_HIT)/transactions?page=1&limit=25&order=desc"; done
for _ in $(seq 1 10); do emit "/address/$(pick ADDRESSES_HIT)/balance/chart?timestamp_start=${TS_START}&timestamp_end=${TS_END}"; done
for _ in $(seq 1 3);  do emit "/address/$(pick ADDRESSES_HIT)/utxo?page=1&limit=10&order=desc"; done
for _ in $(seq 1 5);  do emit "/block/$(pick BLOCKS)"; done
for _ in $(seq 1 4);  do emit "/transactions/height/$(pick HEIGHTS)?page=1&limit=10&order=desc"; done
for _ in $(seq 1 3);  do emit "/addresses/info?addresses=${ADDR_BATCH_SMALL}"; done
for _ in $(seq 1 5);  do emit "/status"; done
emit "/address/${ADDRESS_WHALE}/transactions?page=1&limit=25&order=desc"

if [[ -n "$XPUB" ]]; then
  BODY_FILE="$(mktemp -t dashscan-xpub.XXXXXX)"
  printf '{"xpub":"%s"}' "$XPUB" > "$BODY_FILE"
  for _ in $(seq 1 2); do
    printf 'POST %s/xpub\nContent-Type: application/json\n@%s\n\n' "$BASE_URL" "$BODY_FILE" >> "$TARGETS_FILE.raw"
  done
  printf 'POST %s/xpub/addresses\nContent-Type: application/json\n@%s\n\n' "$BASE_URL" "$BODY_FILE" >> "$TARGETS_FILE.raw"
fi

# Shuffle whole target blocks, not individual lines: a POST target spans several
# lines (verb, headers, body ref), so flatten each block onto one line with \x01
# standing in for its newlines, shuffle, then expand back.
awk 'BEGIN{RS="";FS="\n"}{for(i=1;i<=NF;i++) printf "%s%s", $i, (i<NF?"\001":"\n")}' \
    "$TARGETS_FILE.raw" \
  | shuffle \
  | awk '{gsub(/\001/,"\n"); print; print ""}' > "$TARGETS_FILE"
rm -f "$TARGETS_FILE.raw"

if [[ -n "$ONLY" ]]; then
  awk -v pat="$ONLY" 'BEGIN{RS="";ORS="\n\n"} index($0,pat)' "$TARGETS_FILE" > "$TARGETS_FILE.f"
  mv "$TARGETS_FILE.f" "$TARGETS_FILE"
fi

TARGET_COUNT="$(grep -c '^\(GET\|POST\) ' "$TARGETS_FILE" || true)"
if [[ "$TARGET_COUNT" -eq 0 ]]; then
  echo "No targets matched ONLY='$ONLY'." >&2
  exit 1
fi

# ------------------------------------------------------------------- confirm

echo
echo "  target      : $BASE_URL"
echo "  mode        : $MODE"
if [[ "$MODE" == "ramp" ]]; then
  echo "  ramp        : $RAMP_STEPS rps, ${RAMP_STEP_DURATION} each"
else
  echo "  rate        : ${RATE} rps for ${DURATION}"
fi
echo "  targets     : $TARGET_COUNT distinct requests in rotation"
[[ -n "$ONLY" ]] && echo "  filter      : $ONLY"
echo "  results     : $OUT_DIR"
echo
echo "  This fires at PRODUCTION. Your log sample averaged ~3 rps, so ${RATE} rps"
echo "  is roughly 70x live traffic. Real users will feel this."
echo

if [[ "$ASSUME_YES" -ne 1 ]]; then
  read -r -p "  Proceed? [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
fi

mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

run_one() {
  local rate="$1" duration="$2" label="$3"
  local bin="$OUT_DIR/${STAMP}-${label}.bin"

  echo
  echo "=== ${rate} rps for ${duration} ==============================="
  vegeta attack \
    -targets="$TARGETS_FILE" \
    -rate="${rate}/1s" \
    -duration="$duration" \
    -timeout="$TIMEOUT" \
    -connections="$CONNECTIONS" \
    -keepalive=true \
    > "$bin"

  vegeta report -type=text "$bin"
  echo
  echo "--- latency distribution ---"
  vegeta report -type='hist[0,10ms,25ms,50ms,100ms,250ms,500ms,1s,2s,5s,10s]' "$bin"
}

if [[ "$MODE" == "ramp" ]]; then
  for step in $RAMP_STEPS; do
    run_one "$step" "$RAMP_STEP_DURATION" "ramp-${step}rps"
  done
else
  run_one "$RATE" "$DURATION" "steady-${RATE}rps"
fi

echo
echo "Raw results in $OUT_DIR (replot any run with: vegeta plot <file>.bin > report.html)"
