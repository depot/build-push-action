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

      - name: Build and load
        uses: depot/build-push-action@v1
        with:
          # if no depot.json file is at the root of your repo, you must specify the project id
          project: <your-depot-project-id>
          token: ${{ secrets.DEPOT_PROJECT_TOKEN }}
          load: true
          tags: test-container

      - name: Run integration test with built container
        run: ...

```
