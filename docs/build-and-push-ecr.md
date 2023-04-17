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
      - name: Checkout repo
        uses: actions/checkout@v3

      - name: Set up Depot CLI
        uses: depot/setup-action@v1

      # Login to ECR
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v1.6.1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: <aws-region>

      - name: Login to Amazon ECR
        id: ecr-login
        uses: aws-actions/amazon-ecr-login@v1.5.0

      - name: Build and push
        uses: depot/build-push-action@v1
        with:
          # if no depot.json file is at the root of your repo, you must specify the project id
          project: <your-depot-project-id>
          token: ${{ secrets.DEPOT_PROJECT_TOKEN }}
          push: true
          tags: ${{ steps.ecr-login.outputs.registry }}/<your-app>:latest
```
