```yaml
name: Build image

on:
  push:
    branches:
      - main

jobs:
  docker-image:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - name: Checkout repo
        uses: actions/checkout@v3

      - name: Set up Depot CLI
        uses: depot/setup-action@v1

      - name: Build and save to Depot Registry
        uses: depot/build-push-action@v1
        with:
          # if no depot.json file is at the root of your repo, you must specify the project id
          project: <your-depot-project-id>
          save: true
          save-tags: |
            latest
            ${{ github.sha }}
```
