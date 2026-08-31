# PortWatch Homebrew Tap

This folder holds the [Homebrew Cask](https://docs.brew.sh/Cask-Cookbook) definition for PortWatch plus a short guide for getting it published. The cask installs the menu bar app from the [GitHub Releases](https://github.com/dingran/portwatch/releases) assets.

## Current status

The cask (`Casks/portwatch.rb`) is complete and its checksums have been verified against the published `v1.1.0` release (both Apple Silicon and Intel `.zip` assets). Installing through a tap is not live yet because the tap repository itself has not been created. See below for how to do that.

## How Homebrew taps work

A tap is a git repository named `homebrew-tap` owned by the same account as the project, and Homebrew looks inside it for a `Casks/` (or `Formula/`) folder. Running:

```bash
brew tap dingran/tap
brew install --cask dingran/tap/portwatch
```

tells Homebrew to clone `https://github.com/dingran/homebrew-tap` and read `Casks/portwatch.rb` from it. That repo is the one thing missing right now. The `dingran/homebrew-tap` repository does not exist yet, which is why those commands fail with `Repository not found`.

## Publishing options

There are two ways to make `brew install --cask portwatch` just work.

### Option A: official Homebrew Cask (recommended)

No tap needed, and users can run plain `brew install --cask portwatch`:

1. Fork [`Homebrew/homebrew-cask`](https://github.com/Homebrew/homebrew-cask).
2. Copy this cask to `Casks/p/portwatch.rb`.
3. Open a pull request. Homebrew CI runs `brew audit` and `brew style` on it, so make sure those pass.
4. Once merged, anyone can install with `brew install --cask portwatch`.

### Option B: your own tap

If you would rather control the distribution yourself:

1. Create a new repository named `homebrew-tap` under your GitHub account: `https://github.com/dingran/homebrew-tap`.
2. Copy the `Casks/` folder (containing `portwatch.rb`) into that repo, commit, and push.
3. Users install with the tap commands at the top of this file.

Whichever option you choose, remember to bump `version` and the two `sha256` values here every time you cut a new release. See [`RELEASE.md`](../RELEASE.md) for the full release checklist.
