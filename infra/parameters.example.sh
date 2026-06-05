#!/usr/bin/env bash
# Copy this file to parameters.sh and fill in your values.
# parameters.sh is gitignored — it holds secrets. NEVER commit it.

# A unique, lowercase name for your Cognito domain (letters/numbers/hyphens).
# Your sign-in URL becomes: <prefix>.auth.<region>.amazoncognito.com
export DOMAIN_PREFIX="my-app-login-demo"

# CloudFormation stack name (any label).
export STACK_NAME="social-login-starter"

# AWS region to deploy into.
export AWS_REGION="us-east-1"

# Where Cognito returns users after login / logout (comma-separated, no spaces).
export CALLBACK_URLS="http://localhost:8000/callback.html"
export LOGOUT_URLS="http://localhost:8000/"

# ── Google (from Google Cloud Console) ──────────────────────────────────────
export GOOGLE_CLIENT_ID="REPLACE_ME.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="REPLACE_ME"

# ── Apple (from Apple Developer) ────────────────────────────────────────────
export APPLE_SERVICES_ID="com.yourname.web.signin"
export APPLE_TEAM_ID="REPLACE_ME"
export APPLE_KEY_ID="REPLACE_ME"
# Path to your downloaded .p8 key file (its contents are read at deploy time).
export APPLE_PRIVATE_KEY_FILE="./AuthKey_REPLACE.p8"
