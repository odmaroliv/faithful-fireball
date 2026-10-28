#!/usr/bin/env bash
# One-time setup + deploy of the arnian-leads Cloud Run service. Safe to re-run.
# Needs these secrets in Secret Manager first: retell-api-key, emailjs-private-key.
set -euo pipefail

PROJECT=arnian-infra
REGION=us-central1
SERVICE=arnian-leads
QUEUE=lead-calls
SA="$SERVICE@$PROJECT.iam.gserviceaccount.com"
: "${RETELL_AGENT_ID:?}" "${RETELL_FROM_NUMBER:?}" "${EMAILJS_SERVICE:?}" "${EMAILJS_TEMPLATE:?}" "${EMAILJS_PUBLIC_KEY:?}"
cd "$(dirname "$0")"

gcloud iam service-accounts describe "$SA" --project "$PROJECT" >/dev/null 2>&1 ||
  gcloud iam service-accounts create "$SERVICE" --project "$PROJECT" --display-name "Arnian quote-form leads"
gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$SA" --role roles/cloudtasks.enqueuer --condition None >/dev/null
# Deleting a task (when the customer sends the details) needs more than enqueuer.
gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$SA" --role roles/cloudtasks.taskDeleter --condition None >/dev/null

gcloud tasks queues describe "$QUEUE" --location "$REGION" --project "$PROJECT" >/dev/null 2>&1 ||
  gcloud tasks queues create "$QUEUE" --location "$REGION" --project "$PROJECT" \
    --max-attempts 3 --min-backoff 60s --max-dispatches-per-second 1

gcloud secrets describe task-token --project "$PROJECT" >/dev/null 2>&1 ||
  openssl rand -hex 32 | tr -d '\n' | gcloud secrets create task-token --project "$PROJECT" --data-file=-
for s in task-token retell-api-key emailjs-private-key; do
  gcloud secrets add-iam-policy-binding "$s" --project "$PROJECT" --member "serviceAccount:$SA" \
    --role roles/secretmanager.secretAccessor >/dev/null
done

URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT" --format 'value(status.url)' 2>/dev/null || true)

gcloud run deploy "$SERVICE" --source . --project "$PROJECT" --region "$REGION" \
  --service-account "$SA" --allow-unauthenticated \
  --cpu 1 --memory 256Mi --min-instances 0 --max-instances 3 --concurrency 40 --timeout 30 \
  --set-secrets "RETELL_API_KEY=retell-api-key:latest,EMAILJS_PRIVATE_KEY=emailjs-private-key:latest,TASK_TOKEN=task-token:latest" \
  --set-env-vars "^@^GCP_PROJECT=$PROJECT@TASKS_REGION=$REGION@TASKS_QUEUE=$QUEUE@SELF_URL=$URL@RETELL_AGENT_ID=$RETELL_AGENT_ID@RETELL_FROM_NUMBER=$RETELL_FROM_NUMBER@EMAILJS_SERVICE=$EMAILJS_SERVICE@EMAILJS_TEMPLATE=$EMAILJS_TEMPLATE@EMAILJS_PUBLIC_KEY=$EMAILJS_PUBLIC_KEY"

# First deploy: the URL only exists now, so point SELF_URL at it.
if [ -z "$URL" ]; then
  URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT" --format 'value(status.url)')
  gcloud run services update "$SERVICE" --region "$REGION" --project "$PROJECT" --update-env-vars "SELF_URL=$URL"
fi
echo "Service: $URL"
