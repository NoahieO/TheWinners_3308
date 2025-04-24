#!/bin/bash

# Automatically uses the environment's DATABASE_URL
PG_URI="${DATABASE_URL}"

# Exit if the URI is not set
if [[ -z "$PG_URI" ]]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

# Execute each .sql file in the init_data folder
for file in init_data/*.sql; do
  echo "Executing $file..."
  psql "$PG_URI" -f "$file"
done
