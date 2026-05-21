# Node 24 release checklist

This action runs on the GitHub Actions `node24` runtime. When releasing a Node 24 runtime update, publish it on the current `v1` line so customers using `depot/build-push-action@v1` continue to follow GitHub Actions runtime support.

Older self-hosted GitHub Actions runners cannot start `node24` actions. Self-hosted runner users should upgrade to `actions/runner` v2.327.1 or later, or pin an older concrete action version such as `depot/build-push-action@v1.17.0`. For stricter pinning, use the immutable `v1.17.0` commit SHA `5f3b3c2e5a00f0093de47f657aeaefcedff27d18`.

## Local validation

```shell
pnpm install --frozen-lockfile
pnpm run type-check
pnpm run fmt:check
pnpm run build
```

After `pnpm run build`, review the `dist/index.js` diff and confirm it only contains the expected bundled output changes.

## GitHub Actions validation

Run the validation workflow on GitHub-hosted runners and Depot GitHub Actions runners:

- `ubuntu-latest`
- `depot-ubuntu-24.04-4`

Use a single Depot runner label when validating on Depot GitHub Actions runners.

## Depot CI validation

Run the equivalent install, type-check, format-check, and build workflow in Depot CI. If a Depot CI workflow has not been checked into this repo, migrate or run an external validation workflow with:

```shell
depot ci run --workflow .depot/workflows/ci.yml
```

For multi-org accounts, confirm the active Depot org first with `depot org show`, or pass the intended org with `--org`.

## Release

Create the next `v1.x.0` release, then let the existing release workflow move the floating `v1` tag. Mention the self-hosted runner minimum and the pinning fallback in the release notes.
