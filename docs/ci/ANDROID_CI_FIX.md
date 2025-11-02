Android CI: Fix for emulator APK install failure

Summary
-------
A recent Android CI workflow run failed during the emulator/installation step with a shell error:

  /usr/bin/sh: 1: Syntax error: Unterminated quoted string

Root cause
----------
The workflow's emulator script used an explicit nested shell invocation that included a long single-quoted string with embedded escaped quotes and backslashes:

  /bin/sh -lc 'APK_DOWNLOAD_PATH="./android-app-apk/app-debug.apk"; \
    ...'

When the runner executed this, the complex quoting and backslashes caused the shell to see an unterminated quoted string on the runner environment, causing the step to fail and the emulator to terminate.

Fix applied
-----------
- Replaced the nested `/bin/sh -lc '...` block with a straightforward multi-line shell script inside the `script:` block.
- The new script assigns `APK_DOWNLOAD_PATH` and `APK_BUILT_PATH`, picks the existing APK (downloaded artifact preferred), verifies the file exists, and calls `adb install "$APK"`.
- This removes nested quoting, simplifies debugging, and mirrors how other CI tasks handle multi-line shell logic.

Files changed
-------------
- `.github/workflows/android-automation-testing.yml`
  - Rewrote the APK selection & install section to avoid nested `/bin/sh -lc` quoting and to provide clearer debug output when the APK is missing.

Why this helps
--------------
- Avoids complex nested quoting which is fragile across different runner shells.
- Easier to read and maintain.
- Provides clear directory listings when an APK is missing for faster debugging.

Testing
-------
- Local reproduction of the quoting issue is brittle; however the fix is deterministic shell logic. After the change, future CI runs should avoid the Syntax error and either successfully install the APK or provide clear diagnostics listing both the downloaded artifact directory and the built outputs.

Follow-ups
----------
- If the APK is still not present in the download or build path, add additional logging to the build step and ensure the build step uploads the artifact before the emulator step.
- Consider adding an explicit `sleep` or `adb wait-for-device` before install when emulator boot timing is flaky.
- Optionally add a post-install verification that uses `adb shell pm list packages` to confirm the package was installed, and fail the step if not present.
