#!/usr/bin/env bash
# Starts the complete application (API + frontend) on http://localhost:8080
cd "$(dirname "$0")/backend" || exit 1
command -v mvn >/dev/null 2>&1 || { echo "Maven (mvn) not found. Open 'backend' in IntelliJ and run SicmsApplication."; exit 1; }
echo "When you see 'Started SicmsApplication', open http://localhost:8080"
mvn spring-boot:run
