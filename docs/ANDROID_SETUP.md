Android SDK & Emulator - Local verification and project-specific notes

Purpose
-------
This document records a local run-through of the Android emulator / adb setup for the project and documents project-specific quirks and the exact commands you can run to fix the "No Android connected device found" error.

Environment used for verification
---------------------------------
- OS: macOS
- Shell: zsh
- Project: voyager-RN (path: project root)

What I checked (commands run)
-----------------------------
1. Check ANDROID_SDK_ROOT env var

```bash
printenv ANDROID_SDK_ROOT || echo "ANDROID_SDK_ROOT not set"
```

Result: ANDROID_SDK_ROOT not set (in this shell)

2. Check default SDK directory

```bash
ls -la "$HOME/Library/Android/sdk" || echo "SDK dir not present at $HOME/Library/Android/sdk"
```

Result: SDK directory exists and contains `platform-tools`, `emulator`, `cmdline-tools`, etc.

3. Check adb availability on PATH

```bash
adb --version
which adb || echo 'adb not found in PATH'
```

Result: `adb` not found in PATH (command not available).

4. Check emulator binary availability on PATH

```bash
emulator -list-avds || echo 'emulator tool not found in PATH or no AVDs available'
which emulator || echo 'emulator not found in PATH'
```

Result: `emulator` not found in PATH.

5. Verify Expo CLI

```bash
npx expo --version
```

Result: Expo CLI is available (example output: 0.18.31).

Diagnosis
---------
- The Android SDK is installed at `~/Library/Android/sdk`, but critical tools (adb, emulator) are not on the current shell PATH.
- Expo cannot start or detect an emulator because the CLI cannot call `adb`/`emulator` from this shell.

Remedy (macOS + zsh)
--------------------
Add the following lines to your `~/.zshrc` (adjust the SDK path if yours differs):

```bash
# Android SDK
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin"
```

Then reload your shell:

```bash
source ~/.zshrc
```

Confirm tools are on PATH:

```bash
adb --version
emulator -list-avds
```

If `adb` still fails, try restarting the adb server:

```bash
adb kill-server && adb start-server
adb devices -l
```

Start an emulator (if you created one already in Android Studio Device Manager):

```bash
emulator -avd <AVD_NAME>
```

Then in your project run:

```bash
npm run android
# or
npx expo start --android
```

Genymotion notes
----------------
If you're using Genymotion virtual devices:
- Open Genymotion → Settings → ADB
- Enable "Use custom Android SDK tools" and point it to your Android SDK folder (e.g. `$HOME/Library/Android/sdk`)
- Restart Genymotion
- Run `adb devices` to verify your Genymotion VM is visible to adb

Other tips and commands
-----------------------
- Accept Android SDK licenses:

```bash
yes | sdkmanager --licenses
```

- List available SDK packages:

```bash
sdkmanager --list
```

- If `emulator` or `adb` cannot be found by `npx expo`, make sure your IDE (Android Studio) and terminal share the same PATH (close and reopen terminal after SDK installs).

Project-specific quirks and notes
---------------------------------
- On this machine I observed the SDK was installed but the PATH wasn't set in the interactive shell environment. That's the most common cause of the "No Android connected device found" message.
- Because the project uses Expo, starting the emulator beforehand (so `adb devices` lists an emulator) avoids Expo trying (and failing) to launch an emulator automatically.
- Recommend adding the PATH instructions to the project's `README.md` (done) so other contributors see them immediately.

If you want, I can:
- Attempt to start a detected AVD for you and confirm `npx expo start --android` connects (requires running an emulator which may be interactive), or
- Add a short troubleshooting script (simple bash file) to the repo to check PATH and run the common commands above.

If you'd like me to try starting an emulator now, tell me and I'll attempt it (I may not be able to create new AVDs from the CLI without Android Studio GUI in this environment).