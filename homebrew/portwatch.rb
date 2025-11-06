cask "portwatch" do
  version "1.0.0"

  # Update these SHA256 checksums after creating a GitHub release
  on_arm do
    sha256 "REPLACE_WITH_ARM64_SHA256"
    url "https://github.com/dingran/portwatch/releases/download/v#{version}/PortWatch-#{version}-arm64-mac.zip"
  end

  on_intel do
    sha256 "REPLACE_WITH_INTEL_SHA256"
    url "https://github.com/dingran/portwatch/releases/download/v#{version}/PortWatch-#{version}-mac.zip"
  end

  name "PortWatch"
  desc "macOS menu bar app for monitoring which processes are running on which ports"
  homepage "https://github.com/dingran/portwatch"

  app "PortWatch.app"

  # Users will see a security warning on first launch since the app is not notarized
  # They need to right-click > Open or go to System Settings > Privacy & Security
  caveats <<~EOS
    PortWatch is not notarized with Apple. On first launch:
    1. Right-click the app icon and select "Open", or
    2. Go to System Settings > Privacy & Security and click "Open Anyway"

    After the first launch, the app will open normally.
  EOS

  zap trash: [
    "~/Library/Application Support/@portwatch/app",
    "~/Library/Preferences/com.portwatch.app.plist",
    "~/Library/Saved Application State/com.portwatch.app.savedState",
  ]
end
