package expo.modules.gradle

import org.gradle.api.Plugin
import org.gradle.api.Project

class ExpoModuleGradlePlugin implements Plugin<Project> {
  void apply(Project project) {
    try {
      // repo root is parent of android/ (settings.gradle lives in android/)
      def repoRoot = project.rootProject.projectDir.parentFile ?: project.rootProject.projectDir

      def nodeHelper = new File(repoRoot, "node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle")
      def repoHelper = new File(repoRoot, "expo-gradle-helpers/ExpoModulesCorePlugin.gradle")

      if (nodeHelper.exists()) {
        project.logger.lifecycle("[included-build plugin] Applying ExpoModulesCorePlugin from node_modules: ${nodeHelper}")
        project.apply from: nodeHelper
      } else if (repoHelper.exists()) {
        project.logger.lifecycle("[included-build plugin] Applying ExpoModulesCorePlugin from repo fallback: ${repoHelper}")
        project.apply from: repoHelper
      } else {
        project.logger.lifecycle('[included-build plugin] No ExpoModulesCorePlugin helper found (node_modules or repo fallback)')
      }

      // Try to call the known helper ext functions if they are defined by the helper script.
      // Call a superset of helpers observed in upstream Expo to better reproduce plugin wiring
      try { project.applyKotlinExpoModulesCorePlugin() } catch (e) { /* no-op */ }
      try { project.applyKspJvmToolchain() } catch (e) { /* no-op */ }
      try { project.useDefaultAndroidSdkVersions() } catch (e) { /* no-op */ }
      try { project.useCoreDependencies() } catch (e) { /* no-op */ }
      try { project.useExpoPublishing() } catch (e) { /* no-op */ }
      // Try to apply KSP and related Kotlin plugins so annotation processing/codegen runs
      try {
        project.logger.lifecycle('[included-build plugin] Attempting to apply KSP and kapt plugins')
        // pluginManager.apply is safer inside included-build context
        project.pluginManager.apply('com.google.devtools.ksp')
      } catch (e) {
        project.logger.info('[included-build plugin] KSP plugin not available to apply: ' + e)
      }
      try {
        project.pluginManager.apply('kotlin-kapt')
      } catch (e) {
        project.logger.info('[included-build plugin] kotlin-kapt plugin not available to apply: ' + e)
      }

      // Add included-build shims (generated/stub sources) to each module's sourceSets so
      // modules in node_modules can compile even when upstream KSP-generated sources are
      // not available. We keep this defensive and only add the directory if it exists.
      try {
        def shimDir = new File(repoRoot, "android/expo-module-gradle-plugin/src/shims")
        if (shimDir.exists()) {
          project.logger.lifecycle("[included-build plugin] Adding shim sources from: ${shimDir}")
          project.android.sourceSets.each { ss ->
            ss.java.srcDirs += shimDir
          }
        }
      } catch (e) {
        project.logger.warn("[included-build plugin] Failed to add shim sources: ${e}")
      }
    } catch (e) {
      project.logger.warn("[included-build plugin] Failed to apply ExpoModulesCorePlugin helper: ${e}")
    }
  }
}
