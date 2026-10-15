# Releasing locon

The release workflow runs checks on `main`. A pushed `v*` tag additionally
publishes to npm through trusted publishing and creates a GitHub release.
The tag version must exactly match `package.json`.

For 1.6.0:

1. Review and commit the package changes, `bun.lock`, changelog and docs yourself.
   Check that the commit includes `package.json` version `1.6.0` and all new
   `src/core` and `src/react` files. Do not tag the previous 1.5.1 commit.
2. From the library checkout, run the same checks as CI:

   ```sh
   bun install --frozen-lockfile
   bun run lint
   bun run test -- --runInBand
   bun run build
   npm pack --dry-run
   ```

3. Confirm `git status --short` is empty, then tag that release commit:

   ```sh
   git tag -a v1.6.0 -m "locon 1.6.0: React, Node and lazy locale resources"
   ```

4. Push the release commit and `v1.6.0` yourself. Check the Release workflow
   before deploying the updated website, whose new examples require 1.6.0+.

A tag points to a commit, not to uncommitted or staged files. Creating the tag
before the version bump is committed would release the old package, and the
workflow's version check would reject it. No commit, tag push or npm publish
is performed by the preparation steps above.
