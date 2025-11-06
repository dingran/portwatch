# Release Process for PortWatch

This guide explains how to create a new release and make it available via Homebrew.

## Prerequisites

- All changes committed and pushed to GitHub
- Built distribution files in `packages/app/release/`

## Step 1: Create GitHub Release

1. **Push your commits to GitHub:**
   ```bash
   git push origin main
   ```

2. **Go to GitHub and create a new release:**
   - Visit: https://github.com/dingran/portwatch/releases/new
   - Tag version: `v1.0.0`
   - Release title: `PortWatch v1.0.0`
   - Description: Brief summary of features

3. **Upload the distribution files:**
   - Drag and drop these 4 files from `packages/app/release/`:
     - `PortWatch-1.0.0-arm64-mac.zip`
     - `PortWatch-1.0.0-arm64.dmg`
     - `PortWatch-1.0.0-mac.zip`
     - `PortWatch-1.0.0.dmg`

4. **Publish the release**

## Step 2: Calculate SHA256 Checksums

After creating the GitHub release, calculate checksums for the ZIP files:

```bash
# Apple Silicon (arm64)
shasum -a 256 packages/app/release/PortWatch-1.0.0-arm64-mac.zip

# Intel (x64)
shasum -a 256 packages/app/release/PortWatch-1.0.0-mac.zip
```

Copy these SHA256 values for the next step.

## Step 3: Update Homebrew Cask Formula

1. **Edit `homebrew/portwatch.rb`** and replace:
   - `REPLACE_WITH_ARM64_SHA256` with the arm64 ZIP checksum
   - `REPLACE_WITH_INTEL_SHA256` with the Intel ZIP checksum

2. **Test the formula locally:**
   ```bash
   # Install from local formula
   brew install --cask homebrew/portwatch.rb

   # Test it works
   # The app should appear in Applications folder

   # Uninstall
   brew uninstall --cask portwatch
   ```

## Step 4: Submit to Homebrew Cask (Optional)

To make it available to everyone via `brew install --cask portwatch`:

1. **Fork the Homebrew Cask repository:**
   - https://github.com/Homebrew/homebrew-cask

2. **Add your formula:**
   - Copy `homebrew/portwatch.rb` to `Casks/p/portwatch.rb`

3. **Create a pull request:**
   - Title: "Add PortWatch v1.0.0"
   - Description: Brief explanation of what the app does

4. **Wait for review:**
   - Homebrew maintainers will review and merge

## Alternative: Create Your Own Tap

Instead of submitting to official Homebrew Cask, you can create your own tap:

1. **Create a new GitHub repo:**
   - Name: `homebrew-tap`
   - URL: https://github.com/dingran/homebrew-tap

2. **Add the formula:**
   - Create folder: `Casks/`
   - Copy `homebrew/portwatch.rb` to `Casks/portwatch.rb`
   - Commit and push

3. **Users can install with:**
   ```bash
   brew tap dingran/tap
   brew install --cask dingran/tap/portwatch
   ```

## Security Warning for Users

Since the app is not notarized, users will see a security warning on first launch.

**They need to:**
1. Right-click the app icon in Applications
2. Select "Open"
3. Click "Open" on the security dialog

OR

1. Try to open the app normally (will fail)
2. Go to System Settings > Privacy & Security
3. Click "Open Anyway" next to the PortWatch security warning

After the first launch, macOS remembers the app and opens it normally.

## Future: Add Code Signing

To remove the security warning, you would need:
- Apple Developer account ($99/year)
- Developer ID certificate
- Notarization process

This is covered in Milestone 2 of the original plan.
