```yaml
name: Lint and Build image

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

      - name: Build image with Software Bill of Materials (SBOM)
        uses: depot/build-push-action@v1
        with:
          # if no depot.json file is at the root of your repo, you must specify the project id
          project: <your-depot-project-id>
          sbom: true
          sbom-dir: ./sbom-output

      - name: upload SBOM directory as a build artifact
        uses: actions/upload-artifact@v3.1.0
        with:
          path: ./sbom-output
          name: "SBOM"
```
