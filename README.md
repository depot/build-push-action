# Depot `build-push-action` GitHub Action

This action implements the same inputs and outputs as the [`docker/build-push-action`](https://github.com/docker/build-push-action), but uses the [`depot` CLI](https://github.com/depot/cli) to execute the build.

## Requirements

The `depot` CLI will need to be available in your workflow, you can use the [`depot/setup-action`](https://github.com/depot/setup-action) to install it:

```yaml
steps:
  - uses: depot/setup-action@v1
```

## Usage

This action implements the same inputs and outputs as the [`docker/build-push-action`](https://github.com/docker/build-push-action), see [the README](https://github.com/docker/build-push-action#readme) there for more information.

### Authentication

This action needs a Depot API token to communicate with your project's builders. You can supply this one of three ways:

1. You can supply a user or project API token via the `token` input:

   ```yaml
   steps:
     - uses: depot/build-push-action@v1
       with:
         token: ${{ secrets.DEPOT_TOKEN }}
   ```

2. You can supply a user or project API token via the `DEPOT_TOKEN` environment variable:

   ```yaml
   steps:
     - uses: depot/build-push-action@v1
       env:
         DEPOT_TOKEN: ${{ secrets.DEPOT_TOKEN }}
   ```

3. Depot supports GitHub's [OpenID Connect](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect) tokens via a trust relationship, so your Actions builds can securely authenticate with your Depot projects without any static access tokens. To configure the trust relationship, visit your Depot project settings, then add your repository and desired workflow config to `Trust Relationships`. Then in your workflow, enable the `id-token: write` permission:

   ```yaml
   permissions:
     # allow issuing OIDC tokens for this workflow run
     id-token: write
     # allow at least reading the repo contents, add other permissions if necessary
     contents: read
   steps:
     # no need to provide a DEPOT_TOKEN
     - uses: depot/build-push-action@v1
   ```

### Differences from `docker/build-push-action`

1. Authentication — this action needs to authenticate with a Depot API token to communicate with your project's builders (see above).

2. If you have not configured a `depot.json` file with `depot init`, you can explicitly specify your project ID via the `project` input:

   ```yaml
   steps:
     - uses: depot/build-push-action@v1
       with:
         project: abc123xyz
   ```

3. The `builder` input is not supported - this action always runs builds using Depot's hosted builders, if you need to route builds to a local buildx builder, you should use the `docker/build-push-action`.
4. Depending on how you are using `cache-from` / `cache-to`, you may be able to remove those options. Depot's builders launch with persistent local SSD cache, so unless you wish to push your cache to a registry for other reasons, you can remove them:

   ```diff
   steps:
     -
   -  uses: docker/build-push-action@v1
   +  uses: depot/build-push-action@v1
      with:
   -    cache-from: type=gha
   -    cache-to: type=gha,mode=max
   ```

## License

MIT License, see `LICENSE`.

Code derived from `docker/build-push-action` copyright 2013-2018 Docker, Inc., Apache License, Version 2.0.
