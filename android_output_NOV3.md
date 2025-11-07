Run echo "🏗️ Building Android APK with comprehensive diagnostics..."
  echo "🏗️ Building Android APK with comprehensive diagnostics..."
  
  # Clear Gradle cache to prevent stale plugin issues
  echo "🧹 Clearing Gradle cache..."
  rm -rf ~/.gradle/caches/
  rm -rf android/.gradle/
  
  # Use dedicated build script with better error capture
  chmod +x .github/scripts/build-android-debug.sh
  .github/scripts/build-android-debug.sh || {
    echo ""
    echo "=========================================="
    echo "❌ BUILD SCRIPT FAILED"
    echo "=========================================="
    echo ""
    echo "📋 Uploading full build log as artifact..."
    exit 1
  }
  
  echo "✅ APK build completed successfully"
  shell: /usr/bin/bash -e {0}
  env:
    JAVA_HOME: /opt/hostedtoolcache/Java_Temurin-Hotspot_jdk/17.0.17-10/x64
    JAVA_HOME_17_X64: /opt/hostedtoolcache/Java_Temurin-Hotspot_jdk/17.0.17-10/x64
    ANDROID_HOME: /usr/local/lib/android/sdk
    ANDROID_SDK_ROOT: /usr/local/lib/android/sdk
    ANDROID_AVD_HOME: /home/runner/.android/avd
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

BUILD FAILED in 2m 51s
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
> Task :gradle-plugin:react-native-gradle-plugin:compileJava NO-SOURCE
> Task :gradle-plugin:react-native-gradle-plugin:pluginDescriptors UP-TO-DATE
> Task :gradle-plugin:react-native-gradle-plugin:processResources UP-TO-DATE
> Task :gradle-plugin:react-native-gradle-plugin:classes UP-TO-DATE
> Task :gradle-plugin:react-native-gradle-plugin:jar UP-TO-DATE
> Task :expo-updates-gradle-plugin:compileKotlin UP-TO-DATE
> Task :expo-updates-gradle-plugin:compileJava NO-SOURCE
> Task :expo-updates-gradle-plugin:classes UP-TO-DATE
> Task :expo-updates-gradle-plugin:jar UP-TO-DATE

> Configure project :app
 ℹ️  Applying gradle plugin 'expo-updates-gradle-plugin' (expo-updates@0.25.28)

FAILURE: Build failed with an exception.

* Where:
Build file '/home/runner/work/voyager-rn/voyager-rn/android/app/build.gradle' line: 6

* What went wrong:
A problem occurred evaluating project ':app'.
> Could not read script '/home/runner/work/voyager-rn/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle' as it does not exist.

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

BUILD FAILED in 4s
15 actionable tasks: 3 executed, 12 up-to-date
⚠️ WARNING: Could not list projects

🔍 Step 4: Check if expo-modules-core is accessible...
✅ expo-modules-core found in dependencies

🚀 Step 5: Build APK with detailed logging...
Command: ./gradlew :app:assembleDebug --info --stacktrace --no-daemon

Initialized native services in: /home/runner/.gradle/native
Initialized jansi services in: /home/runner/.gradle/native
Received JVM installation metadata from '/usr/lib/jvm/temurin-17-jdk-amd64': {JAVA_HOME=/usr/lib/jvm/temurin-17-jdk-amd64, JAVA_VERSION=17.0.17, JAVA_VENDOR=Eclipse Adoptium, RUNTIME_NAME=OpenJDK Runtime Environment, RUNTIME_VERSION=17.0.17+10, VM_NAME=OpenJDK 64-Bit Server VM, VM_VERSION=17.0.17+10, VM_VENDOR=Eclipse Adoptium, OS_ARCH=amd64}
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.8/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Starting process 'Gradle build daemon'. Working directory: /home/runner/.gradle/daemon/8.8 Command: /usr/lib/jvm/temurin-17-jdk-amd64/bin/java -XX:MaxMetaspaceSize=512m --add-opens=java.base/java.util=ALL-UNNAMED --add-opens=java.base/java.lang=ALL-UNNAMED --add-opens=java.base/java.lang.invoke=ALL-UNNAMED --add-opens=java.prefs/java.util.prefs=ALL-UNNAMED --add-opens=java.base/java.nio.charset=ALL-UNNAMED --add-opens=java.base/java.net=ALL-UNNAMED --add-opens=java.base/java.util.concurrent.atomic=ALL-UNNAMED -Xmx2048m -Dfile.encoding=UTF-8 -Duser.country -Duser.language=en -Duser.variant -cp /home/runner/.gradle/wrapper/dists/gradle-8.8-all/6gdy1pgp427xkqcjbxw3ylt6h/gradle-8.8/lib/gradle-launcher-8.8.jar -javaagent:/home/runner/.gradle/wrapper/dists/gradle-8.8-all/6gdy1pgp427xkqcjbxw3ylt6h/gradle-8.8/lib/agents/gradle-instrumentation-agent-8.8.jar org.gradle.launcher.daemon.bootstrap.GradleDaemon 8.8
Successfully started process 'Gradle build daemon'
An attempt to start the daemon took 0.808 secs.
The client will now receive all logging from the daemon (pid: 3982). The daemon log file: /home/runner/.gradle/daemon/8.8/daemon-3982.out.log
Daemon will be stopped at the end of the build 
Using 4 worker leases.
Received JVM installation metadata from '/usr/lib/jvm/temurin-17-jdk-amd64': {JAVA_HOME=/usr/lib/jvm/temurin-17-jdk-amd64, JAVA_VERSION=17.0.17, JAVA_VENDOR=Eclipse Adoptium, RUNTIME_NAME=OpenJDK Runtime Environment, RUNTIME_VERSION=17.0.17+10, VM_NAME=OpenJDK 64-Bit Server VM, VM_VERSION=17.0.17+10, VM_VENDOR=Eclipse Adoptium, OS_ARCH=amd64}
Watching the file system is configured to be enabled if available
Now considering [/home/runner/work/voyager-rn/voyager-rn/android] as hierarchies to watch
File system watching is active
Starting Build
Starting process 'command 'node''. Working directory: /home/runner/work/voyager-rn/voyager-rn/android Command: node -e console.log(require('react-native/package.json').version);
Successfully started process 'command 'node''
Now considering [/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin, /home/runner/work/voyager-rn/voyager-rn/android] as hierarchies to watch
Transforming foojay-resolver-0.5.0.jar (org.gradle.toolchains:foojay-resolver:0.5.0) with InstrumentationAnalysisTransform
Transforming gson-2.9.1.jar (com.google.code.gson:gson:2.9.1) with InstrumentationAnalysisTransform
Transforming foojay-resolver-0.5.0.jar (org.gradle.toolchains:foojay-resolver:0.5.0) with InstrumentationAnalysisTransform
Transforming foojay-resolver-0.5.0.jar (org.gradle.toolchains:foojay-resolver:0.5.0) with MergeInstrumentationAnalysisTransform
Transforming gson-2.9.1.jar (com.google.code.gson:gson:2.9.1) with InstrumentationAnalysisTransform
Transforming gson-2.9.1.jar (com.google.code.gson:gson:2.9.1) with MergeInstrumentationAnalysisTransform
Transforming gson-2.9.1.jar (com.google.code.gson:gson:2.9.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming foojay-resolver-0.5.0.jar (org.gradle.toolchains:foojay-resolver:0.5.0) with ExternalDependencyInstrumentingArtifactTransform

> Configure project :gradle-plugin
Evaluating project ':gradle-plugin' using build file '/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/build.gradle.kts'.
Transforming kotlin-gradle-plugin-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-model:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-api:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-1.9.22-gradle82.jar (org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-proto-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea-proto:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-klib-commonizer-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-klib-commonizer-api:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-native-utils-1.9.22.jar (org.jetbrains.kotlin:kotlin-native-utils:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-util-klib-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-klib:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-build-tools-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-build-tools-api:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-android-extensions-1.9.22.jar (org.jetbrains.kotlin:kotlin-android-extensions:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-compiler-runner-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-runner:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-impl-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-impl-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-annotations-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-annotations:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-project-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-project-model:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-tooling-core-1.9.22.jar (org.jetbrains.kotlin:kotlin-tooling-core:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-util-io-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-io:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-daemon-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming trove4j-1.0.20200330.jar (org.jetbrains.intellij.deps:trove4j:1.0.20200330) with InstrumentationAnalysisTransform
Transforming kotlin-daemon-client-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-client:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlinx-coroutines-core-jvm-1.5.0.jar (org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.5.0) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-jvm-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-jvm:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-common-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-common:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-model:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-model:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-api:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-api:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-1.9.22-gradle82.jar (org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-1.9.22-gradle82.jar (org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-proto-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea-proto:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-proto-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea-proto:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-klib-commonizer-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-klib-commonizer-api:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-klib-commonizer-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-klib-commonizer-api:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-native-utils-1.9.22.jar (org.jetbrains.kotlin:kotlin-native-utils:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-native-utils-1.9.22.jar (org.jetbrains.kotlin:kotlin-native-utils:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-util-klib-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-klib:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-util-klib-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-klib:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-build-tools-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-build-tools-api:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-build-tools-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-build-tools-api:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-android-extensions-1.9.22.jar (org.jetbrains.kotlin:kotlin-android-extensions:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-android-extensions-1.9.22.jar (org.jetbrains.kotlin:kotlin-android-extensions:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-compiler-runner-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-runner:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-compiler-runner-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-runner:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-embeddable:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-embeddable:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-impl-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-impl-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-impl-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-impl-embeddable:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-annotations-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-annotations:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-annotations-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-annotations:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-project-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-project-model:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-project-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-project-model:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-tooling-core-1.9.22.jar (org.jetbrains.kotlin:kotlin-tooling-core:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-tooling-core-1.9.22.jar (org.jetbrains.kotlin:kotlin-tooling-core:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-util-io-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-io:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-util-io-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-io:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-daemon-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-daemon-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-embeddable:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming trove4j-1.0.20200330.jar (org.jetbrains.intellij.deps:trove4j:1.0.20200330) with InstrumentationAnalysisTransform
Transforming trove4j-1.0.20200330.jar (org.jetbrains.intellij.deps:trove4j:1.0.20200330) with MergeInstrumentationAnalysisTransform
Transforming kotlin-daemon-client-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-client:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-daemon-client-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-client:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlinx-coroutines-core-jvm-1.5.0.jar (org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.5.0) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-api:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlinx-coroutines-core-jvm-1.5.0.jar (org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.5.0) with MergeInstrumentationAnalysisTransform
Transforming kotlin-scripting-jvm-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-jvm:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-jvm-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-jvm:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-scripting-common-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-common:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-common-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-common:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-model:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-gradle-plugin-1.9.22-gradle82.jar (org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-gradle-plugin-idea-proto-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea-proto:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-klib-commonizer-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-klib-commonizer-api:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-native-utils-1.9.22.jar (org.jetbrains.kotlin:kotlin-native-utils:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-gradle-plugin-idea-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-util-klib-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-klib:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-android-extensions-1.9.22.jar (org.jetbrains.kotlin:kotlin-android-extensions:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-embeddable:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-build-tools-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-build-tools-api:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-scripting-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-embeddable:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-compiler-runner-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-runner:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-gradle-plugin-annotations-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-annotations:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-tooling-core-1.9.22.jar (org.jetbrains.kotlin:kotlin-tooling-core:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-scripting-compiler-impl-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-impl-embeddable:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-project-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-project-model:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-util-io-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-io:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-daemon-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-embeddable:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-daemon-client-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-client:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming trove4j-1.0.20200330.jar (org.jetbrains.intellij.deps:trove4j:1.0.20200330) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlinx-coroutines-core-jvm-1.5.0.jar (org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.5.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-scripting-jvm-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-jvm:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-scripting-common-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-common:1.9.22) with ExternalDependencyInstrumentingArtifactTransform

> Configure project :gradle-plugin:react-native-gradle-plugin
Evaluating project ':gradle-plugin:react-native-gradle-plugin' using build file '/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/build.gradle.kts'.
Using Kotlin Gradle Plugin gradle82 variant
kotlin scripting plugin: created the scripting discovery configuration: kotlinScriptDef
kotlin scripting plugin: created the scripting discovery configuration: testKotlinScriptDef

> Configure project :gradle-plugin:settings-plugin
Evaluating project ':gradle-plugin:settings-plugin' using build file '/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/settings-plugin/build.gradle.kts'.
Using Kotlin Gradle Plugin gradle82 variant
kotlin scripting plugin: created the scripting discovery configuration: kotlinScriptDef
kotlin scripting plugin: created the scripting discovery configuration: testKotlinScriptDef
Starting process 'command '/usr/lib/jvm/temurin-21-jdk-amd64/bin/java''. Working directory: /home/runner/.gradle/.tmp/tmp-jvm10762098843126191158probe Command: /usr/lib/jvm/temurin-21-jdk-amd64/bin/java -Xmx32m -Xms32m -cp . JavaProbe
Successfully started process 'command '/usr/lib/jvm/temurin-21-jdk-amd64/bin/java''
Received JVM installation metadata from '/usr/lib/jvm/temurin-21-jdk-amd64': {JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64, JAVA_VERSION=21.0.9, JAVA_VENDOR=Eclipse Adoptium, RUNTIME_NAME=OpenJDK Runtime Environment, RUNTIME_VERSION=21.0.9+10-LTS, VM_NAME=OpenJDK 64-Bit Server VM, VM_VERSION=21.0.9+10-LTS, VM_VENDOR=Eclipse Adoptium, OS_ARCH=amd64}
Starting process 'command '/usr/lib/jvm/temurin-11-jdk-amd64/bin/java''. Working directory: /home/runner/.gradle/.tmp/tmp-jvm9989004928651166214probe Command: /usr/lib/jvm/temurin-11-jdk-amd64/bin/java -Xmx32m -Xms32m -cp . JavaProbe
Successfully started process 'command '/usr/lib/jvm/temurin-11-jdk-amd64/bin/java''
Received JVM installation metadata from '/usr/lib/jvm/temurin-11-jdk-amd64': {JAVA_HOME=/usr/lib/jvm/temurin-11-jdk-amd64, JAVA_VERSION=11.0.29, JAVA_VENDOR=Eclipse Adoptium, RUNTIME_NAME=OpenJDK Runtime Environment, RUNTIME_VERSION=11.0.29+7, VM_NAME=OpenJDK 64-Bit Server VM, VM_VERSION=11.0.29+7, VM_VENDOR=Eclipse Adoptium, OS_ARCH=amd64}
Starting process 'command '/usr/lib/jvm/temurin-8-jdk-amd64/bin/java''. Working directory: /home/runner/.gradle/.tmp/tmp-jvm8706798142225101915probe Command: /usr/lib/jvm/temurin-8-jdk-amd64/bin/java -Xmx32m -Xms32m -cp . JavaProbe
Successfully started process 'command '/usr/lib/jvm/temurin-8-jdk-amd64/bin/java''
Received JVM installation metadata from '/usr/lib/jvm/temurin-8-jdk-amd64': {JAVA_HOME=/usr/lib/jvm/temurin-8-jdk-amd64/jre, JAVA_VERSION=1.8.0_472, JAVA_VENDOR=Temurin, RUNTIME_NAME=OpenJDK Runtime Environment, RUNTIME_VERSION=1.8.0_472-b08, VM_NAME=OpenJDK 64-Bit Server VM, VM_VERSION=25.472-b08, VM_VENDOR=Temurin, OS_ARCH=amd64}
Starting process 'command '/usr/lib/jvm/temurin-25-jdk-amd64/bin/java''. Working directory: /home/runner/.gradle/.tmp/tmp-jvm17543648792816214529probe Command: /usr/lib/jvm/temurin-25-jdk-amd64/bin/java -Xmx32m -Xms32m -cp . JavaProbe
Successfully started process 'command '/usr/lib/jvm/temurin-25-jdk-amd64/bin/java''
Received JVM installation metadata from '/usr/lib/jvm/temurin-25-jdk-amd64': {JAVA_HOME=/usr/lib/jvm/temurin-25-jdk-amd64, JAVA_VERSION=25.0.1, JAVA_VENDOR=Eclipse Adoptium, RUNTIME_NAME=OpenJDK Runtime Environment, RUNTIME_VERSION=25.0.1+8-LTS, VM_NAME=OpenJDK 64-Bit Server VM, VM_VERSION=25.0.1+8-LTS, VM_VENDOR=Eclipse Adoptium, OS_ARCH=amd64}
Resolve mutations for :gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors (Thread[Execution worker,5,main]) started.
:gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors (Thread[Execution worker,5,main]) started.

> Task :gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors
Caching disabled for task ':gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors' because:
  Build cache is disabled
Task ':gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors' is not up-to-date because:
  Task has not declared any outputs despite executing actions.
Resolve mutations for :gradle-plugin:settings-plugin:compileKotlin (Thread[Execution worker,5,main]) started.
:gradle-plugin:settings-plugin:compileKotlin (Thread[Execution worker,5,main]) started.
Resolve mutations for :gradle-plugin:settings-plugin:pluginDescriptors (Thread[Execution worker Thread 3,5,main]) started.
:gradle-plugin:settings-plugin:pluginDescriptors (Thread[Execution worker Thread 3,5,main]) started.

> Task :gradle-plugin:settings-plugin:pluginDescriptors
Caching disabled for task ':gradle-plugin:settings-plugin:pluginDescriptors' because:
  Build cache is disabled
  Not worth caching
Task ':gradle-plugin:settings-plugin:pluginDescriptors' is not up-to-date because:
  Executed with '--rerun-tasks'.
Resolve mutations for :gradle-plugin:settings-plugin:processResources (Thread[Execution worker Thread 3,5,main]) started.
:gradle-plugin:settings-plugin:processResources (Thread[Execution worker Thread 3,5,main]) started.

> Task :gradle-plugin:settings-plugin:processResources
Caching disabled for task ':gradle-plugin:settings-plugin:processResources' because:
  Build cache is disabled
  Not worth caching
Task ':gradle-plugin:settings-plugin:processResources' is not up-to-date because:
  Executed with '--rerun-tasks'.
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/settings-plugin/src/main/resources', not found

> Task :gradle-plugin:settings-plugin:compileKotlin
Transforming gradle-api-8.8.jar with ClasspathEntrySnapshotTransform
Transforming groovy-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-ant-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-astbuilder-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-console-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-datetime-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-dateutil-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-groovydoc-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-json-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-nio-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-sql-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-templates-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-test-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-xml-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming javaparser-core-3.17.0.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-reflect-1.9.22.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-stdlib-1.9.22.jar with ClasspathEntrySnapshotTransform
Transforming gradle-installation-beacon-8.8.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-stdlib-1.9.22.jar with ClasspathEntrySnapshotTransform
Transforming annotations-13.0.jar with ClasspathEntrySnapshotTransform
Caching disabled for task ':gradle-plugin:settings-plugin:compileKotlin' because:
  Build cache is disabled
Task ':gradle-plugin:settings-plugin:compileKotlin' is not up-to-date because:
  Executed with '--rerun-tasks'.
The input changes require a full rebuild for incremental task ':gradle-plugin:settings-plugin:compileKotlin'.
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/settings-plugin/src/main/java', not found
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/settings-plugin/src/main/java', not found
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/settings-plugin/src/main/java', not found
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/settings-plugin/src/main/java', not found
Kotlin source files: /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/settings-plugin/src/main/kotlin/com/facebook/react/ReactSettingsPlugin.kt
Java source files: 
Script source files: 
Script file extensions: 
Using Kotlin/JVM incremental compilation
[KOTLIN] Kotlin compilation 'jdkHome' argument: /usr/lib/jvm/temurin-17-jdk-amd64
i: found daemon on port 17174 (130466 ms old), trying to connect
i: connected to the daemon
Options for KOTLIN DAEMON: IncrementalCompilationOptions(super=CompilationOptions(compilerMode=INCREMENTAL_COMPILER, targetPlatform=JVM, reportCategories=[0, 3], reportSeverity=2, requestedCompilationResults=[0], kotlinScriptExtensions=[]), areFileChangesKnown=false, modifiedFiles=null, deletedFiles=null, classpathChanges=NotAvailableForNonIncrementalRun, workingDir=/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/settings-plugin/build/kotlin/compileKotlin/cacheable, multiModuleICSettings=MultiModuleICSettings(buildHistoryFile=/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/settings-plugin/build/kotlin/compileKotlin/local-state/build-history.bin, useModuleDetection=false), usePreciseJavaTracking=true, outputFiles=[/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/settings-plugin/build/classes/kotlin/main, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/settings-plugin/build/kotlin/compileKotlin/cacheable, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/settings-plugin/build/kotlin/compileKotlin/local-state])
Resolve mutations for :gradle-plugin:settings-plugin:compileJava (Thread[Execution worker,5,main]) started.
:gradle-plugin:settings-plugin:compileJava (Thread[Execution worker,5,main]) started.

> Task :gradle-plugin:settings-plugin:compileJava NO-SOURCE
Skipping task ':gradle-plugin:settings-plugin:compileJava' as it has no source files and no previous output files.
Resolve mutations for :gradle-plugin:settings-plugin:classes (Thread[Execution worker,5,main]) started.
:gradle-plugin:settings-plugin:classes (Thread[Execution worker,5,main]) started.

> Task :gradle-plugin:settings-plugin:classes
Skipping task ':gradle-plugin:settings-plugin:classes' as it has no actions.
Resolve mutations for :gradle-plugin:settings-plugin:jar (Thread[Execution worker,5,main]) started.
:gradle-plugin:settings-plugin:jar (Thread[Execution worker,5,main]) started.

> Task :gradle-plugin:settings-plugin:jar
Caching disabled for task ':gradle-plugin:settings-plugin:jar' because:
  Build cache is disabled
  Not worth caching
Task ':gradle-plugin:settings-plugin:jar' is not up-to-date because:
  Executed with '--rerun-tasks'.
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/settings-plugin/build/classes/java/main', not found
Transforming kotlin-stdlib-1.9.22.jar (org.jetbrains.kotlin:kotlin-stdlib:1.9.22) with InstrumentationAnalysisTransform
Transforming annotations-13.0.jar (org.jetbrains:annotations:13.0) with InstrumentationAnalysisTransform
Transforming main (project :gradle-plugin:settings-plugin) with InstrumentationAnalysisTransform
Transforming main (project :gradle-plugin:settings-plugin) with InstrumentationAnalysisTransform
Transforming kotlin-stdlib-1.9.22.jar (org.jetbrains.kotlin:kotlin-stdlib:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-stdlib-1.9.22.jar (org.jetbrains.kotlin:kotlin-stdlib:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming annotations-13.0.jar (org.jetbrains:annotations:13.0) with InstrumentationAnalysisTransform
Transforming annotations-13.0.jar (org.jetbrains:annotations:13.0) with MergeInstrumentationAnalysisTransform
Transforming kotlin-stdlib-1.9.22.jar (org.jetbrains.kotlin:kotlin-stdlib:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming annotations-13.0.jar (org.jetbrains:annotations:13.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming settings-plugin.jar (project :gradle-plugin:settings-plugin) with ProjectDependencyInstrumentingArtifactTransform
Starting process 'command 'node''. Working directory: /home/runner/work/voyager-rn/voyager-rn/android Command: node -e console.log(require('react-native/package.json').version);
Successfully started process 'command 'node''
Starting process 'command 'node''. Working directory: /home/runner/work/voyager-rn/voyager-rn/android Command: node --print require.resolve('expo-modules-autolinking/package.json', { paths: [require.resolve('expo/package.json')] })
Successfully started process 'command 'node''
Starting process 'command 'node''. Working directory: /home/runner/work/voyager-rn/voyager-rn/android Command: node --no-warnings --eval require(require.resolve('expo-modules-autolinking', { paths: [require.resolve('expo')] }))(process.argv.slice(1)) -- resolve --platform android --json
Successfully started process 'command 'node''
Starting process 'command 'node''. Working directory: /home/runner/work/voyager-rn/voyager-rn/android Command: node -e console.log(require('react-native/package.json').version);
Successfully started process 'command 'node''
Starting process 'command 'node''. Working directory: /home/runner/work/voyager-rn/voyager-rn/android Command: node -e try {console.log(require('@react-native-community/cli').bin);} catch (e) {console.log(require('react-native/cli').bin);}
Successfully started process 'command 'node''
Starting process 'command 'node''. Working directory: /home/runner/work/voyager-rn/voyager-rn/android Command: node /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native-community/cli/build/bin.js config
Successfully started process 'command 'node''
:ReactNative:Automatically adding native module '@react-native-async-storage/async-storage'
:ReactNative:Automatically adding native module '@react-native-community/datetimepicker'
:ReactNative:Automatically adding native module '@react-native-community/slider'
:ReactNative:Automatically adding native module '@react-native-google-signin/google-signin'
:ReactNative:Automatically adding native module '@react-native-picker/picker'
:ReactNative:Automatically adding native module 'expo'
:ReactNative:Automatically adding native module 'react-native-gesture-handler'
:ReactNative:Automatically adding native module 'react-native-get-random-values'
:ReactNative:Automatically adding native module 'react-native-safe-area-context'
:ReactNative:Automatically adding native module 'react-native-screens'
:ReactNative:Automatically adding native module 'react-native-svg'
Settings evaluated using settings file '/home/runner/work/voyager-rn/voyager-rn/android/settings.gradle'.
Now considering [/home/runner/work/voyager-rn/voyager-rn/node_modules/expo-updates/expo-updates-gradle-plugin, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin, /home/runner/work/voyager-rn/voyager-rn/android] as hierarchies to watch
Projects loaded. Root project using build file '/home/runner/work/voyager-rn/voyager-rn/android/build.gradle'.
Included projects: [root project 'TravalPass', project ':app', project ':expo', project ':expo-asset', project ':expo-av', project ':expo-clipboard', project ':expo-constants', project ':expo-eas-client', project ':expo-file-system', project ':expo-font', project ':expo-image-loader', project ':expo-image-manipulator', project ':expo-image-picker', project ':expo-json-utils', project ':expo-keep-awake', project ':expo-linear-gradient', project ':expo-manifests', project ':expo-modules-core', project ':expo-secure-store', project ':expo-sharing', project ':expo-structured-headers', project ':expo-updates', project ':expo-updates-interface', project ':expo-video-thumbnails', project ':react-native-async-storage_async-storage', project ':react-native-community_datetimepicker', project ':react-native-community_slider', project ':react-native-gesture-handler', project ':react-native-get-random-values', project ':react-native-google-signin_google-signin', project ':react-native-picker_picker', project ':react-native-safe-area-context', project ':react-native-screens', project ':react-native-svg']

> Configure project :expo-updates-gradle-plugin
Evaluating project ':expo-updates-gradle-plugin' using build file '/home/runner/work/voyager-rn/voyager-rn/node_modules/expo-updates/expo-updates-gradle-plugin/build.gradle.kts'.
Transforming kotlin-gradle-plugin-model-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-model:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-api-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-api:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-1.9.23-gradle82.jar (org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-proto-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea-proto:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-klib-commonizer-api-1.9.23.jar (org.jetbrains.kotlin:kotlin-klib-commonizer-api:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-native-utils-1.9.23.jar (org.jetbrains.kotlin:kotlin-native-utils:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-util-klib-1.9.23.jar (org.jetbrains.kotlin:kotlin-util-klib:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-build-tools-api-1.9.23.jar (org.jetbrains.kotlin:kotlin-build-tools-api:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-android-extensions-1.9.23.jar (org.jetbrains.kotlin:kotlin-android-extensions:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-compiler-runner-1.9.23.jar (org.jetbrains.kotlin:kotlin-compiler-runner:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-compiler-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-compiler-embeddable:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-embeddable:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-impl-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-impl-embeddable:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-annotations-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-annotations:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-project-model-1.9.23.jar (org.jetbrains.kotlin:kotlin-project-model:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-tooling-core-1.9.23.jar (org.jetbrains.kotlin:kotlin-tooling-core:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-util-io-1.9.23.jar (org.jetbrains.kotlin:kotlin-util-io:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-daemon-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-daemon-embeddable:1.9.23) with InstrumentationAnalysisTransform
Transforming trove4j-1.0.20200330.jar (org.jetbrains.intellij.deps:trove4j:1.0.20200330) with InstrumentationAnalysisTransform
Transforming kotlin-daemon-client-1.9.23.jar (org.jetbrains.kotlin:kotlin-daemon-client:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlinx-coroutines-core-jvm-1.5.0.jar (org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.5.0) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-jvm-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-jvm:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-common-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-common:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-model-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-model:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-model-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-model:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-api-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-api:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-api-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-api:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-1.9.23-gradle82.jar (org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-1.9.23-gradle82.jar (org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-proto-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea-proto:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-proto-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea-proto:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-klib-commonizer-api-1.9.23.jar (org.jetbrains.kotlin:kotlin-klib-commonizer-api:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-klib-commonizer-api-1.9.23.jar (org.jetbrains.kotlin:kotlin-klib-commonizer-api:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-native-utils-1.9.23.jar (org.jetbrains.kotlin:kotlin-native-utils:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-native-utils-1.9.23.jar (org.jetbrains.kotlin:kotlin-native-utils:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-util-klib-1.9.23.jar (org.jetbrains.kotlin:kotlin-util-klib:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-util-klib-1.9.23.jar (org.jetbrains.kotlin:kotlin-util-klib:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-build-tools-api-1.9.23.jar (org.jetbrains.kotlin:kotlin-build-tools-api:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-build-tools-api-1.9.23.jar (org.jetbrains.kotlin:kotlin-build-tools-api:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-android-extensions-1.9.23.jar (org.jetbrains.kotlin:kotlin-android-extensions:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-android-extensions-1.9.23.jar (org.jetbrains.kotlin:kotlin-android-extensions:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-compiler-runner-1.9.23.jar (org.jetbrains.kotlin:kotlin-compiler-runner:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-compiler-runner-1.9.23.jar (org.jetbrains.kotlin:kotlin-compiler-runner:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-compiler-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-compiler-embeddable:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-compiler-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-compiler-embeddable:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-embeddable:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-embeddable:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-impl-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-impl-embeddable:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-impl-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-impl-embeddable:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-annotations-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-annotations:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-annotations-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-annotations:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-project-model-1.9.23.jar (org.jetbrains.kotlin:kotlin-project-model:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-project-model-1.9.23.jar (org.jetbrains.kotlin:kotlin-project-model:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-tooling-core-1.9.23.jar (org.jetbrains.kotlin:kotlin-tooling-core:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-tooling-core-1.9.23.jar (org.jetbrains.kotlin:kotlin-tooling-core:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-util-io-1.9.23.jar (org.jetbrains.kotlin:kotlin-util-io:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-util-io-1.9.23.jar (org.jetbrains.kotlin:kotlin-util-io:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-daemon-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-daemon-embeddable:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-daemon-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-daemon-embeddable:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming trove4j-1.0.20200330.jar (org.jetbrains.intellij.deps:trove4j:1.0.20200330) with InstrumentationAnalysisTransform
Transforming trove4j-1.0.20200330.jar (org.jetbrains.intellij.deps:trove4j:1.0.20200330) with MergeInstrumentationAnalysisTransform
Transforming kotlin-daemon-client-1.9.23.jar (org.jetbrains.kotlin:kotlin-daemon-client:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-daemon-client-1.9.23.jar (org.jetbrains.kotlin:kotlin-daemon-client:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlinx-coroutines-core-jvm-1.5.0.jar (org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.5.0) with InstrumentationAnalysisTransform
Transforming kotlinx-coroutines-core-jvm-1.5.0.jar (org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.5.0) with MergeInstrumentationAnalysisTransform
Transforming kotlin-scripting-jvm-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-jvm:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-jvm-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-jvm:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-scripting-common-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-common:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-common-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-common:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-model-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-model:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-gradle-plugin-1.9.23-gradle82.jar (org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-gradle-plugin-api-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-api:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-gradle-plugin-idea-proto-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea-proto:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-gradle-plugin-idea-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-klib-commonizer-api-1.9.23.jar (org.jetbrains.kotlin:kotlin-klib-commonizer-api:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-native-utils-1.9.23.jar (org.jetbrains.kotlin:kotlin-native-utils:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-util-klib-1.9.23.jar (org.jetbrains.kotlin:kotlin-util-klib:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-build-tools-api-1.9.23.jar (org.jetbrains.kotlin:kotlin-build-tools-api:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-android-extensions-1.9.23.jar (org.jetbrains.kotlin:kotlin-android-extensions:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-compiler-runner-1.9.23.jar (org.jetbrains.kotlin:kotlin-compiler-runner:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-compiler-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-compiler-embeddable:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-scripting-compiler-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-embeddable:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-scripting-compiler-impl-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-impl-embeddable:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-project-model-1.9.23.jar (org.jetbrains.kotlin:kotlin-project-model:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-tooling-core-1.9.23.jar (org.jetbrains.kotlin:kotlin-tooling-core:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-util-io-1.9.23.jar (org.jetbrains.kotlin:kotlin-util-io:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-daemon-embeddable-1.9.23.jar (org.jetbrains.kotlin:kotlin-daemon-embeddable:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming trove4j-1.0.20200330.jar (org.jetbrains.intellij.deps:trove4j:1.0.20200330) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlinx-coroutines-core-jvm-1.5.0.jar (org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.5.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-scripting-jvm-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-jvm:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-gradle-plugin-annotations-1.9.23.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-annotations:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-scripting-common-1.9.23.jar (org.jetbrains.kotlin:kotlin-scripting-common:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-daemon-client-1.9.23.jar (org.jetbrains.kotlin:kotlin-daemon-client:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Using Kotlin Gradle Plugin gradle82 variant
kotlin scripting plugin: created the scripting discovery configuration: kotlinScriptDef
kotlin scripting plugin: created the scripting discovery configuration: testKotlinScriptDef
Registering project ':expo-updates-gradle-plugin' in composite build. Will substitute for module 'expo.modules:expo-updates-gradle-plugin'.
Registering project ':gradle-plugin' in composite build. Will substitute for module ':gradle-plugin-root'.
Registering project ':gradle-plugin:react-native-gradle-plugin' in composite build. Will substitute for module 'com.facebook.react:react-native-gradle-plugin'.
Registering project ':gradle-plugin:settings-plugin' in composite build. Will substitute for module 'com.facebook.react:settings-plugin'.
Resolve mutations for :gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors (Thread[Execution worker,5,main]) started.
:gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors (Thread[Execution worker,5,main]) started.

> Task :gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
Caching disabled for task ':gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors' because:
  Build cache is disabled
Task ':gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors' is not up-to-date because:
  Task has not declared any outputs despite executing actions.
Resolve mutations for :gradle-plugin:react-native-gradle-plugin:compileKotlin (Thread[Execution worker,5,main]) started.

> Task :expo-updates-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
Caching disabled for task ':expo-updates-gradle-plugin:checkKotlinGradlePluginConfigurationErrors' because:
  Build cache is disabled
Task ':expo-updates-gradle-plugin:checkKotlinGradlePluginConfigurationErrors' is not up-to-date because:
  Task has not declared any outputs despite executing actions.

> Task :expo-updates-gradle-plugin:pluginDescriptors
Caching disabled for task ':expo-updates-gradle-plugin:pluginDescriptors' because:
  Build cache is disabled
  Not worth caching
Task ':expo-updates-gradle-plugin:pluginDescriptors' is not up-to-date because:
  Executed with '--rerun-tasks'.

> Task :expo-updates-gradle-plugin:processResources
Caching disabled for task ':expo-updates-gradle-plugin:processResources' because:
  Build cache is disabled
  Not worth caching
Task ':expo-updates-gradle-plugin:processResources' is not up-to-date because:
  Executed with '--rerun-tasks'.
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/expo-updates/expo-updates-gradle-plugin/src/main/resources', not found
Resolve mutations for :gradle-plugin:react-native-gradle-plugin:pluginDescriptors (Thread[Execution worker,5,main]) started.
:gradle-plugin:react-native-gradle-plugin:pluginDescriptors (Thread[Execution worker,5,main]) started.

> Task :gradle-plugin:react-native-gradle-plugin:pluginDescriptors
Caching disabled for task ':gradle-plugin:react-native-gradle-plugin:pluginDescriptors' because:
  Build cache is disabled
  Not worth caching
Task ':gradle-plugin:react-native-gradle-plugin:pluginDescriptors' is not up-to-date because:
  Executed with '--rerun-tasks'.
Resolve mutations for :gradle-plugin:react-native-gradle-plugin:processResources (Thread[Execution worker,5,main]) started.
:gradle-plugin:react-native-gradle-plugin:processResources (Thread[Execution worker,5,main]) started.

> Task :gradle-plugin:react-native-gradle-plugin:processResources
Caching disabled for task ':gradle-plugin:react-native-gradle-plugin:processResources' because:
  Build cache is disabled
  Not worth caching
Task ':gradle-plugin:react-native-gradle-plugin:processResources' is not up-to-date because:
  Executed with '--rerun-tasks'.
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/resources', not found

> Configure project :
Evaluating root project 'TravalPass' using build file '/home/runner/work/voyager-rn/voyager-rn/android/build.gradle'.
Found project 'project :expo-updates-gradle-plugin' as substitute for module 'expo.modules:expo-updates-gradle-plugin'.
Found project 'project :gradle-plugin:react-native-gradle-plugin' as substitute for module 'com.facebook.react:react-native-gradle-plugin'.
Found project 'project :gradle-plugin:react-native-gradle-plugin' as substitute for module 'com.facebook.react:react-native-gradle-plugin'.
Ignoring listeners of task graph ready event, as this build (:gradle-plugin) has already executed work.
Resolve mutations for :expo-updates-gradle-plugin:checkKotlinGradlePluginConfigurationErrors (Thread[included builds,5,main]) started.
:expo-updates-gradle-plugin:checkKotlinGradlePluginConfigurationErrors (Thread[included builds,5,main]) started.
Resolve mutations for :expo-updates-gradle-plugin:pluginDescriptors (Thread[included builds,5,main]) started.
:expo-updates-gradle-plugin:pluginDescriptors (Thread[included builds,5,main]) started.
:gradle-plugin:react-native-gradle-plugin:compileKotlin (Thread[included builds Thread 2,5,main]) started.
Resolve mutations for :expo-updates-gradle-plugin:processResources (Thread[included builds,5,main]) started.
:expo-updates-gradle-plugin:processResources (Thread[included builds,5,main]) started.

> Task :gradle-plugin:react-native-gradle-plugin:compileKotlin
Transforming gradle-api-8.8.jar with ClasspathEntrySnapshotTransform
Transforming groovy-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-ant-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-astbuilder-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-console-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-datetime-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-dateutil-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-groovydoc-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-json-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-nio-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-sql-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-templates-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-test-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-xml-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming javaparser-core-3.17.0.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-reflect-1.9.22.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-stdlib-1.9.22.jar with ClasspathEntrySnapshotTransform
Transforming gradle-installation-beacon-8.8.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-stdlib-1.9.22.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-gradle-plugin-model-1.9.22.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-gradle-plugin-api-1.9.22.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-gradle-plugin-1.9.22-gradle82.jar with ClasspathEntrySnapshotTransform
Transforming gradle-8.2.1.jar with ClasspathEntrySnapshotTransform
Transforming gson-2.8.9.jar with ClasspathEntrySnapshotTransform
Transforming guava-31.0.1-jre.jar with ClasspathEntrySnapshotTransform
Transforming javapoet-1.13.0.jar with ClasspathEntrySnapshotTransform
Transforming annotations-13.0.jar with ClasspathEntrySnapshotTransform
Transforming builder-8.2.1.jar with ClasspathEntrySnapshotTransform
Transforming builder-model-8.2.1.jar with ClasspathEntrySnapshotTransform
Transforming gradle-api-8.2.1.jar with ClasspathEntrySnapshotTransform
Transforming failureaccess-1.0.1.jar with ClasspathEntrySnapshotTransform
Transforming listenablefuture-9999.0-empty-to-avoid-conflict-with-guava.jar with ClasspathEntrySnapshotTransform
Transforming jsr305-3.0.2.jar with ClasspathEntrySnapshotTransform
Transforming checker-qual-3.12.0.jar with ClasspathEntrySnapshotTransform
Transforming error_prone_annotations-2.7.1.jar with ClasspathEntrySnapshotTransform
Transforming j2objc-annotations-1.3.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-gradle-plugin-annotations-1.9.22.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-native-utils-1.9.22.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-tooling-core-1.9.22.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-project-model-1.9.22.jar with ClasspathEntrySnapshotTransform
Transforming manifest-merger-31.2.1.jar with ClasspathEntrySnapshotTransform
Transforming zipflinger-8.2.1.jar with ClasspathEntrySnapshotTransform
Transforming apksig-8.2.1.jar with ClasspathEntrySnapshotTransform
Transforming apkzlib-8.2.1.jar with ClasspathEntrySnapshotTransform
Transforming javawriter-2.5.0.jar with ClasspathEntrySnapshotTransform
Transforming asm-9.2.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-util-klib-1.9.22.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-util-io-1.9.22.jar with ClasspathEntrySnapshotTransform
Caching disabled for task ':gradle-plugin:react-native-gradle-plugin:compileKotlin' because:
  Build cache is disabled
Task ':gradle-plugin:react-native-gradle-plugin:compileKotlin' is not up-to-date because:
  Executed with '--rerun-tasks'.
The input changes require a full rebuild for incremental task ':gradle-plugin:react-native-gradle-plugin:compileKotlin'.
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/java', not found
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/java', not found
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/java', not found
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/java', not found
Kotlin source files: /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/model/ModelCodegenConfigAndroid.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/model/ModelPackageJson.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/model/ModelCodegenConfig.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/PropertyUtils.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/JdkConfiguratorUtils.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/FileUtils.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/KotlinStdlibCompatUtils.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/AgpConfiguratorUtils.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/ProjectUtils.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/TaskUtils.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/Os.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/PathUtils.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/DependencyUtils.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/BackwardCompatUtils.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/JsonUtils.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/NdkConfiguratorUtils.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/ReactPlugin.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/internal/PrivateReactExtension.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/BundleHermesCTask.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/internal/utils/PrefabPreprocessingEntry.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/internal/PrepareGlogTask.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/internal/PreparePrefabHeadersTask.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/internal/PrepareBoostTask.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/internal/BuildCodegenCLITask.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/internal/PrepareJSCTask.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/GenerateCodegenArtifactsTask.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/GenerateCodegenSchemaTask.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/ReactRootProjectPlugin.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/ReactExtension.kt, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/TaskConfiguration.kt
Java source files: 
Script source files: 
Script file extensions: 
Using Kotlin/JVM incremental compilation
[KOTLIN] Kotlin compilation 'jdkHome' argument: /usr/lib/jvm/temurin-17-jdk-amd64
i: found daemon on port 17174 (136396 ms old), trying to connect
i: connected to the daemon
Options for KOTLIN DAEMON: IncrementalCompilationOptions(super=CompilationOptions(compilerMode=INCREMENTAL_COMPILER, targetPlatform=JVM, reportCategories=[0, 3], reportSeverity=2, requestedCompilationResults=[0], kotlinScriptExtensions=[]), areFileChangesKnown=false, modifiedFiles=null, deletedFiles=null, classpathChanges=NotAvailableForNonIncrementalRun, workingDir=/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/build/kotlin/compileKotlin/cacheable, multiModuleICSettings=MultiModuleICSettings(buildHistoryFile=/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/build/kotlin/compileKotlin/local-state/build-history.bin, useModuleDetection=false), usePreciseJavaTracking=true, outputFiles=[/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/build/classes/kotlin/main, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/build/kotlin/compileKotlin/cacheable, /home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/build/kotlin/compileKotlin/local-state])
other build task :gradle-plugin:react-native-gradle-plugin:compileKotlin (Thread[Execution worker,5,main]) started.

> Task :gradle-plugin:react-native-gradle-plugin:compileJava NO-SOURCE
Skipping task ':gradle-plugin:react-native-gradle-plugin:compileJava' as it has no source files and no previous output files.
Resolve mutations for :gradle-plugin:react-native-gradle-plugin:classes (Thread[Execution worker,5,main]) started.
:gradle-plugin:react-native-gradle-plugin:classes (Thread[Execution worker,5,main]) started.

> Task :gradle-plugin:react-native-gradle-plugin:classes
Skipping task ':gradle-plugin:react-native-gradle-plugin:classes' as it has no actions.
Resolve mutations for :gradle-plugin:react-native-gradle-plugin:jar (Thread[Execution worker,5,main]) started.
:gradle-plugin:react-native-gradle-plugin:jar (Thread[Execution worker,5,main]) started.
other build task :gradle-plugin:react-native-gradle-plugin:compileJava (Thread[Execution worker Thread 3,5,main]) started.

> Configure project :
Resolve mutations for :gradle-plugin:react-native-gradle-plugin:compileJava (Thread[included builds Thread 2,5,main]) started.
:gradle-plugin:react-native-gradle-plugin:compileJava (Thread[included builds Thread 2,5,main]) started.

> Task :gradle-plugin:react-native-gradle-plugin:jar
Caching disabled for task ':gradle-plugin:react-native-gradle-plugin:jar' because:
  Build cache is disabled
  Not worth caching
Task ':gradle-plugin:react-native-gradle-plugin:jar' is not up-to-date because:
  Executed with '--rerun-tasks'.
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/build/classes/java/main', not found
work action resolve main (project :gradle-plugin:react-native-gradle-plugin) (Thread[Execution worker,5,main]) started.
work action resolve main (project :gradle-plugin:react-native-gradle-plugin) (Thread[Execution worker,5,main]) started.
work action resolve main (project :gradle-plugin:react-native-gradle-plugin) (Thread[Execution worker,5,main]) started.
Resolve mutations for :expo-updates-gradle-plugin:compileKotlin (Thread[Execution worker,5,main]) started.
:expo-updates-gradle-plugin:compileKotlin (Thread[Execution worker,5,main]) started.

> Task :expo-updates-gradle-plugin:compileKotlin
Transforming gradle-api-8.8.jar with ClasspathEntrySnapshotTransform
Transforming groovy-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-ant-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-astbuilder-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-console-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-datetime-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-dateutil-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-groovydoc-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-json-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-nio-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-sql-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-templates-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-test-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming groovy-xml-3.0.21.jar with ClasspathEntrySnapshotTransform
Transforming javaparser-core-3.17.0.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-reflect-1.9.22.jar with ClasspathEntrySnapshotTransform
Transforming kotlin-stdlib-1.9.22.jar with ClasspathEntrySnapshotTransform
Transforming gradle-installation-beacon-8.8.jar with ClasspathEntrySnapshotTransform
Transforming main with ClasspathEntrySnapshotTransform
Transforming kotlin-stdlib-1.9.23.jar with ClasspathEntrySnapshotTransform
Transforming gradle-8.2.1.jar with ClasspathEntrySnapshotTransform
Transforming annotations-13.0.jar with ClasspathEntrySnapshotTransform
Transforming builder-8.2.1.jar with ClasspathEntrySnapshotTransform
Transforming builder-model-8.2.1.jar with ClasspathEntrySnapshotTransform
Transforming gradle-api-8.2.1.jar with ClasspathEntrySnapshotTransform
Transforming manifest-merger-31.2.1.jar with ClasspathEntrySnapshotTransform
Transforming zipflinger-8.2.1.jar with ClasspathEntrySnapshotTransform
Transforming apksig-8.2.1.jar with ClasspathEntrySnapshotTransform
Transforming apkzlib-8.2.1.jar with ClasspathEntrySnapshotTransform
Transforming javawriter-2.5.0.jar with ClasspathEntrySnapshotTransform
Transforming asm-9.2.jar with ClasspathEntrySnapshotTransform
Caching disabled for task ':expo-updates-gradle-plugin:compileKotlin' because:
  Build cache is disabled
Task ':expo-updates-gradle-plugin:compileKotlin' is not up-to-date because:
  Executed with '--rerun-tasks'.
The input changes require a full rebuild for incremental task ':expo-updates-gradle-plugin:compileKotlin'.
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/expo-updates/expo-updates-gradle-plugin/src/main/java', not found
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/expo-updates/expo-updates-gradle-plugin/src/main/java', not found
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/expo-updates/expo-updates-gradle-plugin/src/main/java', not found
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/expo-updates/expo-updates-gradle-plugin/src/main/java', not found
Kotlin source files: /home/runner/work/voyager-rn/voyager-rn/node_modules/expo-updates/expo-updates-gradle-plugin/src/main/kotlin/expo/modules/updates/ExpoUpdatesPlugin.kt
Java source files: 
Script source files: 
Script file extensions: 
Using Kotlin/JVM incremental compilation
[KOTLIN] Kotlin compilation 'jdkHome' argument: /usr/lib/jvm/temurin-17-jdk-amd64
i: found daemon on port 17197 (47287 ms old), trying to connect
i: connected to the daemon
Options for KOTLIN DAEMON: IncrementalCompilationOptions(super=CompilationOptions(compilerMode=INCREMENTAL_COMPILER, targetPlatform=JVM, reportCategories=[0, 3], reportSeverity=2, requestedCompilationResults=[0], kotlinScriptExtensions=[]), areFileChangesKnown=false, modifiedFiles=null, deletedFiles=null, classpathChanges=NotAvailableForNonIncrementalRun, workingDir=/home/runner/work/voyager-rn/voyager-rn/node_modules/expo-updates/expo-updates-gradle-plugin/build/kotlin/compileKotlin/cacheable, multiModuleICSettings=MultiModuleICSettings(buildHistoryFile=/home/runner/work/voyager-rn/voyager-rn/node_modules/expo-updates/expo-updates-gradle-plugin/build/kotlin/compileKotlin/local-state/build-history.bin, useModuleDetection=false), usePreciseJavaTracking=true, outputFiles=[/home/runner/work/voyager-rn/voyager-rn/node_modules/expo-updates/expo-updates-gradle-plugin/build/classes/kotlin/main, /home/runner/work/voyager-rn/voyager-rn/node_modules/expo-updates/expo-updates-gradle-plugin/build/kotlin/compileKotlin/cacheable, /home/runner/work/voyager-rn/voyager-rn/node_modules/expo-updates/expo-updates-gradle-plugin/build/kotlin/compileKotlin/local-state])
Resolve mutations for :expo-updates-gradle-plugin:compileJava (Thread[Execution worker,5,main]) started.
:expo-updates-gradle-plugin:compileJava (Thread[Execution worker,5,main]) started.

> Task :expo-updates-gradle-plugin:compileJava NO-SOURCE
Skipping task ':expo-updates-gradle-plugin:compileJava' as it has no source files and no previous output files.
Resolve mutations for :expo-updates-gradle-plugin:classes (Thread[Execution worker,5,main]) started.
:expo-updates-gradle-plugin:classes (Thread[Execution worker,5,main]) started.

> Task :expo-updates-gradle-plugin:classes
Skipping task ':expo-updates-gradle-plugin:classes' as it has no actions.
Resolve mutations for :expo-updates-gradle-plugin:jar (Thread[Execution worker,5,main]) started.
:expo-updates-gradle-plugin:jar (Thread[Execution worker,5,main]) started.

> Task :expo-updates-gradle-plugin:jar
Caching disabled for task ':expo-updates-gradle-plugin:jar' because:
  Build cache is disabled
  Not worth caching
Task ':expo-updates-gradle-plugin:jar' is not up-to-date because:
  Executed with '--rerun-tasks'.
file or directory '/home/runner/work/voyager-rn/voyager-rn/node_modules/expo-updates/expo-updates-gradle-plugin/build/classes/java/main', not found

> Configure project :
Transforming gradle-8.2.1.jar (com.android.tools.build:gradle:8.2.1) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-model:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-api:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-1.9.22-gradle82.jar (org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22) with InstrumentationAnalysisTransform
Transforming databinding-compiler-common-8.2.1.jar (androidx.databinding:databinding-compiler-common:8.2.1) with InstrumentationAnalysisTransform
Transforming jetifier-processor-1.0.0-beta10.jar (com.android.tools.build.jetifier:jetifier-processor:1.0.0-beta10) with InstrumentationAnalysisTransform
Transforming jetifier-core-1.0.0-beta10.jar (com.android.tools.build.jetifier:jetifier-core:1.0.0-beta10) with InstrumentationAnalysisTransform
Transforming gradle-settings-api-8.2.1.jar (com.android.tools.build:gradle-settings-api:8.2.1) with InstrumentationAnalysisTransform
Transforming lint-model-31.2.1.jar (com.android.tools.lint:lint-model:31.2.1) with InstrumentationAnalysisTransform
Transforming builder-8.2.1.jar (com.android.tools.build:builder:8.2.1) with InstrumentationAnalysisTransform
Transforming manifest-merger-31.2.1.jar (com.android.tools.build:manifest-merger:31.2.1) with InstrumentationAnalysisTransform
Transforming sdk-common-31.2.1.jar (com.android.tools:sdk-common:31.2.1) with InstrumentationAnalysisTransform
Transforming sdklib-31.2.1.jar (com.android.tools:sdklib:31.2.1) with InstrumentationAnalysisTransform
Transforming repository-31.2.1.jar (com.android.tools:repository:31.2.1) with InstrumentationAnalysisTransform
Transforming aaptcompiler-8.2.1.jar (com.android.tools.build:aaptcompiler:8.2.1) with InstrumentationAnalysisTransform
Transforming tracker-31.2.1.jar (com.android.tools.analytics-library:tracker:31.2.1) with InstrumentationAnalysisTransform
Transforming shared-31.2.1.jar (com.android.tools.analytics-library:shared:31.2.1) with InstrumentationAnalysisTransform
Transforming android-test-plugin-host-emulator-control-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-emulator-control-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming android-test-plugin-host-retention-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-retention-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming builder-model-8.2.1.jar (com.android.tools.build:builder-model:8.2.1) with InstrumentationAnalysisTransform
Transforming gradle-api-8.2.1.jar (com.android.tools.build:gradle-api:8.2.1) with InstrumentationAnalysisTransform
Transforming builder-test-api-8.2.1.jar (com.android.tools.build:builder-test-api:8.2.1) with InstrumentationAnalysisTransform
Transforming ddmlib-31.2.1.jar (com.android.tools.ddms:ddmlib:31.2.1) with InstrumentationAnalysisTransform
Transforming layoutlib-api-31.2.1.jar (com.android.tools.layoutlib:layoutlib-api:31.2.1) with InstrumentationAnalysisTransform
Transforming dvlib-31.2.1.jar (com.android.tools:dvlib:31.2.1) with InstrumentationAnalysisTransform
Transforming common-31.2.1.jar (com.android.tools:common:31.2.1) with InstrumentationAnalysisTransform
Transforming kotlin-stdlib-jdk8-1.9.0.jar (org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.9.0) with InstrumentationAnalysisTransform
Transforming kotlin-reflect-1.9.0.jar (org.jetbrains.kotlin:kotlin-reflect:1.9.0) with InstrumentationAnalysisTransform
Transforming kotlin-stdlib-jdk7-1.9.0.jar (org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.9.0) with InstrumentationAnalysisTransform
Transforming kotlin-stdlib-1.9.23.jar (org.jetbrains.kotlin:kotlin-stdlib:1.9.23) with InstrumentationAnalysisTransform
Transforming android-test-plugin-result-listener-gradle-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-result-listener-gradle-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming bundletool-1.15.2.jar (com.android.tools.build:bundletool:1.15.2) with InstrumentationAnalysisTransform
Transforming protobuf-java-util-3.19.3.jar (com.google.protobuf:protobuf-java-util:3.19.3) with InstrumentationAnalysisTransform
Transforming grpc-netty-1.45.1.jar (io.grpc:grpc-netty:1.45.1) with InstrumentationAnalysisTransform
Transforming grpc-core-1.45.1.jar (io.grpc:grpc-core:1.45.1) with InstrumentationAnalysisTransform
Transforming tink-1.7.0.jar (com.google.crypto.tink:tink:1.7.0) with InstrumentationAnalysisTransform
Transforming gson-2.10.jar (com.google.code.gson:gson:2.10) with InstrumentationAnalysisTransform
Transforming crash-31.2.1.jar (com.android.tools.analytics-library:crash:31.2.1) with InstrumentationAnalysisTransform
Transforming lint-typedef-remover-31.2.1.jar (com.android.tools.lint:lint-typedef-remover:31.2.1) with InstrumentationAnalysisTransform
Transforming grpc-protobuf-1.45.1.jar (io.grpc:grpc-protobuf:1.45.1) with InstrumentationAnalysisTransform
Transforming grpc-stub-1.45.1.jar (io.grpc:grpc-stub:1.45.1) with InstrumentationAnalysisTransform
Transforming jimfs-1.1.jar (com.google.jimfs:jimfs:1.1) with InstrumentationAnalysisTransform
Transforming grpc-protobuf-lite-1.45.1.jar (io.grpc:grpc-protobuf-lite:1.45.1) with InstrumentationAnalysisTransform
Transforming grpc-api-1.45.1.jar (io.grpc:grpc-api:1.45.1) with InstrumentationAnalysisTransform
Transforming apkzlib-8.2.1.jar (com.android.tools.build:apkzlib:8.2.1) with InstrumentationAnalysisTransform
Transforming guava-31.1-jre.jar (com.google.guava:guava:31.1-jre) with InstrumentationAnalysisTransform
Transforming javapoet-1.13.0.jar (com.squareup:javapoet:1.13.0) with InstrumentationAnalysisTransform
Transforming annotations-13.0.jar (org.jetbrains:annotations:13.0) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-proto-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea-proto:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-klib-commonizer-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-klib-commonizer-api:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-native-utils-1.9.22.jar (org.jetbrains.kotlin:kotlin-native-utils:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-util-klib-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-klib:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-build-tools-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-build-tools-api:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-android-extensions-1.9.22.jar (org.jetbrains.kotlin:kotlin-android-extensions:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-compiler-runner-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-runner:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-impl-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-impl-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming aapt2-proto-8.2.1-10154469.jar (com.android.tools.build:aapt2-proto:8.2.1-10154469) with InstrumentationAnalysisTransform
Transforming databinding-common-8.2.1.jar (androidx.databinding:databinding-common:8.2.1) with InstrumentationAnalysisTransform
Transforming baseLibrary-8.2.1.jar (com.android.databinding:baseLibrary:8.2.1) with InstrumentationAnalysisTransform
Transforming android-device-provider-ddmlib-proto-31.2.1.jar (com.android.tools.utp:android-device-provider-ddmlib-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming android-device-provider-gradle-proto-31.2.1.jar (com.android.tools.utp:android-device-provider-gradle-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming android-test-plugin-host-additional-test-output-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-additional-test-output-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming android-test-plugin-host-coverage-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-coverage-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming android-test-plugin-host-logcat-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-logcat-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming android-test-plugin-host-apk-installer-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-apk-installer-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming transform-api-2.0.0-deprecated-use-gradle-api.jar (com.android.tools.build:transform-api:2.0.0-deprecated-use-gradle-api) with InstrumentationAnalysisTransform
Transforming httpmime-4.5.6.jar (org.apache.httpcomponents:httpmime:4.5.6) with InstrumentationAnalysisTransform
Transforming commons-io-2.4.jar (commons-io:commons-io:2.4) with InstrumentationAnalysisTransform
Transforming asm-commons-9.2.jar (org.ow2.asm:asm-commons:9.2) with InstrumentationAnalysisTransform
Transforming asm-util-9.2.jar (org.ow2.asm:asm-util:9.2) with InstrumentationAnalysisTransform
Transforming asm-analysis-9.2.jar (org.ow2.asm:asm-analysis:9.2) with InstrumentationAnalysisTransform
Transforming asm-tree-9.2.jar (org.ow2.asm:asm-tree:9.2) with InstrumentationAnalysisTransform
Transforming asm-9.2.jar (org.ow2.asm:asm:9.2) with InstrumentationAnalysisTransform
Transforming bcpkix-jdk15on-1.67.jar (org.bouncycastle:bcpkix-jdk15on:1.67) with InstrumentationAnalysisTransform
Transforming jaxb-runtime-2.3.2.jar (org.glassfish.jaxb:jaxb-runtime:2.3.2) with InstrumentationAnalysisTransform
Transforming jopt-simple-4.9.jar (net.sf.jopt-simple:jopt-simple:4.9) with InstrumentationAnalysisTransform
Transforming protos-31.2.1.jar (com.android.tools.analytics-library:protos:31.2.1) with InstrumentationAnalysisTransform
Transforming proto-google-common-protos-2.0.1.jar (com.google.api.grpc:proto-google-common-protos:2.0.1) with InstrumentationAnalysisTransform
Transforming protobuf-java-3.19.3.jar (com.google.protobuf:protobuf-java:3.19.3) with InstrumentationAnalysisTransform
Transforming core-proto-0.0.8-alpha08.jar (com.google.testing.platform:core-proto:0.0.8-alpha08) with InstrumentationAnalysisTransform
Transforming tensorflow-lite-metadata-0.1.0-rc2.jar (org.tensorflow:tensorflow-lite-metadata:0.1.0-rc2) with InstrumentationAnalysisTransform
Transforming flatbuffers-java-1.12.0.jar (com.google.flatbuffers:flatbuffers-java:1.12.0) with InstrumentationAnalysisTransform
Transforming failureaccess-1.0.1.jar (com.google.guava:failureaccess:1.0.1) with InstrumentationAnalysisTransform
Transforming listenablefuture-9999.0-empty-to-avoid-conflict-with-guava.jar (com.google.guava:listenablefuture:9999.0-empty-to-avoid-conflict-with-guava) with InstrumentationAnalysisTransform
Transforming jsr305-3.0.2.jar (com.google.code.findbugs:jsr305:3.0.2) with InstrumentationAnalysisTransform
Transforming checker-qual-3.12.0.jar (org.checkerframework:checker-qual:3.12.0) with InstrumentationAnalysisTransform
Transforming error_prone_annotations-2.11.0.jar (com.google.errorprone:error_prone_annotations:2.11.0) with InstrumentationAnalysisTransform
Transforming j2objc-annotations-1.3.jar (com.google.j2objc:j2objc-annotations:1.3) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-annotations-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-annotations:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-project-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-project-model:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-tooling-core-1.9.22.jar (org.jetbrains.kotlin:kotlin-tooling-core:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-util-io-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-io:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-daemon-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming trove4j-1.0.20200330.jar (org.jetbrains.intellij.deps:trove4j:1.0.20200330) with InstrumentationAnalysisTransform
Transforming kotlin-daemon-client-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-client:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlinx-coroutines-core-jvm-1.5.0.jar (org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.5.0) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-jvm-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-jvm:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-common-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-common:1.9.22) with InstrumentationAnalysisTransform
Transforming dagger-2.28.3.jar (com.google.dagger:dagger:2.28.3) with InstrumentationAnalysisTransform
Transforming javax.inject-1.jar (javax.inject:javax.inject:1) with InstrumentationAnalysisTransform
Transforming kxml2-2.3.0.jar (net.sf.kxml:kxml2:2.3.0) with InstrumentationAnalysisTransform
Transforming bcprov-jdk15on-1.67.jar (org.bouncycastle:bcprov-jdk15on:1.67) with InstrumentationAnalysisTransform
Transforming xercesImpl-2.12.0.jar (xerces:xercesImpl:2.12.0) with InstrumentationAnalysisTransform
Transforming commons-compress-1.21.jar (org.apache.commons:commons-compress:1.21) with InstrumentationAnalysisTransform
Transforming httpclient-4.5.14.jar (org.apache.httpcomponents:httpclient:4.5.14) with InstrumentationAnalysisTransform
Transforming httpcore-4.4.16.jar (org.apache.httpcomponents:httpcore:4.4.16) with InstrumentationAnalysisTransform
Transforming javax.activation-1.2.0.jar (com.sun.activation:javax.activation:1.2.0) with InstrumentationAnalysisTransform
Transforming signflinger-8.2.1.jar (com.android:signflinger:8.2.1) with InstrumentationAnalysisTransform
Transforming zipflinger-8.2.1.jar (com.android:zipflinger:8.2.1) with InstrumentationAnalysisTransform
Transforming annotations-31.2.1.jar (com.android.tools:annotations:31.2.1) with InstrumentationAnalysisTransform
Transforming jna-platform-5.6.0.jar (net.java.dev.jna:jna-platform:5.6.0) with InstrumentationAnalysisTransform
Transforming juniversalchardet-1.0.3.jar (com.googlecode.juniversalchardet:juniversalchardet:1.0.3) with InstrumentationAnalysisTransform
Transforming javax.annotation-api-1.3.2.jar (javax.annotation:javax.annotation-api:1.3.2) with InstrumentationAnalysisTransform
Transforming stax-ex-1.8.1.jar (org.jvnet.staxex:stax-ex:1.8.1) with InstrumentationAnalysisTransform
Transforming jakarta.xml.bind-api-2.3.2.jar (jakarta.xml.bind:jakarta.xml.bind-api:2.3.2) with InstrumentationAnalysisTransform
Transforming txw2-2.3.2.jar (org.glassfish.jaxb:txw2:2.3.2) with InstrumentationAnalysisTransform
Transforming istack-commons-runtime-3.0.8.jar (com.sun.istack:istack-commons-runtime:3.0.8) with InstrumentationAnalysisTransform
Transforming FastInfoset-1.2.16.jar (com.sun.xml.fastinfoset:FastInfoset:1.2.16) with InstrumentationAnalysisTransform
Transforming jakarta.activation-api-1.2.1.jar (jakarta.activation:jakarta.activation-api:1.2.1) with InstrumentationAnalysisTransform
Transforming auto-value-annotations-1.6.2.jar (com.google.auto.value:auto-value-annotations:1.6.2) with InstrumentationAnalysisTransform
Transforming jose4j-0.7.0.jar (org.bitbucket.b_c:jose4j:0.7.0) with InstrumentationAnalysisTransform
Transforming slf4j-api-1.7.30.jar (org.slf4j:slf4j-api:1.7.30) with InstrumentationAnalysisTransform
Transforming jdom2-2.0.6.jar (org.jdom:jdom2:2.0.6) with InstrumentationAnalysisTransform
Transforming annotations-4.1.1.4.jar (com.google.android:annotations:4.1.1.4) with InstrumentationAnalysisTransform
Transforming animal-sniffer-annotations-1.19.jar (org.codehaus.mojo:animal-sniffer-annotations:1.19) with InstrumentationAnalysisTransform
Transforming perfmark-api-0.23.0.jar (io.perfmark:perfmark-api:0.23.0) with InstrumentationAnalysisTransform
Transforming netty-codec-http2-4.1.72.Final.jar (io.netty:netty-codec-http2:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-handler-proxy-4.1.72.Final.jar (io.netty:netty-handler-proxy:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming commons-codec-1.11.jar (commons-codec:commons-codec:1.11) with InstrumentationAnalysisTransform
Transforming apksig-8.2.1.jar (com.android.tools.build:apksig:8.2.1) with InstrumentationAnalysisTransform
Transforming javawriter-2.5.0.jar (com.squareup:javawriter:2.5.0) with InstrumentationAnalysisTransform
Transforming xml-apis-1.4.01.jar (xml-apis:xml-apis:1.4.01) with InstrumentationAnalysisTransform
Transforming commons-logging-1.2.jar (commons-logging:commons-logging:1.2) with InstrumentationAnalysisTransform
Transforming jna-5.6.0.jar (net.java.dev.jna:jna:5.6.0) with InstrumentationAnalysisTransform
Transforming grpc-context-1.45.1.jar (io.grpc:grpc-context:1.45.1) with InstrumentationAnalysisTransform
Transforming netty-codec-http-4.1.72.Final.jar (io.netty:netty-codec-http:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-handler-4.1.72.Final.jar (io.netty:netty-handler:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-codec-socks-4.1.72.Final.jar (io.netty:netty-codec-socks:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-codec-4.1.72.Final.jar (io.netty:netty-codec:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-transport-4.1.72.Final.jar (io.netty:netty-transport:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-buffer-4.1.72.Final.jar (io.netty:netty-buffer:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-resolver-4.1.72.Final.jar (io.netty:netty-resolver:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-common-4.1.72.Final.jar (io.netty:netty-common:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-tcnative-classes-2.0.46.Final.jar (io.netty:netty-tcnative-classes:2.0.46.Final) with InstrumentationAnalysisTransform

> Transform main (project :expo-updates-gradle-plugin) with InstrumentationAnalysisTransform
Transforming main (project :expo-updates-gradle-plugin) with InstrumentationAnalysisTransform

> Transform main (project :expo-updates-gradle-plugin) with InstrumentationAnalysisTransform
Transforming main (project :expo-updates-gradle-plugin) with InstrumentationAnalysisTransform

> Transform main (project :gradle-plugin:react-native-gradle-plugin) with InstrumentationAnalysisTransform
Transforming main (project :gradle-plugin:react-native-gradle-plugin) with InstrumentationAnalysisTransform

> Transform main (project :gradle-plugin:react-native-gradle-plugin) with InstrumentationAnalysisTransform
Transforming main (project :gradle-plugin:react-native-gradle-plugin) with InstrumentationAnalysisTransform

> Transform expo-updates-gradle-plugin.jar (project :expo-updates-gradle-plugin) with ProjectDependencyInstrumentingArtifactTransform
Transforming expo-updates-gradle-plugin.jar (project :expo-updates-gradle-plugin) with ProjectDependencyInstrumentingArtifactTransform

> Transform react-native-gradle-plugin.jar (project :gradle-plugin:react-native-gradle-plugin) with ProjectDependencyInstrumentingArtifactTransform
Transforming react-native-gradle-plugin.jar (project :gradle-plugin:react-native-gradle-plugin) with ProjectDependencyInstrumentingArtifactTransform

> Configure project :
Transforming gradle-8.2.1.jar (com.android.tools.build:gradle:8.2.1) with InstrumentationAnalysisTransform
Transforming gradle-8.2.1.jar (com.android.tools.build:gradle:8.2.1) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-model:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-model:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-api:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-api:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-1.9.22-gradle82.jar (org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-1.9.22-gradle82.jar (org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming databinding-compiler-common-8.2.1.jar (androidx.databinding:databinding-compiler-common:8.2.1) with InstrumentationAnalysisTransform
Transforming databinding-compiler-common-8.2.1.jar (androidx.databinding:databinding-compiler-common:8.2.1) with MergeInstrumentationAnalysisTransform
Transforming jetifier-processor-1.0.0-beta10.jar (com.android.tools.build.jetifier:jetifier-processor:1.0.0-beta10) with InstrumentationAnalysisTransform
Transforming jetifier-processor-1.0.0-beta10.jar (com.android.tools.build.jetifier:jetifier-processor:1.0.0-beta10) with MergeInstrumentationAnalysisTransform
Transforming jetifier-core-1.0.0-beta10.jar (com.android.tools.build.jetifier:jetifier-core:1.0.0-beta10) with InstrumentationAnalysisTransform
Transforming jetifier-core-1.0.0-beta10.jar (com.android.tools.build.jetifier:jetifier-core:1.0.0-beta10) with MergeInstrumentationAnalysisTransform
Transforming gradle-settings-api-8.2.1.jar (com.android.tools.build:gradle-settings-api:8.2.1) with InstrumentationAnalysisTransform
Transforming gradle-settings-api-8.2.1.jar (com.android.tools.build:gradle-settings-api:8.2.1) with MergeInstrumentationAnalysisTransform
Transforming lint-model-31.2.1.jar (com.android.tools.lint:lint-model:31.2.1) with InstrumentationAnalysisTransform
Transforming lint-model-31.2.1.jar (com.android.tools.lint:lint-model:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming builder-8.2.1.jar (com.android.tools.build:builder:8.2.1) with InstrumentationAnalysisTransform
Transforming builder-8.2.1.jar (com.android.tools.build:builder:8.2.1) with MergeInstrumentationAnalysisTransform
Transforming manifest-merger-31.2.1.jar (com.android.tools.build:manifest-merger:31.2.1) with InstrumentationAnalysisTransform
Transforming manifest-merger-31.2.1.jar (com.android.tools.build:manifest-merger:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming sdk-common-31.2.1.jar (com.android.tools:sdk-common:31.2.1) with InstrumentationAnalysisTransform
Transforming sdk-common-31.2.1.jar (com.android.tools:sdk-common:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming sdklib-31.2.1.jar (com.android.tools:sdklib:31.2.1) with InstrumentationAnalysisTransform
Transforming sdklib-31.2.1.jar (com.android.tools:sdklib:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming repository-31.2.1.jar (com.android.tools:repository:31.2.1) with InstrumentationAnalysisTransform
Transforming repository-31.2.1.jar (com.android.tools:repository:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming aaptcompiler-8.2.1.jar (com.android.tools.build:aaptcompiler:8.2.1) with InstrumentationAnalysisTransform
Transforming aaptcompiler-8.2.1.jar (com.android.tools.build:aaptcompiler:8.2.1) with MergeInstrumentationAnalysisTransform
Transforming tracker-31.2.1.jar (com.android.tools.analytics-library:tracker:31.2.1) with InstrumentationAnalysisTransform
Transforming tracker-31.2.1.jar (com.android.tools.analytics-library:tracker:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming shared-31.2.1.jar (com.android.tools.analytics-library:shared:31.2.1) with InstrumentationAnalysisTransform
Transforming shared-31.2.1.jar (com.android.tools.analytics-library:shared:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming android-test-plugin-host-emulator-control-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-emulator-control-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming android-test-plugin-host-emulator-control-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-emulator-control-proto:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming android-test-plugin-host-retention-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-retention-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming android-test-plugin-host-retention-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-retention-proto:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming builder-model-8.2.1.jar (com.android.tools.build:builder-model:8.2.1) with InstrumentationAnalysisTransform
Transforming builder-model-8.2.1.jar (com.android.tools.build:builder-model:8.2.1) with MergeInstrumentationAnalysisTransform
Transforming gradle-api-8.2.1.jar (com.android.tools.build:gradle-api:8.2.1) with InstrumentationAnalysisTransform
Transforming gradle-api-8.2.1.jar (com.android.tools.build:gradle-api:8.2.1) with MergeInstrumentationAnalysisTransform
Transforming builder-test-api-8.2.1.jar (com.android.tools.build:builder-test-api:8.2.1) with InstrumentationAnalysisTransform
Transforming builder-test-api-8.2.1.jar (com.android.tools.build:builder-test-api:8.2.1) with MergeInstrumentationAnalysisTransform
Transforming ddmlib-31.2.1.jar (com.android.tools.ddms:ddmlib:31.2.1) with InstrumentationAnalysisTransform
Transforming ddmlib-31.2.1.jar (com.android.tools.ddms:ddmlib:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming layoutlib-api-31.2.1.jar (com.android.tools.layoutlib:layoutlib-api:31.2.1) with InstrumentationAnalysisTransform
Transforming layoutlib-api-31.2.1.jar (com.android.tools.layoutlib:layoutlib-api:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming dvlib-31.2.1.jar (com.android.tools:dvlib:31.2.1) with InstrumentationAnalysisTransform
Transforming dvlib-31.2.1.jar (com.android.tools:dvlib:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming common-31.2.1.jar (com.android.tools:common:31.2.1) with InstrumentationAnalysisTransform
Transforming common-31.2.1.jar (com.android.tools:common:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming kotlin-stdlib-jdk8-1.9.0.jar (org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.9.0) with InstrumentationAnalysisTransform
Transforming kotlin-stdlib-jdk8-1.9.0.jar (org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.9.0) with MergeInstrumentationAnalysisTransform
Transforming kotlin-reflect-1.9.0.jar (org.jetbrains.kotlin:kotlin-reflect:1.9.0) with InstrumentationAnalysisTransform
Transforming kotlin-reflect-1.9.0.jar (org.jetbrains.kotlin:kotlin-reflect:1.9.0) with MergeInstrumentationAnalysisTransform
Transforming kotlin-stdlib-jdk7-1.9.0.jar (org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.9.0) with InstrumentationAnalysisTransform
Transforming kotlin-stdlib-jdk7-1.9.0.jar (org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.9.0) with MergeInstrumentationAnalysisTransform
Transforming kotlin-stdlib-1.9.23.jar (org.jetbrains.kotlin:kotlin-stdlib:1.9.23) with InstrumentationAnalysisTransform
Transforming kotlin-stdlib-1.9.23.jar (org.jetbrains.kotlin:kotlin-stdlib:1.9.23) with MergeInstrumentationAnalysisTransform
Transforming android-test-plugin-result-listener-gradle-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-result-listener-gradle-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming android-test-plugin-result-listener-gradle-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-result-listener-gradle-proto:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming bundletool-1.15.2.jar (com.android.tools.build:bundletool:1.15.2) with InstrumentationAnalysisTransform
Transforming bundletool-1.15.2.jar (com.android.tools.build:bundletool:1.15.2) with MergeInstrumentationAnalysisTransform
Transforming protobuf-java-util-3.19.3.jar (com.google.protobuf:protobuf-java-util:3.19.3) with InstrumentationAnalysisTransform
Transforming protobuf-java-util-3.19.3.jar (com.google.protobuf:protobuf-java-util:3.19.3) with MergeInstrumentationAnalysisTransform
Transforming grpc-netty-1.45.1.jar (io.grpc:grpc-netty:1.45.1) with InstrumentationAnalysisTransform
Transforming grpc-netty-1.45.1.jar (io.grpc:grpc-netty:1.45.1) with MergeInstrumentationAnalysisTransform
Transforming grpc-core-1.45.1.jar (io.grpc:grpc-core:1.45.1) with InstrumentationAnalysisTransform
Transforming grpc-core-1.45.1.jar (io.grpc:grpc-core:1.45.1) with MergeInstrumentationAnalysisTransform
Transforming tink-1.7.0.jar (com.google.crypto.tink:tink:1.7.0) with InstrumentationAnalysisTransform
Transforming tink-1.7.0.jar (com.google.crypto.tink:tink:1.7.0) with MergeInstrumentationAnalysisTransform
Transforming gson-2.10.jar (com.google.code.gson:gson:2.10) with InstrumentationAnalysisTransform
Transforming gson-2.10.jar (com.google.code.gson:gson:2.10) with MergeInstrumentationAnalysisTransform
Transforming crash-31.2.1.jar (com.android.tools.analytics-library:crash:31.2.1) with InstrumentationAnalysisTransform
Transforming crash-31.2.1.jar (com.android.tools.analytics-library:crash:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming lint-typedef-remover-31.2.1.jar (com.android.tools.lint:lint-typedef-remover:31.2.1) with InstrumentationAnalysisTransform
Transforming lint-typedef-remover-31.2.1.jar (com.android.tools.lint:lint-typedef-remover:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming grpc-protobuf-1.45.1.jar (io.grpc:grpc-protobuf:1.45.1) with InstrumentationAnalysisTransform
Transforming grpc-protobuf-1.45.1.jar (io.grpc:grpc-protobuf:1.45.1) with MergeInstrumentationAnalysisTransform
Transforming grpc-stub-1.45.1.jar (io.grpc:grpc-stub:1.45.1) with InstrumentationAnalysisTransform
Transforming grpc-stub-1.45.1.jar (io.grpc:grpc-stub:1.45.1) with MergeInstrumentationAnalysisTransform
Transforming jimfs-1.1.jar (com.google.jimfs:jimfs:1.1) with InstrumentationAnalysisTransform
Transforming jimfs-1.1.jar (com.google.jimfs:jimfs:1.1) with MergeInstrumentationAnalysisTransform
Transforming grpc-protobuf-lite-1.45.1.jar (io.grpc:grpc-protobuf-lite:1.45.1) with InstrumentationAnalysisTransform
Transforming grpc-protobuf-lite-1.45.1.jar (io.grpc:grpc-protobuf-lite:1.45.1) with MergeInstrumentationAnalysisTransform
Transforming grpc-api-1.45.1.jar (io.grpc:grpc-api:1.45.1) with InstrumentationAnalysisTransform
Transforming grpc-api-1.45.1.jar (io.grpc:grpc-api:1.45.1) with MergeInstrumentationAnalysisTransform
Transforming apkzlib-8.2.1.jar (com.android.tools.build:apkzlib:8.2.1) with InstrumentationAnalysisTransform
Transforming apkzlib-8.2.1.jar (com.android.tools.build:apkzlib:8.2.1) with MergeInstrumentationAnalysisTransform
Transforming guava-31.1-jre.jar (com.google.guava:guava:31.1-jre) with InstrumentationAnalysisTransform
Transforming guava-31.1-jre.jar (com.google.guava:guava:31.1-jre) with MergeInstrumentationAnalysisTransform
Transforming javapoet-1.13.0.jar (com.squareup:javapoet:1.13.0) with InstrumentationAnalysisTransform
Transforming javapoet-1.13.0.jar (com.squareup:javapoet:1.13.0) with MergeInstrumentationAnalysisTransform
Transforming annotations-13.0.jar (org.jetbrains:annotations:13.0) with InstrumentationAnalysisTransform
Transforming annotations-13.0.jar (org.jetbrains:annotations:13.0) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-proto-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea-proto:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-proto-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea-proto:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-idea-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-klib-commonizer-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-klib-commonizer-api:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-klib-commonizer-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-klib-commonizer-api:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-native-utils-1.9.22.jar (org.jetbrains.kotlin:kotlin-native-utils:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-native-utils-1.9.22.jar (org.jetbrains.kotlin:kotlin-native-utils:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-util-klib-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-klib:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-util-klib-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-klib:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-build-tools-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-build-tools-api:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-build-tools-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-build-tools-api:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-android-extensions-1.9.22.jar (org.jetbrains.kotlin:kotlin-android-extensions:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-android-extensions-1.9.22.jar (org.jetbrains.kotlin:kotlin-android-extensions:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-compiler-runner-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-runner:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-compiler-runner-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-runner:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-embeddable:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-embeddable:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-impl-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-impl-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-compiler-impl-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-impl-embeddable:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming aapt2-proto-8.2.1-10154469.jar (com.android.tools.build:aapt2-proto:8.2.1-10154469) with InstrumentationAnalysisTransform
Transforming aapt2-proto-8.2.1-10154469.jar (com.android.tools.build:aapt2-proto:8.2.1-10154469) with MergeInstrumentationAnalysisTransform
Transforming databinding-common-8.2.1.jar (androidx.databinding:databinding-common:8.2.1) with InstrumentationAnalysisTransform
Transforming databinding-common-8.2.1.jar (androidx.databinding:databinding-common:8.2.1) with MergeInstrumentationAnalysisTransform
Transforming baseLibrary-8.2.1.jar (com.android.databinding:baseLibrary:8.2.1) with InstrumentationAnalysisTransform
Transforming baseLibrary-8.2.1.jar (com.android.databinding:baseLibrary:8.2.1) with MergeInstrumentationAnalysisTransform
Transforming android-device-provider-ddmlib-proto-31.2.1.jar (com.android.tools.utp:android-device-provider-ddmlib-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming android-device-provider-ddmlib-proto-31.2.1.jar (com.android.tools.utp:android-device-provider-ddmlib-proto:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming android-device-provider-gradle-proto-31.2.1.jar (com.android.tools.utp:android-device-provider-gradle-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming android-device-provider-gradle-proto-31.2.1.jar (com.android.tools.utp:android-device-provider-gradle-proto:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming android-test-plugin-host-additional-test-output-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-additional-test-output-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming android-test-plugin-host-additional-test-output-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-additional-test-output-proto:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming android-test-plugin-host-coverage-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-coverage-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming android-test-plugin-host-coverage-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-coverage-proto:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming android-test-plugin-host-logcat-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-logcat-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming android-test-plugin-host-logcat-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-logcat-proto:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming android-test-plugin-host-apk-installer-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-apk-installer-proto:31.2.1) with InstrumentationAnalysisTransform
Transforming android-test-plugin-host-apk-installer-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-apk-installer-proto:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming transform-api-2.0.0-deprecated-use-gradle-api.jar (com.android.tools.build:transform-api:2.0.0-deprecated-use-gradle-api) with InstrumentationAnalysisTransform
Transforming gradle-8.2.1.jar (com.android.tools.build:gradle:8.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming transform-api-2.0.0-deprecated-use-gradle-api.jar (com.android.tools.build:transform-api:2.0.0-deprecated-use-gradle-api) with MergeInstrumentationAnalysisTransform
Transforming httpmime-4.5.6.jar (org.apache.httpcomponents:httpmime:4.5.6) with InstrumentationAnalysisTransform
Transforming httpmime-4.5.6.jar (org.apache.httpcomponents:httpmime:4.5.6) with MergeInstrumentationAnalysisTransform
Transforming commons-io-2.4.jar (commons-io:commons-io:2.4) with InstrumentationAnalysisTransform
Transforming commons-io-2.4.jar (commons-io:commons-io:2.4) with MergeInstrumentationAnalysisTransform
Transforming asm-commons-9.2.jar (org.ow2.asm:asm-commons:9.2) with InstrumentationAnalysisTransform
Transforming asm-commons-9.2.jar (org.ow2.asm:asm-commons:9.2) with MergeInstrumentationAnalysisTransform
Transforming asm-util-9.2.jar (org.ow2.asm:asm-util:9.2) with InstrumentationAnalysisTransform
Transforming asm-util-9.2.jar (org.ow2.asm:asm-util:9.2) with MergeInstrumentationAnalysisTransform
Transforming asm-analysis-9.2.jar (org.ow2.asm:asm-analysis:9.2) with InstrumentationAnalysisTransform
Transforming asm-analysis-9.2.jar (org.ow2.asm:asm-analysis:9.2) with MergeInstrumentationAnalysisTransform
Transforming asm-tree-9.2.jar (org.ow2.asm:asm-tree:9.2) with InstrumentationAnalysisTransform
Transforming asm-tree-9.2.jar (org.ow2.asm:asm-tree:9.2) with MergeInstrumentationAnalysisTransform
Transforming asm-9.2.jar (org.ow2.asm:asm:9.2) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-model:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming asm-9.2.jar (org.ow2.asm:asm:9.2) with MergeInstrumentationAnalysisTransform
Transforming bcpkix-jdk15on-1.67.jar (org.bouncycastle:bcpkix-jdk15on:1.67) with InstrumentationAnalysisTransform
Transforming bcpkix-jdk15on-1.67.jar (org.bouncycastle:bcpkix-jdk15on:1.67) with MergeInstrumentationAnalysisTransform
Transforming jaxb-runtime-2.3.2.jar (org.glassfish.jaxb:jaxb-runtime:2.3.2) with InstrumentationAnalysisTransform
Transforming jaxb-runtime-2.3.2.jar (org.glassfish.jaxb:jaxb-runtime:2.3.2) with MergeInstrumentationAnalysisTransform
Transforming jopt-simple-4.9.jar (net.sf.jopt-simple:jopt-simple:4.9) with InstrumentationAnalysisTransform
Transforming jopt-simple-4.9.jar (net.sf.jopt-simple:jopt-simple:4.9) with MergeInstrumentationAnalysisTransform
Transforming protos-31.2.1.jar (com.android.tools.analytics-library:protos:31.2.1) with InstrumentationAnalysisTransform
Transforming protos-31.2.1.jar (com.android.tools.analytics-library:protos:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming proto-google-common-protos-2.0.1.jar (com.google.api.grpc:proto-google-common-protos:2.0.1) with InstrumentationAnalysisTransform
Transforming proto-google-common-protos-2.0.1.jar (com.google.api.grpc:proto-google-common-protos:2.0.1) with MergeInstrumentationAnalysisTransform
Transforming protobuf-java-3.19.3.jar (com.google.protobuf:protobuf-java:3.19.3) with InstrumentationAnalysisTransform
Transforming protobuf-java-3.19.3.jar (com.google.protobuf:protobuf-java:3.19.3) with MergeInstrumentationAnalysisTransform
Transforming core-proto-0.0.8-alpha08.jar (com.google.testing.platform:core-proto:0.0.8-alpha08) with InstrumentationAnalysisTransform
Transforming core-proto-0.0.8-alpha08.jar (com.google.testing.platform:core-proto:0.0.8-alpha08) with MergeInstrumentationAnalysisTransform
Transforming tensorflow-lite-metadata-0.1.0-rc2.jar (org.tensorflow:tensorflow-lite-metadata:0.1.0-rc2) with InstrumentationAnalysisTransform
Transforming tensorflow-lite-metadata-0.1.0-rc2.jar (org.tensorflow:tensorflow-lite-metadata:0.1.0-rc2) with MergeInstrumentationAnalysisTransform
Transforming flatbuffers-java-1.12.0.jar (com.google.flatbuffers:flatbuffers-java:1.12.0) with InstrumentationAnalysisTransform
Transforming flatbuffers-java-1.12.0.jar (com.google.flatbuffers:flatbuffers-java:1.12.0) with MergeInstrumentationAnalysisTransform
Transforming failureaccess-1.0.1.jar (com.google.guava:failureaccess:1.0.1) with InstrumentationAnalysisTransform
Transforming failureaccess-1.0.1.jar (com.google.guava:failureaccess:1.0.1) with MergeInstrumentationAnalysisTransform
Transforming listenablefuture-9999.0-empty-to-avoid-conflict-with-guava.jar (com.google.guava:listenablefuture:9999.0-empty-to-avoid-conflict-with-guava) with InstrumentationAnalysisTransform
Transforming listenablefuture-9999.0-empty-to-avoid-conflict-with-guava.jar (com.google.guava:listenablefuture:9999.0-empty-to-avoid-conflict-with-guava) with MergeInstrumentationAnalysisTransform
Transforming jsr305-3.0.2.jar (com.google.code.findbugs:jsr305:3.0.2) with InstrumentationAnalysisTransform
Transforming jsr305-3.0.2.jar (com.google.code.findbugs:jsr305:3.0.2) with MergeInstrumentationAnalysisTransform
Transforming checker-qual-3.12.0.jar (org.checkerframework:checker-qual:3.12.0) with InstrumentationAnalysisTransform
Transforming checker-qual-3.12.0.jar (org.checkerframework:checker-qual:3.12.0) with MergeInstrumentationAnalysisTransform
Transforming error_prone_annotations-2.11.0.jar (com.google.errorprone:error_prone_annotations:2.11.0) with InstrumentationAnalysisTransform
Transforming error_prone_annotations-2.11.0.jar (com.google.errorprone:error_prone_annotations:2.11.0) with MergeInstrumentationAnalysisTransform
Transforming j2objc-annotations-1.3.jar (com.google.j2objc:j2objc-annotations:1.3) with InstrumentationAnalysisTransform
Transforming j2objc-annotations-1.3.jar (com.google.j2objc:j2objc-annotations:1.3) with MergeInstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-annotations-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-annotations:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-annotations-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-annotations:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-project-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-project-model:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-gradle-plugin-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-api:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-project-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-project-model:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-tooling-core-1.9.22.jar (org.jetbrains.kotlin:kotlin-tooling-core:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-tooling-core-1.9.22.jar (org.jetbrains.kotlin:kotlin-tooling-core:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-util-io-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-io:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-util-io-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-io:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-daemon-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-embeddable:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-daemon-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-embeddable:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming trove4j-1.0.20200330.jar (org.jetbrains.intellij.deps:trove4j:1.0.20200330) with InstrumentationAnalysisTransform
Transforming trove4j-1.0.20200330.jar (org.jetbrains.intellij.deps:trove4j:1.0.20200330) with MergeInstrumentationAnalysisTransform
Transforming kotlin-daemon-client-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-client:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-daemon-client-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-client:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlinx-coroutines-core-jvm-1.5.0.jar (org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.5.0) with InstrumentationAnalysisTransform
Transforming kotlinx-coroutines-core-jvm-1.5.0.jar (org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.5.0) with MergeInstrumentationAnalysisTransform
Transforming kotlin-scripting-jvm-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-jvm:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-jvm-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-jvm:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming kotlin-scripting-common-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-common:1.9.22) with InstrumentationAnalysisTransform
Transforming kotlin-scripting-common-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-common:1.9.22) with MergeInstrumentationAnalysisTransform
Transforming dagger-2.28.3.jar (com.google.dagger:dagger:2.28.3) with InstrumentationAnalysisTransform
Transforming dagger-2.28.3.jar (com.google.dagger:dagger:2.28.3) with MergeInstrumentationAnalysisTransform
Transforming javax.inject-1.jar (javax.inject:javax.inject:1) with InstrumentationAnalysisTransform
Transforming javax.inject-1.jar (javax.inject:javax.inject:1) with MergeInstrumentationAnalysisTransform
Transforming kxml2-2.3.0.jar (net.sf.kxml:kxml2:2.3.0) with InstrumentationAnalysisTransform
Transforming kxml2-2.3.0.jar (net.sf.kxml:kxml2:2.3.0) with MergeInstrumentationAnalysisTransform
Transforming bcprov-jdk15on-1.67.jar (org.bouncycastle:bcprov-jdk15on:1.67) with InstrumentationAnalysisTransform
Transforming bcprov-jdk15on-1.67.jar (org.bouncycastle:bcprov-jdk15on:1.67) with MergeInstrumentationAnalysisTransform
Transforming xercesImpl-2.12.0.jar (xerces:xercesImpl:2.12.0) with InstrumentationAnalysisTransform
Transforming xercesImpl-2.12.0.jar (xerces:xercesImpl:2.12.0) with MergeInstrumentationAnalysisTransform
Transforming commons-compress-1.21.jar (org.apache.commons:commons-compress:1.21) with InstrumentationAnalysisTransform
Transforming commons-compress-1.21.jar (org.apache.commons:commons-compress:1.21) with MergeInstrumentationAnalysisTransform
Transforming httpclient-4.5.14.jar (org.apache.httpcomponents:httpclient:4.5.14) with InstrumentationAnalysisTransform
Transforming httpclient-4.5.14.jar (org.apache.httpcomponents:httpclient:4.5.14) with MergeInstrumentationAnalysisTransform
Transforming httpcore-4.4.16.jar (org.apache.httpcomponents:httpcore:4.4.16) with InstrumentationAnalysisTransform
Transforming httpcore-4.4.16.jar (org.apache.httpcomponents:httpcore:4.4.16) with MergeInstrumentationAnalysisTransform
Transforming javax.activation-1.2.0.jar (com.sun.activation:javax.activation:1.2.0) with InstrumentationAnalysisTransform
Transforming javax.activation-1.2.0.jar (com.sun.activation:javax.activation:1.2.0) with MergeInstrumentationAnalysisTransform
Transforming signflinger-8.2.1.jar (com.android:signflinger:8.2.1) with InstrumentationAnalysisTransform
Transforming signflinger-8.2.1.jar (com.android:signflinger:8.2.1) with MergeInstrumentationAnalysisTransform
Transforming zipflinger-8.2.1.jar (com.android:zipflinger:8.2.1) with InstrumentationAnalysisTransform
Transforming zipflinger-8.2.1.jar (com.android:zipflinger:8.2.1) with MergeInstrumentationAnalysisTransform
Transforming annotations-31.2.1.jar (com.android.tools:annotations:31.2.1) with InstrumentationAnalysisTransform
Transforming annotations-31.2.1.jar (com.android.tools:annotations:31.2.1) with MergeInstrumentationAnalysisTransform
Transforming jna-platform-5.6.0.jar (net.java.dev.jna:jna-platform:5.6.0) with InstrumentationAnalysisTransform
Transforming jna-platform-5.6.0.jar (net.java.dev.jna:jna-platform:5.6.0) with MergeInstrumentationAnalysisTransform
Transforming juniversalchardet-1.0.3.jar (com.googlecode.juniversalchardet:juniversalchardet:1.0.3) with InstrumentationAnalysisTransform
Transforming juniversalchardet-1.0.3.jar (com.googlecode.juniversalchardet:juniversalchardet:1.0.3) with MergeInstrumentationAnalysisTransform
Transforming javax.annotation-api-1.3.2.jar (javax.annotation:javax.annotation-api:1.3.2) with InstrumentationAnalysisTransform
Transforming javax.annotation-api-1.3.2.jar (javax.annotation:javax.annotation-api:1.3.2) with MergeInstrumentationAnalysisTransform
Transforming stax-ex-1.8.1.jar (org.jvnet.staxex:stax-ex:1.8.1) with InstrumentationAnalysisTransform
Transforming stax-ex-1.8.1.jar (org.jvnet.staxex:stax-ex:1.8.1) with MergeInstrumentationAnalysisTransform
Transforming jakarta.xml.bind-api-2.3.2.jar (jakarta.xml.bind:jakarta.xml.bind-api:2.3.2) with InstrumentationAnalysisTransform
Transforming jakarta.xml.bind-api-2.3.2.jar (jakarta.xml.bind:jakarta.xml.bind-api:2.3.2) with MergeInstrumentationAnalysisTransform
Transforming txw2-2.3.2.jar (org.glassfish.jaxb:txw2:2.3.2) with InstrumentationAnalysisTransform
Transforming txw2-2.3.2.jar (org.glassfish.jaxb:txw2:2.3.2) with MergeInstrumentationAnalysisTransform
Transforming istack-commons-runtime-3.0.8.jar (com.sun.istack:istack-commons-runtime:3.0.8) with InstrumentationAnalysisTransform
Transforming istack-commons-runtime-3.0.8.jar (com.sun.istack:istack-commons-runtime:3.0.8) with MergeInstrumentationAnalysisTransform
Transforming FastInfoset-1.2.16.jar (com.sun.xml.fastinfoset:FastInfoset:1.2.16) with InstrumentationAnalysisTransform
Transforming FastInfoset-1.2.16.jar (com.sun.xml.fastinfoset:FastInfoset:1.2.16) with MergeInstrumentationAnalysisTransform
Transforming jakarta.activation-api-1.2.1.jar (jakarta.activation:jakarta.activation-api:1.2.1) with InstrumentationAnalysisTransform
Transforming jakarta.activation-api-1.2.1.jar (jakarta.activation:jakarta.activation-api:1.2.1) with MergeInstrumentationAnalysisTransform
Transforming auto-value-annotations-1.6.2.jar (com.google.auto.value:auto-value-annotations:1.6.2) with InstrumentationAnalysisTransform
Transforming auto-value-annotations-1.6.2.jar (com.google.auto.value:auto-value-annotations:1.6.2) with MergeInstrumentationAnalysisTransform
Transforming jose4j-0.7.0.jar (org.bitbucket.b_c:jose4j:0.7.0) with InstrumentationAnalysisTransform
Transforming jose4j-0.7.0.jar (org.bitbucket.b_c:jose4j:0.7.0) with MergeInstrumentationAnalysisTransform
Transforming slf4j-api-1.7.30.jar (org.slf4j:slf4j-api:1.7.30) with InstrumentationAnalysisTransform
Transforming slf4j-api-1.7.30.jar (org.slf4j:slf4j-api:1.7.30) with MergeInstrumentationAnalysisTransform
Transforming jdom2-2.0.6.jar (org.jdom:jdom2:2.0.6) with InstrumentationAnalysisTransform
Transforming jdom2-2.0.6.jar (org.jdom:jdom2:2.0.6) with MergeInstrumentationAnalysisTransform
Transforming annotations-4.1.1.4.jar (com.google.android:annotations:4.1.1.4) with InstrumentationAnalysisTransform
Transforming annotations-4.1.1.4.jar (com.google.android:annotations:4.1.1.4) with MergeInstrumentationAnalysisTransform
Transforming animal-sniffer-annotations-1.19.jar (org.codehaus.mojo:animal-sniffer-annotations:1.19) with InstrumentationAnalysisTransform
Transforming animal-sniffer-annotations-1.19.jar (org.codehaus.mojo:animal-sniffer-annotations:1.19) with MergeInstrumentationAnalysisTransform
Transforming perfmark-api-0.23.0.jar (io.perfmark:perfmark-api:0.23.0) with InstrumentationAnalysisTransform
Transforming perfmark-api-0.23.0.jar (io.perfmark:perfmark-api:0.23.0) with MergeInstrumentationAnalysisTransform
Transforming netty-codec-http2-4.1.72.Final.jar (io.netty:netty-codec-http2:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-codec-http2-4.1.72.Final.jar (io.netty:netty-codec-http2:4.1.72.Final) with MergeInstrumentationAnalysisTransform
Transforming netty-handler-proxy-4.1.72.Final.jar (io.netty:netty-handler-proxy:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-handler-proxy-4.1.72.Final.jar (io.netty:netty-handler-proxy:4.1.72.Final) with MergeInstrumentationAnalysisTransform
Transforming commons-codec-1.11.jar (commons-codec:commons-codec:1.11) with InstrumentationAnalysisTransform
Transforming commons-codec-1.11.jar (commons-codec:commons-codec:1.11) with MergeInstrumentationAnalysisTransform
Transforming apksig-8.2.1.jar (com.android.tools.build:apksig:8.2.1) with InstrumentationAnalysisTransform
Transforming apksig-8.2.1.jar (com.android.tools.build:apksig:8.2.1) with MergeInstrumentationAnalysisTransform
Transforming javawriter-2.5.0.jar (com.squareup:javawriter:2.5.0) with InstrumentationAnalysisTransform
Transforming javawriter-2.5.0.jar (com.squareup:javawriter:2.5.0) with MergeInstrumentationAnalysisTransform
Transforming xml-apis-1.4.01.jar (xml-apis:xml-apis:1.4.01) with InstrumentationAnalysisTransform
Transforming xml-apis-1.4.01.jar (xml-apis:xml-apis:1.4.01) with MergeInstrumentationAnalysisTransform
Transforming commons-logging-1.2.jar (commons-logging:commons-logging:1.2) with InstrumentationAnalysisTransform
Transforming commons-logging-1.2.jar (commons-logging:commons-logging:1.2) with MergeInstrumentationAnalysisTransform
Transforming jna-5.6.0.jar (net.java.dev.jna:jna:5.6.0) with InstrumentationAnalysisTransform
Transforming jna-5.6.0.jar (net.java.dev.jna:jna:5.6.0) with MergeInstrumentationAnalysisTransform
Transforming grpc-context-1.45.1.jar (io.grpc:grpc-context:1.45.1) with InstrumentationAnalysisTransform
Transforming grpc-context-1.45.1.jar (io.grpc:grpc-context:1.45.1) with MergeInstrumentationAnalysisTransform
Transforming netty-codec-http-4.1.72.Final.jar (io.netty:netty-codec-http:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-codec-http-4.1.72.Final.jar (io.netty:netty-codec-http:4.1.72.Final) with MergeInstrumentationAnalysisTransform
Transforming netty-handler-4.1.72.Final.jar (io.netty:netty-handler:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-handler-4.1.72.Final.jar (io.netty:netty-handler:4.1.72.Final) with MergeInstrumentationAnalysisTransform
Transforming netty-codec-socks-4.1.72.Final.jar (io.netty:netty-codec-socks:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-codec-socks-4.1.72.Final.jar (io.netty:netty-codec-socks:4.1.72.Final) with MergeInstrumentationAnalysisTransform
Transforming netty-codec-4.1.72.Final.jar (io.netty:netty-codec:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-codec-4.1.72.Final.jar (io.netty:netty-codec:4.1.72.Final) with MergeInstrumentationAnalysisTransform
Transforming netty-transport-4.1.72.Final.jar (io.netty:netty-transport:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-transport-4.1.72.Final.jar (io.netty:netty-transport:4.1.72.Final) with MergeInstrumentationAnalysisTransform
Transforming netty-buffer-4.1.72.Final.jar (io.netty:netty-buffer:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-buffer-4.1.72.Final.jar (io.netty:netty-buffer:4.1.72.Final) with MergeInstrumentationAnalysisTransform
Transforming netty-resolver-4.1.72.Final.jar (io.netty:netty-resolver:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-resolver-4.1.72.Final.jar (io.netty:netty-resolver:4.1.72.Final) with MergeInstrumentationAnalysisTransform
Transforming netty-common-4.1.72.Final.jar (io.netty:netty-common:4.1.72.Final) with InstrumentationAnalysisTransform
Transforming netty-common-4.1.72.Final.jar (io.netty:netty-common:4.1.72.Final) with MergeInstrumentationAnalysisTransform
Transforming netty-tcnative-classes-2.0.46.Final.jar (io.netty:netty-tcnative-classes:2.0.46.Final) with InstrumentationAnalysisTransform
Transforming netty-tcnative-classes-2.0.46.Final.jar (io.netty:netty-tcnative-classes:2.0.46.Final) with MergeInstrumentationAnalysisTransform
Transforming databinding-compiler-common-8.2.1.jar (androidx.databinding:databinding-compiler-common:8.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming jetifier-processor-1.0.0-beta10.jar (com.android.tools.build.jetifier:jetifier-processor:1.0.0-beta10) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-gradle-plugin-1.9.22-gradle82.jar (org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming gradle-settings-api-8.2.1.jar (com.android.tools.build:gradle-settings-api:8.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming jetifier-core-1.0.0-beta10.jar (com.android.tools.build.jetifier:jetifier-core:1.0.0-beta10) with ExternalDependencyInstrumentingArtifactTransform
Transforming lint-model-31.2.1.jar (com.android.tools.lint:lint-model:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming builder-8.2.1.jar (com.android.tools.build:builder:8.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming manifest-merger-31.2.1.jar (com.android.tools.build:manifest-merger:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming sdk-common-31.2.1.jar (com.android.tools:sdk-common:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming sdklib-31.2.1.jar (com.android.tools:sdklib:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming repository-31.2.1.jar (com.android.tools:repository:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming aaptcompiler-8.2.1.jar (com.android.tools.build:aaptcompiler:8.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming tracker-31.2.1.jar (com.android.tools.analytics-library:tracker:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming shared-31.2.1.jar (com.android.tools.analytics-library:shared:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming android-test-plugin-host-emulator-control-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-emulator-control-proto:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming android-test-plugin-host-retention-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-retention-proto:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming builder-model-8.2.1.jar (com.android.tools.build:builder-model:8.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming gradle-api-8.2.1.jar (com.android.tools.build:gradle-api:8.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming builder-test-api-8.2.1.jar (com.android.tools.build:builder-test-api:8.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming ddmlib-31.2.1.jar (com.android.tools.ddms:ddmlib:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming layoutlib-api-31.2.1.jar (com.android.tools.layoutlib:layoutlib-api:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming dvlib-31.2.1.jar (com.android.tools:dvlib:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-stdlib-jdk8-1.9.0.jar (org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.9.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming common-31.2.1.jar (com.android.tools:common:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-reflect-1.9.0.jar (org.jetbrains.kotlin:kotlin-reflect:1.9.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-stdlib-1.9.23.jar (org.jetbrains.kotlin:kotlin-stdlib:1.9.23) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-stdlib-jdk7-1.9.0.jar (org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.9.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming android-test-plugin-result-listener-gradle-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-result-listener-gradle-proto:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming bundletool-1.15.2.jar (com.android.tools.build:bundletool:1.15.2) with ExternalDependencyInstrumentingArtifactTransform
Transforming grpc-netty-1.45.1.jar (io.grpc:grpc-netty:1.45.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming grpc-core-1.45.1.jar (io.grpc:grpc-core:1.45.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming tink-1.7.0.jar (com.google.crypto.tink:tink:1.7.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming gson-2.10.jar (com.google.code.gson:gson:2.10) with ExternalDependencyInstrumentingArtifactTransform
Transforming crash-31.2.1.jar (com.android.tools.analytics-library:crash:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming lint-typedef-remover-31.2.1.jar (com.android.tools.lint:lint-typedef-remover:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming grpc-protobuf-1.45.1.jar (io.grpc:grpc-protobuf:1.45.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming protobuf-java-util-3.19.3.jar (com.google.protobuf:protobuf-java-util:3.19.3) with ExternalDependencyInstrumentingArtifactTransform
Transforming grpc-stub-1.45.1.jar (io.grpc:grpc-stub:1.45.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming jimfs-1.1.jar (com.google.jimfs:jimfs:1.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming grpc-protobuf-lite-1.45.1.jar (io.grpc:grpc-protobuf-lite:1.45.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming grpc-api-1.45.1.jar (io.grpc:grpc-api:1.45.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming apkzlib-8.2.1.jar (com.android.tools.build:apkzlib:8.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming javapoet-1.13.0.jar (com.squareup:javapoet:1.13.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming guava-31.1-jre.jar (com.google.guava:guava:31.1-jre) with ExternalDependencyInstrumentingArtifactTransform
Transforming annotations-13.0.jar (org.jetbrains:annotations:13.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-gradle-plugin-idea-proto-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea-proto:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-klib-commonizer-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-klib-commonizer-api:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-gradle-plugin-idea-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-idea:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-native-utils-1.9.22.jar (org.jetbrains.kotlin:kotlin-native-utils:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-util-klib-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-klib:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-build-tools-api-1.9.22.jar (org.jetbrains.kotlin:kotlin-build-tools-api:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-android-extensions-1.9.22.jar (org.jetbrains.kotlin:kotlin-android-extensions:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-compiler-runner-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-runner:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-compiler-embeddable:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-scripting-compiler-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-embeddable:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-scripting-compiler-impl-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-compiler-impl-embeddable:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming databinding-common-8.2.1.jar (androidx.databinding:databinding-common:8.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming baseLibrary-8.2.1.jar (com.android.databinding:baseLibrary:8.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming aapt2-proto-8.2.1-10154469.jar (com.android.tools.build:aapt2-proto:8.2.1-10154469) with ExternalDependencyInstrumentingArtifactTransform
Transforming android-device-provider-ddmlib-proto-31.2.1.jar (com.android.tools.utp:android-device-provider-ddmlib-proto:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming android-device-provider-gradle-proto-31.2.1.jar (com.android.tools.utp:android-device-provider-gradle-proto:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming android-test-plugin-host-additional-test-output-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-additional-test-output-proto:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming android-test-plugin-host-coverage-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-coverage-proto:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming android-test-plugin-host-logcat-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-logcat-proto:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming android-test-plugin-host-apk-installer-proto-31.2.1.jar (com.android.tools.utp:android-test-plugin-host-apk-installer-proto:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming transform-api-2.0.0-deprecated-use-gradle-api.jar (com.android.tools.build:transform-api:2.0.0-deprecated-use-gradle-api) with ExternalDependencyInstrumentingArtifactTransform
Transforming httpmime-4.5.6.jar (org.apache.httpcomponents:httpmime:4.5.6) with ExternalDependencyInstrumentingArtifactTransform
Transforming commons-io-2.4.jar (commons-io:commons-io:2.4) with ExternalDependencyInstrumentingArtifactTransform
Transforming asm-util-9.2.jar (org.ow2.asm:asm-util:9.2) with ExternalDependencyInstrumentingArtifactTransform
Transforming asm-commons-9.2.jar (org.ow2.asm:asm-commons:9.2) with ExternalDependencyInstrumentingArtifactTransform
Transforming asm-analysis-9.2.jar (org.ow2.asm:asm-analysis:9.2) with ExternalDependencyInstrumentingArtifactTransform
Transforming asm-tree-9.2.jar (org.ow2.asm:asm-tree:9.2) with ExternalDependencyInstrumentingArtifactTransform
Transforming asm-9.2.jar (org.ow2.asm:asm:9.2) with ExternalDependencyInstrumentingArtifactTransform
Transforming bcpkix-jdk15on-1.67.jar (org.bouncycastle:bcpkix-jdk15on:1.67) with ExternalDependencyInstrumentingArtifactTransform
Transforming jaxb-runtime-2.3.2.jar (org.glassfish.jaxb:jaxb-runtime:2.3.2) with ExternalDependencyInstrumentingArtifactTransform
Transforming jopt-simple-4.9.jar (net.sf.jopt-simple:jopt-simple:4.9) with ExternalDependencyInstrumentingArtifactTransform
Transforming proto-google-common-protos-2.0.1.jar (com.google.api.grpc:proto-google-common-protos:2.0.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming protos-31.2.1.jar (com.android.tools.analytics-library:protos:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming core-proto-0.0.8-alpha08.jar (com.google.testing.platform:core-proto:0.0.8-alpha08) with ExternalDependencyInstrumentingArtifactTransform
Transforming protobuf-java-3.19.3.jar (com.google.protobuf:protobuf-java:3.19.3) with ExternalDependencyInstrumentingArtifactTransform
Transforming tensorflow-lite-metadata-0.1.0-rc2.jar (org.tensorflow:tensorflow-lite-metadata:0.1.0-rc2) with ExternalDependencyInstrumentingArtifactTransform
Transforming flatbuffers-java-1.12.0.jar (com.google.flatbuffers:flatbuffers-java:1.12.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming failureaccess-1.0.1.jar (com.google.guava:failureaccess:1.0.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming listenablefuture-9999.0-empty-to-avoid-conflict-with-guava.jar (com.google.guava:listenablefuture:9999.0-empty-to-avoid-conflict-with-guava) with ExternalDependencyInstrumentingArtifactTransform
Transforming checker-qual-3.12.0.jar (org.checkerframework:checker-qual:3.12.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming jsr305-3.0.2.jar (com.google.code.findbugs:jsr305:3.0.2) with ExternalDependencyInstrumentingArtifactTransform
Transforming error_prone_annotations-2.11.0.jar (com.google.errorprone:error_prone_annotations:2.11.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming j2objc-annotations-1.3.jar (com.google.j2objc:j2objc-annotations:1.3) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-gradle-plugin-annotations-1.9.22.jar (org.jetbrains.kotlin:kotlin-gradle-plugin-annotations:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-project-model-1.9.22.jar (org.jetbrains.kotlin:kotlin-project-model:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-tooling-core-1.9.22.jar (org.jetbrains.kotlin:kotlin-tooling-core:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-util-io-1.9.22.jar (org.jetbrains.kotlin:kotlin-util-io:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-daemon-embeddable-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-embeddable:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-daemon-client-1.9.22.jar (org.jetbrains.kotlin:kotlin-daemon-client:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming trove4j-1.0.20200330.jar (org.jetbrains.intellij.deps:trove4j:1.0.20200330) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlinx-coroutines-core-jvm-1.5.0.jar (org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.5.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-scripting-common-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-common:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming kotlin-scripting-jvm-1.9.22.jar (org.jetbrains.kotlin:kotlin-scripting-jvm:1.9.22) with ExternalDependencyInstrumentingArtifactTransform
Transforming dagger-2.28.3.jar (com.google.dagger:dagger:2.28.3) with ExternalDependencyInstrumentingArtifactTransform
Transforming javax.inject-1.jar (javax.inject:javax.inject:1) with ExternalDependencyInstrumentingArtifactTransform
Transforming kxml2-2.3.0.jar (net.sf.kxml:kxml2:2.3.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming bcprov-jdk15on-1.67.jar (org.bouncycastle:bcprov-jdk15on:1.67) with ExternalDependencyInstrumentingArtifactTransform
Transforming xercesImpl-2.12.0.jar (xerces:xercesImpl:2.12.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming httpclient-4.5.14.jar (org.apache.httpcomponents:httpclient:4.5.14) with ExternalDependencyInstrumentingArtifactTransform
Transforming commons-compress-1.21.jar (org.apache.commons:commons-compress:1.21) with ExternalDependencyInstrumentingArtifactTransform
Transforming javax.activation-1.2.0.jar (com.sun.activation:javax.activation:1.2.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming signflinger-8.2.1.jar (com.android:signflinger:8.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming httpcore-4.4.16.jar (org.apache.httpcomponents:httpcore:4.4.16) with ExternalDependencyInstrumentingArtifactTransform
Transforming annotations-31.2.1.jar (com.android.tools:annotations:31.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming jna-platform-5.6.0.jar (net.java.dev.jna:jna-platform:5.6.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming zipflinger-8.2.1.jar (com.android:zipflinger:8.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming juniversalchardet-1.0.3.jar (com.googlecode.juniversalchardet:juniversalchardet:1.0.3) with ExternalDependencyInstrumentingArtifactTransform
Transforming javax.annotation-api-1.3.2.jar (javax.annotation:javax.annotation-api:1.3.2) with ExternalDependencyInstrumentingArtifactTransform
Transforming jakarta.xml.bind-api-2.3.2.jar (jakarta.xml.bind:jakarta.xml.bind-api:2.3.2) with ExternalDependencyInstrumentingArtifactTransform
Transforming stax-ex-1.8.1.jar (org.jvnet.staxex:stax-ex:1.8.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming txw2-2.3.2.jar (org.glassfish.jaxb:txw2:2.3.2) with ExternalDependencyInstrumentingArtifactTransform
Transforming istack-commons-runtime-3.0.8.jar (com.sun.istack:istack-commons-runtime:3.0.8) with ExternalDependencyInstrumentingArtifactTransform
Transforming FastInfoset-1.2.16.jar (com.sun.xml.fastinfoset:FastInfoset:1.2.16) with ExternalDependencyInstrumentingArtifactTransform
Transforming jakarta.activation-api-1.2.1.jar (jakarta.activation:jakarta.activation-api:1.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming auto-value-annotations-1.6.2.jar (com.google.auto.value:auto-value-annotations:1.6.2) with ExternalDependencyInstrumentingArtifactTransform
Transforming jose4j-0.7.0.jar (org.bitbucket.b_c:jose4j:0.7.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming jdom2-2.0.6.jar (org.jdom:jdom2:2.0.6) with ExternalDependencyInstrumentingArtifactTransform
Transforming annotations-4.1.1.4.jar (com.google.android:annotations:4.1.1.4) with ExternalDependencyInstrumentingArtifactTransform
Transforming slf4j-api-1.7.30.jar (org.slf4j:slf4j-api:1.7.30) with ExternalDependencyInstrumentingArtifactTransform
Transforming netty-codec-http2-4.1.72.Final.jar (io.netty:netty-codec-http2:4.1.72.Final) with ExternalDependencyInstrumentingArtifactTransform
Transforming animal-sniffer-annotations-1.19.jar (org.codehaus.mojo:animal-sniffer-annotations:1.19) with ExternalDependencyInstrumentingArtifactTransform
Transforming perfmark-api-0.23.0.jar (io.perfmark:perfmark-api:0.23.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming netty-handler-proxy-4.1.72.Final.jar (io.netty:netty-handler-proxy:4.1.72.Final) with ExternalDependencyInstrumentingArtifactTransform
Transforming apksig-8.2.1.jar (com.android.tools.build:apksig:8.2.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming commons-codec-1.11.jar (commons-codec:commons-codec:1.11) with ExternalDependencyInstrumentingArtifactTransform
Transforming javawriter-2.5.0.jar (com.squareup:javawriter:2.5.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming xml-apis-1.4.01.jar (xml-apis:xml-apis:1.4.01) with ExternalDependencyInstrumentingArtifactTransform
Transforming commons-logging-1.2.jar (commons-logging:commons-logging:1.2) with ExternalDependencyInstrumentingArtifactTransform
Transforming jna-5.6.0.jar (net.java.dev.jna:jna:5.6.0) with ExternalDependencyInstrumentingArtifactTransform
Transforming grpc-context-1.45.1.jar (io.grpc:grpc-context:1.45.1) with ExternalDependencyInstrumentingArtifactTransform
Transforming netty-codec-http-4.1.72.Final.jar (io.netty:netty-codec-http:4.1.72.Final) with ExternalDependencyInstrumentingArtifactTransform
Transforming netty-codec-4.1.72.Final.jar (io.netty:netty-codec:4.1.72.Final) with ExternalDependencyInstrumentingArtifactTransform
Transforming netty-codec-socks-4.1.72.Final.jar (io.netty:netty-codec-socks:4.1.72.Final) with ExternalDependencyInstrumentingArtifactTransform
Transforming netty-handler-4.1.72.Final.jar (io.netty:netty-handler:4.1.72.Final) with ExternalDependencyInstrumentingArtifactTransform
Transforming netty-transport-4.1.72.Final.jar (io.netty:netty-transport:4.1.72.Final) with ExternalDependencyInstrumentingArtifactTransform
Transforming netty-buffer-4.1.72.Final.jar (io.netty:netty-buffer:4.1.72.Final) with ExternalDependencyInstrumentingArtifactTransform
Transforming netty-resolver-4.1.72.Final.jar (io.netty:netty-resolver:4.1.72.Final) with ExternalDependencyInstrumentingArtifactTransform
Transforming netty-common-4.1.72.Final.jar (io.netty:netty-common:4.1.72.Final) with ExternalDependencyInstrumentingArtifactTransform
Transforming netty-tcnative-classes-2.0.46.Final.jar (io.netty:netty-tcnative-classes:2.0.46.Final) with ExternalDependencyInstrumentingArtifactTransform

> Configure project :app
Evaluating project ':app' using build file '/home/runner/work/voyager-rn/voyager-rn/android/app/build.gradle'.
Using default execution profile
Using Kotlin Gradle Plugin gradle82 variant
 ℹ️  Applying gradle plugin 'expo-updates-gradle-plugin' (expo-updates@0.25.28)
Could not execute [report metric STATISTICS_COLLECT_METRICS_OVERHEAD]
Could not execute [report metric STATISTICS_COLLECT_METRICS_OVERHEAD]

FAILURE: Build failed with an exception.

* Where:
Build file '/home/runner/work/voyager-rn/voyager-rn/android/app/build.gradle' line: 6

* What went wrong:
A problem occurred evaluating project ':app'.
> Could not read script '/home/runner/work/voyager-rn/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle' as it does not exist.

* Try:
> Run with --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

* Exception is:
org.gradle.api.GradleScriptException: A problem occurred evaluating project ':app'.
	at org.gradle.groovy.scripts.internal.DefaultScriptRunnerFactory$ScriptRunnerImpl.run(DefaultScriptRunnerFactory.java:93)
	at org.gradle.configuration.DefaultScriptPluginFactory$ScriptPluginImpl.lambda$apply$0(DefaultScriptPluginFactory.java:137)
	at org.gradle.configuration.ProjectScriptTarget.addConfiguration(ProjectScriptTarget.java:79)
	at org.gradle.configuration.DefaultScriptPluginFactory$ScriptPluginImpl.apply(DefaultScriptPluginFactory.java:140)
	at org.gradle.configuration.BuildOperationScriptPlugin$1.run(BuildOperationScriptPlugin.java:68)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:29)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:26)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:66)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:166)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.run(DefaultBuildOperationRunner.java:47)
	at org.gradle.configuration.BuildOperationScriptPlugin.lambda$apply$0(BuildOperationScriptPlugin.java:65)
	at org.gradle.internal.code.DefaultUserCodeApplicationContext.apply(DefaultUserCodeApplicationContext.java:43)
	at org.gradle.configuration.BuildOperationScriptPlugin.apply(BuildOperationScriptPlugin.java:65)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.lambda$applyToMutableState$1(DefaultProjectStateRegistry.java:407)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.fromMutableState(DefaultProjectStateRegistry.java:425)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.applyToMutableState(DefaultProjectStateRegistry.java:406)
	at org.gradle.configuration.project.BuildScriptProcessor.execute(BuildScriptProcessor.java:46)
	at org.gradle.configuration.project.BuildScriptProcessor.execute(BuildScriptProcessor.java:27)
	at org.gradle.configuration.project.ConfigureActionsProjectEvaluator.evaluate(ConfigureActionsProjectEvaluator.java:35)
	at org.gradle.configuration.project.LifecycleProjectEvaluator$EvaluateProject.lambda$run$0(LifecycleProjectEvaluator.java:109)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.lambda$applyToMutableState$1(DefaultProjectStateRegistry.java:407)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.fromMutableState(DefaultProjectStateRegistry.java:425)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.applyToMutableState(DefaultProjectStateRegistry.java:406)
	at org.gradle.configuration.project.LifecycleProjectEvaluator$EvaluateProject.run(LifecycleProjectEvaluator.java:100)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:29)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:26)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:66)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:166)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.run(DefaultBuildOperationRunner.java:47)
	at org.gradle.configuration.project.LifecycleProjectEvaluator.evaluate(LifecycleProjectEvaluator.java:72)
	at org.gradle.api.internal.project.DefaultProject.evaluate(DefaultProject.java:785)
	at org.gradle.api.internal.project.DefaultProject.evaluate(DefaultProject.java:155)
	at org.gradle.api.internal.project.ProjectLifecycleController.lambda$ensureSelfConfigured$2(ProjectLifecycleController.java:84)
	at org.gradle.internal.model.StateTransitionController.lambda$doTransition$14(StateTransitionController.java:255)
	at org.gradle.internal.model.StateTransitionController.doTransition(StateTransitionController.java:266)
	at org.gradle.internal.model.StateTransitionController.doTransition(StateTransitionController.java:254)
	at org.gradle.internal.model.StateTransitionController.lambda$maybeTransitionIfNotCurrentlyTransitioning$10(StateTransitionController.java:199)
	at org.gradle.internal.work.DefaultSynchronizer.withLock(DefaultSynchronizer.java:34)
	at org.gradle.internal.model.StateTransitionController.maybeTransitionIfNotCurrentlyTransitioning(StateTransitionController.java:195)
	at org.gradle.api.internal.project.ProjectLifecycleController.ensureSelfConfigured(ProjectLifecycleController.java:84)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.ensureConfigured(DefaultProjectStateRegistry.java:381)
	at org.gradle.api.internal.project.DefaultProject.evaluationDependsOn(DefaultProject.java:863)
	at org.gradle.api.internal.project.DefaultProject.evaluationDependsOn(DefaultProject.java:855)
	at com.facebook.react.ReactRootProjectPlugin$apply$1.invoke(ReactRootProjectPlugin.kt:26)
	at com.facebook.react.ReactRootProjectPlugin$apply$1.invoke(ReactRootProjectPlugin.kt:21)
	at com.facebook.react.ReactRootProjectPlugin.apply$lambda$0(ReactRootProjectPlugin.kt:21)
	at org.gradle.api.internal.DefaultMutationGuard$1.execute(DefaultMutationGuard.java:45)
	at org.gradle.internal.Actions.with(Actions.java:206)
	at org.gradle.api.internal.project.BuildOperationCrossProjectConfigurator$1.run(BuildOperationCrossProjectConfigurator.java:69)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:29)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:26)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:66)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:166)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.run(DefaultBuildOperationRunner.java:47)
	at org.gradle.api.internal.project.BuildOperationCrossProjectConfigurator.lambda$runProjectConfigureAction$0(BuildOperationCrossProjectConfigurator.java:66)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.lambda$applyToMutableState$1(DefaultProjectStateRegistry.java:407)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.fromMutableState(DefaultProjectStateRegistry.java:425)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.applyToMutableState(DefaultProjectStateRegistry.java:406)
	at org.gradle.api.internal.project.BuildOperationCrossProjectConfigurator.runProjectConfigureAction(BuildOperationCrossProjectConfigurator.java:66)
	at org.gradle.api.internal.project.BuildOperationCrossProjectConfigurator.access$100(BuildOperationCrossProjectConfigurator.java:32)
	at org.gradle.api.internal.project.BuildOperationCrossProjectConfigurator$BlockConfigureBuildOperation.run(BuildOperationCrossProjectConfigurator.java:111)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:29)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:26)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:66)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:166)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.run(DefaultBuildOperationRunner.java:47)
	at org.gradle.api.internal.project.BuildOperationCrossProjectConfigurator.runBlockConfigureAction(BuildOperationCrossProjectConfigurator.java:62)
	at org.gradle.api.internal.project.BuildOperationCrossProjectConfigurator.subprojects(BuildOperationCrossProjectConfigurator.java:48)
	at org.gradle.api.internal.project.DefaultProject.subprojects(DefaultProject.java:746)
	at org.gradle.api.internal.project.DefaultProject.subprojects(DefaultProject.java:741)
	at com.facebook.react.ReactRootProjectPlugin.apply(ReactRootProjectPlugin.kt:21)
	at com.facebook.react.ReactRootProjectPlugin.apply(ReactRootProjectPlugin.kt:19)
	at org.gradle.api.internal.plugins.ImperativeOnlyPluginTarget.applyImperative(ImperativeOnlyPluginTarget.java:43)
	at org.gradle.api.internal.plugins.RuleBasedPluginTarget.applyImperative(RuleBasedPluginTarget.java:51)
	at org.gradle.api.internal.plugins.DefaultPluginManager.addPlugin(DefaultPluginManager.java:190)
	at org.gradle.api.internal.plugins.DefaultPluginManager.access$100(DefaultPluginManager.java:54)
	at org.gradle.api.internal.plugins.DefaultPluginManager$AddPluginBuildOperation.run(DefaultPluginManager.java:285)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:29)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:26)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:66)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:166)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.run(DefaultBuildOperationRunner.java:47)
	at org.gradle.api.internal.plugins.DefaultPluginManager.lambda$doApply$0(DefaultPluginManager.java:170)
	at org.gradle.internal.code.DefaultUserCodeApplicationContext.apply(DefaultUserCodeApplicationContext.java:43)
	at org.gradle.api.internal.plugins.DefaultPluginManager.doApply(DefaultPluginManager.java:169)
	at org.gradle.api.internal.plugins.DefaultPluginManager.apply(DefaultPluginManager.java:148)
	at org.gradle.api.internal.plugins.DefaultObjectConfigurationAction.applyType(DefaultObjectConfigurationAction.java:161)
	at org.gradle.api.internal.plugins.DefaultObjectConfigurationAction.access$200(DefaultObjectConfigurationAction.java:43)
	at org.gradle.api.internal.plugins.DefaultObjectConfigurationAction$3.run(DefaultObjectConfigurationAction.java:98)
	at org.gradle.api.internal.plugins.DefaultObjectConfigurationAction.execute(DefaultObjectConfigurationAction.java:184)
	at org.gradle.api.internal.project.AbstractPluginAware.apply(AbstractPluginAware.java:49)
	at org.gradle.api.internal.project.ProjectScript.apply(ProjectScript.java:37)
	at org.gradle.api.Script$apply.callCurrent(Unknown Source)
	at build_8wrseqjcdk4c4zos804nrtvkl.run(/home/runner/work/voyager-rn/voyager-rn/android/build.gradle:24)
	at org.gradle.groovy.scripts.internal.DefaultScriptRunnerFactory$ScriptRunnerImpl.run(DefaultScriptRunnerFactory.java:91)
	at org.gradle.configuration.DefaultScriptPluginFactory$ScriptPluginImpl.lambda$apply$0(DefaultScriptPluginFactory.java:137)
	at org.gradle.configuration.ProjectScriptTarget.addConfiguration(ProjectScriptTarget.java:79)
	at org.gradle.configuration.DefaultScriptPluginFactory$ScriptPluginImpl.apply(DefaultScriptPluginFactory.java:140)
	at org.gradle.configuration.BuildOperationScriptPlugin$1.run(BuildOperationScriptPlugin.java:68)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:29)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:26)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:66)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:166)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.run(DefaultBuildOperationRunner.java:47)
	at org.gradle.configuration.BuildOperationScriptPlugin.lambda$apply$0(BuildOperationScriptPlugin.java:65)
	at org.gradle.internal.code.DefaultUserCodeApplicationContext.apply(DefaultUserCodeApplicationContext.java:43)
	at org.gradle.configuration.BuildOperationScriptPlugin.apply(BuildOperationScriptPlugin.java:65)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.lambda$applyToMutableState$1(DefaultProjectStateRegistry.java:407)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.fromMutableState(DefaultProjectStateRegistry.java:425)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.applyToMutableState(DefaultProjectStateRegistry.java:406)
	at org.gradle.configuration.project.BuildScriptProcessor.execute(BuildScriptProcessor.java:46)
	at org.gradle.configuration.project.BuildScriptProcessor.execute(BuildScriptProcessor.java:27)
	at org.gradle.configuration.project.ConfigureActionsProjectEvaluator.evaluate(ConfigureActionsProjectEvaluator.java:35)
	at org.gradle.configuration.project.LifecycleProjectEvaluator$EvaluateProject.lambda$run$0(LifecycleProjectEvaluator.java:109)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.lambda$applyToMutableState$1(DefaultProjectStateRegistry.java:407)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.lambda$fromMutableState$2(DefaultProjectStateRegistry.java:430)
	at org.gradle.internal.work.DefaultWorkerLeaseService.withReplacedLocks(DefaultWorkerLeaseService.java:360)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.fromMutableState(DefaultProjectStateRegistry.java:430)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.applyToMutableState(DefaultProjectStateRegistry.java:406)
	at org.gradle.configuration.project.LifecycleProjectEvaluator$EvaluateProject.run(LifecycleProjectEvaluator.java:100)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:29)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:26)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:66)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:166)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.run(DefaultBuildOperationRunner.java:47)
	at org.gradle.configuration.project.LifecycleProjectEvaluator.evaluate(LifecycleProjectEvaluator.java:72)
	at org.gradle.api.internal.project.DefaultProject.evaluate(DefaultProject.java:785)
	at org.gradle.api.internal.project.DefaultProject.evaluate(DefaultProject.java:155)
	at org.gradle.api.internal.project.ProjectLifecycleController.lambda$ensureSelfConfigured$2(ProjectLifecycleController.java:84)
	at org.gradle.internal.model.StateTransitionController.lambda$doTransition$14(StateTransitionController.java:255)
	at org.gradle.internal.model.StateTransitionController.doTransition(StateTransitionController.java:266)
	at org.gradle.internal.model.StateTransitionController.doTransition(StateTransitionController.java:254)
	at org.gradle.internal.model.StateTransitionController.lambda$maybeTransitionIfNotCurrentlyTransitioning$10(StateTransitionController.java:199)
	at org.gradle.internal.work.DefaultSynchronizer.withLock(DefaultSynchronizer.java:34)
	at org.gradle.internal.model.StateTransitionController.maybeTransitionIfNotCurrentlyTransitioning(StateTransitionController.java:195)
	at org.gradle.api.internal.project.ProjectLifecycleController.ensureSelfConfigured(ProjectLifecycleController.java:84)
	at org.gradle.api.internal.project.DefaultProjectStateRegistry$ProjectStateImpl.ensureConfigured(DefaultProjectStateRegistry.java:381)
	at org.gradle.execution.TaskPathProjectEvaluator.configure(TaskPathProjectEvaluator.java:34)
	at org.gradle.execution.TaskPathProjectEvaluator.configureHierarchy(TaskPathProjectEvaluator.java:48)
	at org.gradle.configuration.DefaultProjectsPreparer.prepareProjects(DefaultProjectsPreparer.java:42)
	at org.gradle.configuration.BuildTreePreparingProjectsPreparer.prepareProjects(BuildTreePreparingProjectsPreparer.java:65)
	at org.gradle.configuration.BuildOperationFiringProjectsPreparer$ConfigureBuild.run(BuildOperationFiringProjectsPreparer.java:52)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:29)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:26)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:66)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:166)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.run(DefaultBuildOperationRunner.java:47)
	at org.gradle.configuration.BuildOperationFiringProjectsPreparer.prepareProjects(BuildOperationFiringProjectsPreparer.java:40)
	at org.gradle.initialization.VintageBuildModelController.lambda$prepareProjects$2(VintageBuildModelController.java:84)
	at org.gradle.internal.model.StateTransitionController.lambda$doTransition$14(StateTransitionController.java:255)
	at org.gradle.internal.model.StateTransitionController.doTransition(StateTransitionController.java:266)
	at org.gradle.internal.model.StateTransitionController.doTransition(StateTransitionController.java:254)
	at org.gradle.internal.model.StateTransitionController.lambda$transitionIfNotPreviously$11(StateTransitionController.java:213)
	at org.gradle.internal.work.DefaultSynchronizer.withLock(DefaultSynchronizer.java:34)
	at org.gradle.internal.model.StateTransitionController.transitionIfNotPreviously(StateTransitionController.java:209)
	at org.gradle.initialization.VintageBuildModelController.prepareProjects(VintageBuildModelController.java:84)
	at org.gradle.initialization.VintageBuildModelController.prepareToScheduleTasks(VintageBuildModelController.java:71)
	at org.gradle.internal.build.DefaultBuildLifecycleController.lambda$prepareToScheduleTasks$6(DefaultBuildLifecycleController.java:175)
	at org.gradle.internal.model.StateTransitionController.lambda$doTransition$14(StateTransitionController.java:255)
	at org.gradle.internal.model.StateTransitionController.doTransition(StateTransitionController.java:266)
	at org.gradle.internal.model.StateTransitionController.doTransition(StateTransitionController.java:254)
	at org.gradle.internal.model.StateTransitionController.lambda$maybeTransition$9(StateTransitionController.java:190)
	at org.gradle.internal.work.DefaultSynchronizer.withLock(DefaultSynchronizer.java:34)
	at org.gradle.internal.model.StateTransitionController.maybeTransition(StateTransitionController.java:186)
	at org.gradle.internal.build.DefaultBuildLifecycleController.prepareToScheduleTasks(DefaultBuildLifecycleController.java:173)
	at org.gradle.internal.buildtree.DefaultBuildTreeWorkPreparer.scheduleRequestedTasks(DefaultBuildTreeWorkPreparer.java:36)
	at org.gradle.configurationcache.VintageBuildTreeWorkController$scheduleAndRunRequestedTasks$1.apply(VintageBuildTreeWorkController.kt:36)
	at org.gradle.configurationcache.VintageBuildTreeWorkController$scheduleAndRunRequestedTasks$1.apply(VintageBuildTreeWorkController.kt:35)
	at org.gradle.composite.internal.DefaultIncludedBuildTaskGraph.withNewWorkGraph(DefaultIncludedBuildTaskGraph.java:112)
	at org.gradle.configurationcache.VintageBuildTreeWorkController.scheduleAndRunRequestedTasks(VintageBuildTreeWorkController.kt:35)
	at org.gradle.internal.buildtree.DefaultBuildTreeLifecycleController.lambda$scheduleAndRunTasks$1(DefaultBuildTreeLifecycleController.java:77)
	at org.gradle.internal.buildtree.DefaultBuildTreeLifecycleController.lambda$runBuild$4(DefaultBuildTreeLifecycleController.java:120)
	at org.gradle.internal.model.StateTransitionController.lambda$transition$6(StateTransitionController.java:169)
	at org.gradle.internal.model.StateTransitionController.doTransition(StateTransitionController.java:266)
	at org.gradle.internal.model.StateTransitionController.lambda$transition$7(StateTransitionController.java:169)
	at org.gradle.internal.work.DefaultSynchronizer.withLock(DefaultSynchronizer.java:44)
	at org.gradle.internal.model.StateTransitionController.transition(StateTransitionController.java:169)
	at org.gradle.internal.buildtree.DefaultBuildTreeLifecycleController.runBuild(DefaultBuildTreeLifecycleController.java:117)
	at org.gradle.internal.buildtree.DefaultBuildTreeLifecycleController.scheduleAndRunTasks(DefaultBuildTreeLifecycleController.java:77)
	at org.gradle.internal.buildtree.DefaultBuildTreeLifecycleController.scheduleAndRunTasks(DefaultBuildTreeLifecycleController.java:72)
	at org.gradle.tooling.internal.provider.ExecuteBuildActionRunner.run(ExecuteBuildActionRunner.java:31)
	at org.gradle.launcher.exec.ChainingBuildActionRunner.run(ChainingBuildActionRunner.java:35)
	at org.gradle.internal.buildtree.ProblemReportingBuildActionRunner.run(ProblemReportingBuildActionRunner.java:49)
	at org.gradle.launcher.exec.BuildOutcomeReportingBuildActionRunner.run(BuildOutcomeReportingBuildActionRunner.java:65)
	at org.gradle.tooling.internal.provider.FileSystemWatchingBuildActionRunner.run(FileSystemWatchingBuildActionRunner.java:140)
	at org.gradle.launcher.exec.BuildCompletionNotifyingBuildActionRunner.run(BuildCompletionNotifyingBuildActionRunner.java:41)
	at org.gradle.launcher.exec.RootBuildLifecycleBuildActionExecutor.lambda$execute$0(RootBuildLifecycleBuildActionExecutor.java:40)
	at org.gradle.composite.internal.DefaultRootBuildState.run(DefaultRootBuildState.java:123)
	at org.gradle.launcher.exec.RootBuildLifecycleBuildActionExecutor.execute(RootBuildLifecycleBuildActionExecutor.java:40)
	at org.gradle.internal.buildtree.InitDeprecationLoggingActionExecutor.execute(InitDeprecationLoggingActionExecutor.java:66)
	at org.gradle.internal.buildtree.InitProblems.execute(InitProblems.java:36)
	at org.gradle.internal.buildtree.DefaultBuildTreeContext.execute(DefaultBuildTreeContext.java:40)
	at org.gradle.launcher.exec.BuildTreeLifecycleBuildActionExecutor.lambda$execute$0(BuildTreeLifecycleBuildActionExecutor.java:71)
	at org.gradle.internal.buildtree.BuildTreeState.run(BuildTreeState.java:60)
	at org.gradle.launcher.exec.BuildTreeLifecycleBuildActionExecutor.execute(BuildTreeLifecycleBuildActionExecutor.java:71)
	at org.gradle.launcher.exec.RunAsBuildOperationBuildActionExecutor$3.call(RunAsBuildOperationBuildActionExecutor.java:61)
	at org.gradle.launcher.exec.RunAsBuildOperationBuildActionExecutor$3.call(RunAsBuildOperationBuildActionExecutor.java:57)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$CallableBuildOperationWorker.execute(DefaultBuildOperationRunner.java:209)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$CallableBuildOperationWorker.execute(DefaultBuildOperationRunner.java:204)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:66)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:166)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.call(DefaultBuildOperationRunner.java:53)
	at org.gradle.launcher.exec.RunAsBuildOperationBuildActionExecutor.execute(RunAsBuildOperationBuildActionExecutor.java:57)
	at org.gradle.launcher.exec.RunAsWorkerThreadBuildActionExecutor.lambda$execute$0(RunAsWorkerThreadBuildActionExecutor.java:36)
	at org.gradle.internal.work.DefaultWorkerLeaseService.withLocks(DefaultWorkerLeaseService.java:264)
	at org.gradle.internal.work.DefaultWorkerLeaseService.runAsWorkerThread(DefaultWorkerLeaseService.java:128)
	at org.gradle.launcher.exec.RunAsWorkerThreadBuildActionExecutor.execute(RunAsWorkerThreadBuildActionExecutor.java:36)
	at org.gradle.tooling.internal.provider.continuous.ContinuousBuildActionExecutor.execute(ContinuousBuildActionExecutor.java:110)
	at org.gradle.tooling.internal.provider.SubscribableBuildActionExecutor.execute(SubscribableBuildActionExecutor.java:64)
	at org.gradle.internal.session.DefaultBuildSessionContext.execute(DefaultBuildSessionContext.java:46)
	at org.gradle.tooling.internal.provider.BuildSessionLifecycleBuildActionExecuter$ActionImpl.apply(BuildSessionLifecycleBuildActionExecuter.java:92)
	at org.gradle.tooling.internal.provider.BuildSessionLifecycleBuildActionExecuter$ActionImpl.apply(BuildSessionLifecycleBuildActionExecuter.java:80)
	at org.gradle.internal.session.BuildSessionState.run(BuildSessionState.java:71)
	at org.gradle.tooling.internal.provider.BuildSessionLifecycleBuildActionExecuter.execute(BuildSessionLifecycleBuildActionExecuter.java:62)
	at org.gradle.tooling.internal.provider.BuildSessionLifecycleBuildActionExecuter.execute(BuildSessionLifecycleBuildActionExecuter.java:41)
	at org.gradle.tooling.internal.provider.StartParamsValidatingActionExecuter.execute(StartParamsValidatingActionExecuter.java:64)
	at org.gradle.tooling.internal.provider.StartParamsValidatingActionExecuter.execute(StartParamsValidatingActionExecuter.java:32)
	at org.gradle.tooling.internal.provider.SessionFailureReportingActionExecuter.execute(SessionFailureReportingActionExecuter.java:51)
	at org.gradle.tooling.internal.provider.SessionFailureReportingActionExecuter.execute(SessionFailureReportingActionExecuter.java:39)
	at org.gradle.tooling.internal.provider.SetupLoggingActionExecuter.execute(SetupLoggingActionExecuter.java:47)
	at org.gradle.tooling.internal.provider.SetupLoggingActionExecuter.execute(SetupLoggingActionExecuter.java:31)
	at org.gradle.launcher.daemon.server.exec.ExecuteBuild.doBuild(ExecuteBuild.java:65)
	at org.gradle.launcher.daemon.server.exec.BuildCommandOnly.execute(BuildCommandOnly.java:37)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.WatchForDisconnection.execute(WatchForDisconnection.java:39)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.ResetDeprecationLogger.execute(ResetDeprecationLogger.java:29)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.RequestStopIfSingleUsedDaemon.execute(RequestStopIfSingleUsedDaemon.java:35)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.ForwardClientInput.lambda$execute$0(ForwardClientInput.java:39)
	at org.gradle.launcher.daemon.server.clientinput.ClientInputForwarder.forwardInput(ClientInputForwarder.java:88)
	at org.gradle.launcher.daemon.server.exec.ForwardClientInput.execute(ForwardClientInput.java:36)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.LogAndCheckHealth.execute(LogAndCheckHealth.java:53)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.LogToClient.doBuild(LogToClient.java:63)
	at org.gradle.launcher.daemon.server.exec.BuildCommandOnly.execute(BuildCommandOnly.java:37)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.EstablishBuildEnvironment.doBuild(EstablishBuildEnvironment.java:84)
	at org.gradle.launcher.daemon.server.exec.BuildCommandOnly.execute(BuildCommandOnly.java:37)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.StartBuildOrRespondWithBusy$1.run(StartBuildOrRespondWithBusy.java:52)
	at org.gradle.launcher.daemon.server.DaemonStateCoordinator$1.run(DaemonStateCoordinator.java:297)
	at org.gradle.internal.concurrent.ExecutorPolicy$CatchAndRecordFailures.onExecute(ExecutorPolicy.java:64)
	at org.gradle.internal.concurrent.AbstractManagedExecutor$1.run(AbstractManagedExecutor.java:47)
Caused by: org.gradle.api.resources.MissingResourceException: Could not read script '/home/runner/work/voyager-rn/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle' as it does not exist.
	at org.gradle.internal.resource.UriTextResource.getText(UriTextResource.java:154)
	at org.gradle.internal.resource.CachingTextResource.maybeFetch(CachingTextResource.java:112)
	at org.gradle.internal.resource.CachingTextResource.getContentHash(CachingTextResource.java:100)
	at org.gradle.groovy.scripts.internal.CrossBuildInMemoryCachingScriptClassCache.getOrCompile(CrossBuildInMemoryCachingScriptClassCache.java:46)
	at org.gradle.groovy.scripts.internal.BuildScopeInMemoryCachingScriptClassCompiler.compile(BuildScopeInMemoryCachingScriptClassCompiler.java:50)
	at org.gradle.groovy.scripts.DefaultScriptCompilerFactory$ScriptCompilerImpl.compile(DefaultScriptCompilerFactory.java:49)
	at org.gradle.configuration.DefaultScriptPluginFactory$ScriptPluginImpl.apply(DefaultScriptPluginFactory.java:112)
	at org.gradle.configuration.BuildOperationScriptPlugin$1.run(BuildOperationScriptPlugin.java:68)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:29)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:26)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:66)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:166)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.run(DefaultBuildOperationRunner.java:47)
	at org.gradle.configuration.BuildOperationScriptPlugin.lambda$apply$0(BuildOperationScriptPlugin.java:65)
	at org.gradle.internal.code.DefaultUserCodeApplicationContext.apply(DefaultUserCodeApplicationContext.java:43)
	at org.gradle.configuration.BuildOperationScriptPlugin.apply(BuildOperationScriptPlugin.java:65)
	at org.gradle.api.internal.plugins.DefaultObjectConfigurationAction.applyScript(DefaultObjectConfigurationAction.java:150)
	at org.gradle.api.internal.plugins.DefaultObjectConfigurationAction.access$000(DefaultObjectConfigurationAction.java:43)
	at org.gradle.api.internal.plugins.DefaultObjectConfigurationAction$1.run(DefaultObjectConfigurationAction.java:76)
	at org.gradle.api.internal.plugins.DefaultObjectConfigurationAction.execute(DefaultObjectConfigurationAction.java:184)
	at org.gradle.api.internal.project.AbstractPluginAware.apply(AbstractPluginAware.java:49)
	at org.gradle.api.internal.project.ProjectScript.apply(ProjectScript.java:37)
	at org.gradle.api.Script$apply.callCurrent(Unknown Source)
	at build_93pyivzj61i2ysygcv70b3ay7.run(/home/runner/work/voyager-rn/voyager-rn/android/app/build.gradle:6)
	at org.gradle.groovy.scripts.internal.DefaultScriptRunnerFactory$ScriptRunnerImpl.run(DefaultScriptRunnerFactory.java:91)
	... 263 more


BUILD FAILED in 22s
15 actionable tasks: 15 executed

==========================================
📊 Build Result
==========================================
Exit code: 1
❌ BUILD FAILED

==========================================
🔍 ERROR ANALYSIS
==========================================

📋 Last 100 lines of build output:
	at org.gradle.launcher.exec.ChainingBuildActionRunner.run(ChainingBuildActionRunner.java:35)
	at org.gradle.internal.buildtree.ProblemReportingBuildActionRunner.run(ProblemReportingBuildActionRunner.java:49)
	at org.gradle.launcher.exec.BuildOutcomeReportingBuildActionRunner.run(BuildOutcomeReportingBuildActionRunner.java:65)
	at org.gradle.tooling.internal.provider.FileSystemWatchingBuildActionRunner.run(FileSystemWatchingBuildActionRunner.java:140)
	at org.gradle.launcher.exec.BuildCompletionNotifyingBuildActionRunner.run(BuildCompletionNotifyingBuildActionRunner.java:41)
	at org.gradle.launcher.exec.RootBuildLifecycleBuildActionExecutor.lambda$execute$0(RootBuildLifecycleBuildActionExecutor.java:40)
	at org.gradle.composite.internal.DefaultRootBuildState.run(DefaultRootBuildState.java:123)
	at org.gradle.launcher.exec.RootBuildLifecycleBuildActionExecutor.execute(RootBuildLifecycleBuildActionExecutor.java:40)
	at org.gradle.internal.buildtree.InitDeprecationLoggingActionExecutor.execute(InitDeprecationLoggingActionExecutor.java:66)
	at org.gradle.internal.buildtree.InitProblems.execute(InitProblems.java:36)
	at org.gradle.internal.buildtree.DefaultBuildTreeContext.execute(DefaultBuildTreeContext.java:40)
	at org.gradle.launcher.exec.BuildTreeLifecycleBuildActionExecutor.lambda$execute$0(BuildTreeLifecycleBuildActionExecutor.java:71)
	at org.gradle.internal.buildtree.BuildTreeState.run(BuildTreeState.java:60)
	at org.gradle.launcher.exec.BuildTreeLifecycleBuildActionExecutor.execute(BuildTreeLifecycleBuildActionExecutor.java:71)
	at org.gradle.launcher.exec.RunAsBuildOperationBuildActionExecutor$3.call(RunAsBuildOperationBuildActionExecutor.java:61)
	at org.gradle.launcher.exec.RunAsBuildOperationBuildActionExecutor$3.call(RunAsBuildOperationBuildActionExecutor.java:57)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$CallableBuildOperationWorker.execute(DefaultBuildOperationRunner.java:209)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$CallableBuildOperationWorker.execute(DefaultBuildOperationRunner.java:204)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:66)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:166)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.call(DefaultBuildOperationRunner.java:53)
	at org.gradle.launcher.exec.RunAsBuildOperationBuildActionExecutor.execute(RunAsBuildOperationBuildActionExecutor.java:57)
	at org.gradle.launcher.exec.RunAsWorkerThreadBuildActionExecutor.lambda$execute$0(RunAsWorkerThreadBuildActionExecutor.java:36)
	at org.gradle.internal.work.DefaultWorkerLeaseService.withLocks(DefaultWorkerLeaseService.java:264)
	at org.gradle.internal.work.DefaultWorkerLeaseService.runAsWorkerThread(DefaultWorkerLeaseService.java:128)
	at org.gradle.launcher.exec.RunAsWorkerThreadBuildActionExecutor.execute(RunAsWorkerThreadBuildActionExecutor.java:36)
	at org.gradle.tooling.internal.provider.continuous.ContinuousBuildActionExecutor.execute(ContinuousBuildActionExecutor.java:110)
	at org.gradle.tooling.internal.provider.SubscribableBuildActionExecutor.execute(SubscribableBuildActionExecutor.java:64)
	at org.gradle.internal.session.DefaultBuildSessionContext.execute(DefaultBuildSessionContext.java:46)
	at org.gradle.tooling.internal.provider.BuildSessionLifecycleBuildActionExecuter$ActionImpl.apply(BuildSessionLifecycleBuildActionExecuter.java:92)
	at org.gradle.tooling.internal.provider.BuildSessionLifecycleBuildActionExecuter$ActionImpl.apply(BuildSessionLifecycleBuildActionExecuter.java:80)
	at org.gradle.internal.session.BuildSessionState.run(BuildSessionState.java:71)
	at org.gradle.tooling.internal.provider.BuildSessionLifecycleBuildActionExecuter.execute(BuildSessionLifecycleBuildActionExecuter.java:62)
	at org.gradle.tooling.internal.provider.BuildSessionLifecycleBuildActionExecuter.execute(BuildSessionLifecycleBuildActionExecuter.java:41)
	at org.gradle.tooling.internal.provider.StartParamsValidatingActionExecuter.execute(StartParamsValidatingActionExecuter.java:64)
	at org.gradle.tooling.internal.provider.StartParamsValidatingActionExecuter.execute(StartParamsValidatingActionExecuter.java:32)
	at org.gradle.tooling.internal.provider.SessionFailureReportingActionExecuter.execute(SessionFailureReportingActionExecuter.java:51)
	at org.gradle.tooling.internal.provider.SessionFailureReportingActionExecuter.execute(SessionFailureReportingActionExecuter.java:39)
	at org.gradle.tooling.internal.provider.SetupLoggingActionExecuter.execute(SetupLoggingActionExecuter.java:47)
	at org.gradle.tooling.internal.provider.SetupLoggingActionExecuter.execute(SetupLoggingActionExecuter.java:31)
	at org.gradle.launcher.daemon.server.exec.ExecuteBuild.doBuild(ExecuteBuild.java:65)
	at org.gradle.launcher.daemon.server.exec.BuildCommandOnly.execute(BuildCommandOnly.java:37)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.WatchForDisconnection.execute(WatchForDisconnection.java:39)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.ResetDeprecationLogger.execute(ResetDeprecationLogger.java:29)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.RequestStopIfSingleUsedDaemon.execute(RequestStopIfSingleUsedDaemon.java:35)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.ForwardClientInput.lambda$execute$0(ForwardClientInput.java:39)
	at org.gradle.launcher.daemon.server.clientinput.ClientInputForwarder.forwardInput(ClientInputForwarder.java:88)
	at org.gradle.launcher.daemon.server.exec.ForwardClientInput.execute(ForwardClientInput.java:36)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.LogAndCheckHealth.execute(LogAndCheckHealth.java:53)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.LogToClient.doBuild(LogToClient.java:63)
	at org.gradle.launcher.daemon.server.exec.BuildCommandOnly.execute(BuildCommandOnly.java:37)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.EstablishBuildEnvironment.doBuild(EstablishBuildEnvironment.java:84)
	at org.gradle.launcher.daemon.server.exec.BuildCommandOnly.execute(BuildCommandOnly.java:37)
	at org.gradle.launcher.daemon.server.api.DaemonCommandExecution.proceed(DaemonCommandExecution.java:104)
	at org.gradle.launcher.daemon.server.exec.StartBuildOrRespondWithBusy$1.run(StartBuildOrRespondWithBusy.java:52)
	at org.gradle.launcher.daemon.server.DaemonStateCoordinator$1.run(DaemonStateCoordinator.java:297)
	at org.gradle.internal.concurrent.ExecutorPolicy$CatchAndRecordFailures.onExecute(ExecutorPolicy.java:64)
	at org.gradle.internal.concurrent.AbstractManagedExecutor$1.run(AbstractManagedExecutor.java:47)
Caused by: org.gradle.api.resources.MissingResourceException: Could not read script '/home/runner/work/voyager-rn/node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle' as it does not exist.
	at org.gradle.internal.resource.UriTextResource.getText(UriTextResource.java:154)
	at org.gradle.internal.resource.CachingTextResource.maybeFetch(CachingTextResource.java:112)
	at org.gradle.internal.resource.CachingTextResource.getContentHash(CachingTextResource.java:100)
	at org.gradle.groovy.scripts.internal.CrossBuildInMemoryCachingScriptClassCache.getOrCompile(CrossBuildInMemoryCachingScriptClassCache.java:46)
	at org.gradle.groovy.scripts.internal.BuildScopeInMemoryCachingScriptClassCompiler.compile(BuildScopeInMemoryCachingScriptClassCompiler.java:50)
	at org.gradle.groovy.scripts.DefaultScriptCompilerFactory$ScriptCompilerImpl.compile(DefaultScriptCompilerFactory.java:49)
	at org.gradle.configuration.DefaultScriptPluginFactory$ScriptPluginImpl.apply(DefaultScriptPluginFactory.java:112)
	at org.gradle.configuration.BuildOperationScriptPlugin$1.run(BuildOperationScriptPlugin.java:68)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:29)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:26)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:66)
	at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:166)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:59)
	at org.gradle.internal.operations.DefaultBuildOperationRunner.run(DefaultBuildOperationRunner.java:47)
	at org.gradle.configuration.BuildOperationScriptPlugin.lambda$apply$0(BuildOperationScriptPlugin.java:65)
	at org.gradle.internal.code.DefaultUserCodeApplicationContext.apply(DefaultUserCodeApplicationContext.java:43)
	at org.gradle.configuration.BuildOperationScriptPlugin.apply(BuildOperationScriptPlugin.java:65)
	at org.gradle.api.internal.plugins.DefaultObjectConfigurationAction.applyScript(DefaultObjectConfigurationAction.java:150)
	at org.gradle.api.internal.plugins.DefaultObjectConfigurationAction.access$000(DefaultObjectConfigurationAction.java:43)
	at org.gradle.api.internal.plugins.DefaultObjectConfigurationAction$1.run(DefaultObjectConfigurationAction.java:76)
	at org.gradle.api.internal.plugins.DefaultObjectConfigurationAction.execute(DefaultObjectConfigurationAction.java:184)
	at org.gradle.api.internal.project.AbstractPluginAware.apply(AbstractPluginAware.java:49)
	at org.gradle.api.internal.project.ProjectScript.apply(ProjectScript.java:37)
	at org.gradle.api.Script$apply.callCurrent(Unknown Source)
	at build_93pyivzj61i2ysygcv70b3ay7.run(/home/runner/work/voyager-rn/voyager-rn/android/app/build.gradle:6)
	at org.gradle.groovy.scripts.internal.DefaultScriptRunnerFactory$ScriptRunnerImpl.run(DefaultScriptRunnerFactory.java:91)
	... 263 more


BUILD FAILED in 22s
15 actionable tasks: 15 executed

📋 All ERROR lines:
Resolve mutations for :gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors (Thread[Execution worker,5,main]) started.
:gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors (Thread[Execution worker,5,main]) started.
> Task :gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors
    }
  }
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