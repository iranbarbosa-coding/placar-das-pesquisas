#!/usr/bin/env bash
# Vercel "ignore build" hook: exit 1 = build, exit 0 = skip.
# Build on any change to app code, data, or PUBLIC ASSETS (ex.: o PDF de
# comprovação servido estaticamente); skip only for docs/research-only commits.
git diff --quiet HEAD^ HEAD -- src/ data/ scripts/ public/ package.json next.config.ts vercel.json
