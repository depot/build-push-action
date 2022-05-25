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

### Differences from `docker/build-push-action`

1. `token` - you must pass a Depot access token via the `token` input, or via the `DEPOT_TOKEN` environment variable:

   ```yaml
   steps:
     - uses: depot/build-push-action@v1
       with:
         token: ${{ secrets.DEPOT_TOKEN }}
   ```

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
   -  uses: depot/build-push-action@v1
   +  uses: depot/build-push-action@v1
      with:
   -    cache-from: type=gha
   -    cache-to: type=gha,mode=max
   ```

## License

MIT License, see `LICENSE`.

Code derived from `docker/build-push-action` copyright 2013-2018 Docker, Inc., Apache License, Version 2.0.
