```yaml
name: Build image

on:
  push:
    branches:
      - main

jobs:
  docker-image:
    runs-on: ubuntu-latest
    steps:
      - name: Set up Depot CLI
        uses: depot/setup-action@v1

      # Login to Google Cloud registry
      - uses: google-github-actions/setup-gcloud@v0.6.0
        with:
          project_id: gcp-project-id
          service_account_key: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}

      - name: Configure docker for GCP
        run: gcloud auth configure-docker

      - name: Build and push
        uses: depot/build-push-action@v1
        with:
          token: ${{ secrets.DEPOT_PROJECT_TOKEN }}
          push: true
          tags: <gcp-region>-docker.pkg.dev/<gcp-project-id>/<your-app>:latest
```
