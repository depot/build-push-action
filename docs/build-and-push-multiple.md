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

      - name: Login to DockerHub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

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
          token: ${{ secrets.DEPOT_PROJECT_TOKEN }}
          push: true
          tags: |
            <docker-hub-organization>/<your-app>:latest
            ${{ steps.ecr-login.outputs.registry }}/<your-app>:latest

```
