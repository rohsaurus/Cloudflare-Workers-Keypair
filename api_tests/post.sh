#!/usr/bin/env bash
source ./variables.sh
curl -X POST "${worker_url}/api/userid" -H "authorization: ${api_key}" -H 'Content-Type: application/json' -d '{"todo":"'"${1}"'"}'
