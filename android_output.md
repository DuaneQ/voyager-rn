Run echo "🏗️ Building Android APK with comprehensive diagnostics..."
🏗️ Building Android APK with comprehensive diagnostics...
🧹 Clearing Gradle cache...
==========================================
🏗️ Android APK Build Script
==========================================

🔍 Step 1: Verify Gradle wrapper...
Downloading https://services.gradle.org/distributions/gradle-8.8-all.zip
.....................10%......................20%......................30%......................40%......................50%......................60%......................70%......................80%......................90%......................100%

Welcome to Gradle 8.8!

Here are the highlights of this release:
 - Running Gradle on Java 22
 - Configurable Gradle daemon JVM
 - Improved IDE performance for large projects

For more details see https://docs.gradle.org/8.8/release-notes.html


------------------------------------------------------------
Gradle 8.8
------------------------------------------------------------

Build time:   2024-05-31 21:46:56 UTC
Revision:     4bd1b3d3fc3f31db5a26eecb416a165b8cc36082

Kotlin:       1.9.22
Groovy:       3.0.21
Ant:          Apache Ant(TM) version 1.10.13 compiled on January 4 2023
JVM:          17.0.17 (Eclipse Adoptium 17.0.17+10)
OS:           Linux 6.11.0-1018-azure amd64

✅ Gradle wrapper OK

🧹 Step 2: Clean all build artifacts to force fresh build...
Could not execute [report metric STATISTICS_COLLECT_METRICS_OVERHEAD]
Could not execute [report metric STATISTICS_COLLECT_METRICS_OVERHEAD]

FAILURE: Build failed with an exception.

* Where:
Build file '/home/runner/work/voyager-rn/voyager-rn/android/app/build.gradle' line: 6

* What went wrong:
A problem occurred evaluating project ':app'.
> Could not read script '/home/runner/work/voyager-rn/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle' as it does not exist.

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

BUILD FAILED in 2m 17s
15 actionable tasks: 15 executed
✅ Clean complete

🔍 Step 3: List all Gradle projects...
> Task :gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :gradle-plugin:settings-plugin:compileKotlin UP-TO-DATE
> Task :gradle-plugin:settings-plugin:compileJava NO-SOURCE
> Task :gradle-plugin:settings-plugin:pluginDescriptors UP-TO-DATE
> Task :gradle-plugin:settings-plugin:processResources UP-TO-DATE
> Task :gradle-plugin:settings-plugin:classes UP-TO-DATE
> Task :gradle-plugin:settings-plugin:jar UP-TO-DATE
> Task :gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :expo-updates-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :expo-updates-gradle-plugin:pluginDescriptors UP-TO-DATE
> Task :expo-updates-gradle-plugin:processResources UP-TO-DATE
> Task :gradle-plugin:react-native-gradle-plugin:compileKotlin UP-TO-DATE
}

rootProject.name = 'TravalPass'

dependencyResolutionManagement {
  versionCatalogs {
    reactAndroidLibs {
      from(files(new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim(), "../gradle/libs.versions.toml")))
    }
  }
}

apply from: new File(["node", "--print", "require.resolve('expo/package.json')"].execute(null, rootDir).text.trim(), "../scripts/autolinking.gradle");
useExpoModules()

if (getRNMinorVersion() < 75) {
  apply from: new File(["node", "--print", "require.resolve('@react-native-community/cli-platform-android/package.json', { paths: [require.resolve('react-native/package.json')] })"].execute(null, rootDir).text.trim(), "../native_modules.gradle");
  applyNativeModulesSettingsGradle(settings)
}

include ':app'
includeBuild(new File(["node", "--print", "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })"].execute(null, rootDir).text.trim()).getParentFile())


==========================================
❌ BUILD SCRIPT FAILED
==========================================

📋 Uploading full build log as artifact...
Error: Process completed with exit code 1.