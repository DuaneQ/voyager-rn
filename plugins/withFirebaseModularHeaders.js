/**
 * Expo Config Plugin: Fix React Native Firebase build errors on Expo SDK 54
 * 
 * Issue: https://github.com/invertase/react-native-firebase/issues/8657
 * 
 * This plugin applies necessary Xcode build settings to make React Native Firebase
 * compatible with Expo SDK 54 / React Native 0.81.
 * 
 * Specifically:
 * - Sets CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES
 *   (Fixes gRPC-Core module map errors)
 * - Adds $RNFirebaseAsStaticFramework = true flag
 *   (Required for React Native Firebase with use_modular_headers!)
 */

const { withPodfile } = require('@expo/config-plugins');

function applyImplementation(contents, find, add, addBefore = false) {
  // Make sure the project does not have the settings already
  if (!contents.includes(add)) {
    if (addBefore) {
      return contents.replace(find, `${add}\n${find}`);
    }
    return contents.replace(find, `${find}\n${add}`);
  }

  return contents;
}

module.exports = function withFirebaseModularHeaders(config) {
  return withPodfile(config, (config) => {
    let { contents } = config.modResults;

    // 1. Add use_modular_headers! (required for React Native Firebase)
    contents = applyImplementation(
      contents,
      'target \'TravalPass\' do',
      '  use_modular_headers!'
    );

    // 2. Add Firebase static framework flag (before use_frameworks!)
    contents = applyImplementation(
      contents,
      "use_frameworks! :linkage => ENV['USE_FRAMEWORKS'].to_sym if ENV['USE_FRAMEWORKS']",
      '  $RNFirebaseAsStaticFramework = true',
      true // add BEFORE the find string
    );

    // 3. Add CLANG_ALLOW_NON_MODULAR_INCLUDES build setting in post_install
    // This fixes the gRPC-Core module map errors
    // Insert AFTER post_install do |installer|
    const rubyCode = `
    # Add CLANG_ALLOW_NON_MODULAR_INCLUDES to all targets
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings["CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "YES"
        
        # Fix FirebaseAuth Swift header issue
        if target.name == 'FirebaseAuth'
          config.build_settings['DEFINES_MODULE'] = 'YES'
          config.build_settings['SWIFT_VERSION'] = '5.0'
        end
      end
    end
    
    # Comment out problematic Swift header import
    firebase_h_path = File.join(installer.sandbox.root, 'Headers', 'Private', 'Firebase', 'Firebase.h')
    if File.exist?(firebase_h_path)
      firebase_h_content = File.read(firebase_h_path)
      modified_content = firebase_h_content.gsub(
        '#import <FirebaseAuth/FirebaseAuth-Swift.h>',
        '// #import <FirebaseAuth/FirebaseAuth-Swift.h> // Commented out for RN Firebase compatibility'
      )
      File.write(firebase_h_path, modified_content) if modified_content != firebase_h_content
    end
`;
    
    contents = applyImplementation(
      contents,
      '  post_install do |installer|',
      rubyCode
    );

    config.modResults.contents = contents;
    return config;
  });
};
