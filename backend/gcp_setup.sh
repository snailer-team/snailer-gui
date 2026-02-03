#!/bin/bash
set -e

PROJECT_ID="${GCP_PROJECT_ID:-snailer-project}"  # Set env
INSTANCE_NAME="snailer-db"
DB_NAME="snailer"
DB_USER="snailer-user"
DB_PASS="${GCP_DB_PASS:-changeme}"  # Secure this
REGION="us-central1"

echo "Setting up GCP Cloud SQL..."

# Create instance
gcloud sql instances create $INSTANCE_NAME \
  --project=$PROJECT_ID \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION

# Create DB
gcloud sql databases create $DB_NAME --instance=$INSTANCE_NAME --project=$PROJECT_ID

# Create user
echo "CREATE USER '$DB_USER' PASSWORD '$DB_PASS'; GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO '$DB_USER';" | gcloud sql connect $INSTANCE_NAME --user=postgres --project=$PROJECT_ID

