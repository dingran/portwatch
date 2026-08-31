cask "portwatch" do
  version "1.1.0"

  on_arm do
    sha256 "599ddae8310ed25585ceca70cfb900384839f929870ed0e28c42e07b41317e1a"

    url "https://github.com/dingran/portwatch/releases/download/v#{version}/PortWatch-#{version}-arm64-mac.zip"
  end
  on_intel do
    sha256 "5c6344dd11a5d6999639f44d07797fd4e0d514c246f736b5279234940b49a46d"

    url "https://github.com/dingran/portwatch/releases/download/v#{version}/PortWatch-#{version}-mac.zip"
  end

  name "PortWatch"
  desc "Menu bar app for monitoring which processes are running on which ports"
  homepage "https://github.com/dingran/portwatch"

  depends_on macos: :monterey

  app "PortWatch.app"

  zap trash: [
    "~/Library/Application Support/@portwatch/app",
    "~/Library/Preferences/com.portwatch.app.plist",
    "~/Library/Saved Application State/com.portwatch.app.savedState",
  ]

  # Users will see a security warning on first launch since the app is not notarized
  # They need to right-click > Open or go to System Settings > Privacy & Security
  caveats <<~EOS
    PortWatch is not notarized with Apple. On first launch:
    1. Right-click the app icon and select "Open", or
    2. Go to System Settings > Privacy & Security and click "Open Anyway"

    After the first launch, the app will open normally.
  EOS
end
