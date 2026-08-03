#!/usr/bin/env bash
# Manual end-to-end walkthrough of the whole API.
#
# Run in Git Bash (not PowerShell — it mangles the JSON quoting):
#   docker compose up -d
#   npm run dev          # in another terminal
#   bash scripts/api-test.sh
#
# Prints the status code and body of every call so you can eyeball the results.
# Expected status codes are in the label of each call.

BASE="http://localhost:3000"

pass=0; fail=0

# call METHOD PATH BODY EXPECTED_STATUS LABEL
call() {
  local method="$1" path="$2" body="$3" expect="$4" label="$5"
  local out status resp
  if [ -z "$body" ]; then
    out=$(curl -s -w $'\n%{http_code}' -X "$method" "$BASE$path")
  else
    out=$(curl -s -w $'\n%{http_code}' -X "$method" "$BASE$path" \
          -H "Content-Type: application/json" -d "$body")
  fi
  status="${out##*$'\n'}"
  resp="${out%$'\n'*}"
  if [ "$status" = "$expect" ]; then
    pass=$((pass+1)); printf '  \033[32mok\033[0m   %-3s %-52s %s\n' "$status" "$label" "$resp"
  else
    fail=$((fail+1)); printf '  \033[31mFAIL\033[0m %-3s %-52s (wanted %s) %s\n' "$status" "$label" "$expect" "$resp"
  fi
}

# Same as call(), but echoes the created id so it can be captured.
create_id() {
  curl -s -X POST "$BASE$1" -H "Content-Type: application/json" -d "$2" \
    | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4
}

echo "=============================================================="
echo " HEALTH"
echo "=============================================================="
call GET /health "" 200 "health check"
call GET /api/nonsense "" 404 "unknown route falls through to 404"

echo
echo "=============================================================="
echo " DATA TYPES — validation failures"
echo "=============================================================="
call POST /api/datatypes '{}' 400 "empty body"
call POST /api/datatypes '"just a string"' 400 "body is not an object"
call POST /api/datatypes '[1,2,3]' 400 "body is an array"
call POST /api/datatypes '{"name":"","description":"d","type":"keywords","content":["a"],"threshold":1}' 400 "empty name"
call POST /api/datatypes '{"name":"   ","description":"d","type":"keywords","content":["a"],"threshold":1}' 400 "whitespace-only name"
call POST /api/datatypes '{"name":"n","description":"d","type":"regex","content":["a"],"threshold":1}' 400 "type is not keywords"
call POST /api/datatypes '{"name":"n","description":"d","type":"keywords","content":[],"threshold":1}' 400 "empty content array"
call POST /api/datatypes '{"name":"n","description":"d","type":"keywords","content":"visa","threshold":1}' 400 "content is a string not array"
call POST /api/datatypes '{"name":"n","description":"d","type":"keywords","content":["a"],"threshold":0}' 400 "threshold 0 (would match everything)"
call POST /api/datatypes '{"name":"n","description":"d","type":"keywords","content":["a"],"threshold":2.5}' 400 "threshold not an integer"
call POST /api/datatypes '{"name":"n","description":"d","type":"keywords","content":["a"],"threshold":"2"}' 400 "threshold is a string"

echo
echo "=============================================================="
echo " DATA TYPES — CRUD"
echo "=============================================================="
DT_CARD=$(create_id /api/datatypes '{"name":"  Credit Card Terms  ","description":"PCI","type":"keywords","content":["visa","cvv"],"threshold":2}')
echo "  created data type (card):    $DT_CARD"
DT_MED=$(create_id /api/datatypes '{"name":"Medical Terms","description":"PHI","type":"keywords","content":["diagnosis"],"threshold":1}')
echo "  created data type (medical): $DT_MED"

call GET /api/datatypes "" 200 "list all"
call GET "/api/datatypes/$DT_CARD" "" 200 "get one (name should be trimmed)"
call GET /api/datatypes/does-not-exist "" 404 "get unknown"
call PUT "/api/datatypes/$DT_CARD" '{"name":"Credit Card Terms","description":"PCI v2","type":"keywords","content":["visa","cvv"],"threshold":2}' 200 "update"
call PUT "/api/datatypes/$DT_CARD" '{"name":"only a name"}' 400 "update with partial body (PUT is full replace)"
call PUT /api/datatypes/does-not-exist '{"name":"n","description":"d","type":"keywords","content":["a"],"threshold":1}' 404 "update unknown"

echo
echo "=============================================================="
echo " DATA SETS"
echo "=============================================================="
call POST /api/datasets '{"name":"Bad","data_type_ids":["fake-1","fake-2"]}' 400 "unknown data type ids (should name them)"
call POST /api/datasets "{\"name\":\"Mixed\",\"data_type_ids\":[\"$DT_CARD\",\"fake-3\"]}" 400 "partly unknown ids (names only fake-3)"
call POST /api/datasets '{"name":"NoIds"}' 400 "data_type_ids missing"
call POST /api/datasets '{"name":"","data_type_ids":[]}' 400 "empty name"

DS_PCI=$(create_id /api/datasets "{\"name\":\"PCI Compliance\",\"data_type_ids\":[\"$DT_CARD\",\"$DT_MED\"]}")
echo "  created data set (pci):      $DS_PCI"
DS_EMPTY=$(create_id /api/datasets '{"name":"Empty Policy","data_type_ids":[]}')
echo "  created data set (empty):    $DS_EMPTY"
DS_CAMEL=$(create_id /api/datasets "{\"name\":\"CamelCase Spelling\",\"dataTypeIds\":[\"$DT_MED\"]}")
echo "  created via dataTypeIds:     $DS_CAMEL"

call GET /api/datasets "" 200 "list all"
call GET "/api/datasets/$DS_PCI" "" 200 "get one (both ids linked)"
call GET "/api/datasets/$DS_EMPTY" "" 200 "empty set reads back as [] not [null]"
call GET /api/datasets/does-not-exist "" 404 "get unknown"
call PUT "/api/datasets/$DS_CAMEL" '{"name":"Now Empty","data_type_ids":[]}' 200 "update removes all links"
call PUT "/api/datasets/$DS_CAMEL" '{"name":"x","data_type_ids":["fake-9"]}' 400 "update with unknown ids"
call PUT /api/datasets/does-not-exist '{"name":"x","data_type_ids":[]}' 404 "update unknown"

echo
echo "=============================================================="
echo " SCAN"
echo "=============================================================="
call POST /api/scan "{\"text\":\"pay with visa, cvv 123\",\"dataSetId\":\"$DS_PCI\"}" 200 "match: 2 hits, threshold 2 (boundary)"
call POST /api/scan "{\"text\":\"pay with visa only\",\"dataSetId\":\"$DS_PCI\"}" 200 "not matched: 1 hit, threshold 2"
call POST /api/scan "{\"text\":\"the diagnosis is in\",\"dataSetId\":\"$DS_PCI\"}" 200 "match: only Medical Terms fires (OR logic)"
call POST /api/scan "{\"text\":\"VISA and CVV shouting\",\"dataSetId\":\"$DS_PCI\"}" 200 "match: case-insensitive"
call POST /api/scan "{\"text\":\"visas and cvvs plural\",\"dataSetId\":\"$DS_PCI\"}" 200 "not matched: whole-word only"
call POST /api/scan "{\"text\":\"visa visa visa cvv\",\"dataSetId\":\"$DS_PCI\"}" 200 "match_count counts every occurrence (4)"
call POST /api/scan "{\"text\":\"\",\"dataSetId\":\"$DS_PCI\"}" 200 "empty text is a valid scan"
call POST /api/scan "{\"text\":\"visa cvv diagnosis\",\"dataSetId\":\"$DS_EMPTY\"}" 200 "data set with no rules -> not matched"
call POST /api/scan '{"text":"visa","dataSetId":"does-not-exist"}' 404 "unknown data set"
call POST /api/scan '{"text":"visa"}' 400 "dataSetId missing"
call POST /api/scan "{\"text\":123,\"dataSetId\":\"$DS_PCI\"}" 400 "text is not a string"

echo
echo "=============================================================="
echo " CLEANUP"
echo "=============================================================="
call DELETE "/api/datasets/$DS_PCI" "" 204 "delete data set"
call DELETE "/api/datasets/$DS_PCI" "" 404 "delete again (idempotent)"
call DELETE "/api/datasets/$DS_EMPTY" "" 204 "delete empty data set"
call DELETE "/api/datasets/$DS_CAMEL" "" 204 "delete camelCase data set"
call DELETE "/api/datatypes/$DT_CARD" "" 204 "delete data type"
call DELETE "/api/datatypes/$DT_MED" "" 204 "delete data type"
call GET "/api/datatypes/$DT_CARD" "" 404 "deleted data type is gone"

echo
echo "=============================================================="
printf ' %d passed, %d failed\n' "$pass" "$fail"
echo "=============================================================="
[ "$fail" -eq 0 ] || exit 1
