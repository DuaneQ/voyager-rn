const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Fix font file handling - treat as raw assets
  config.module.rules.forEach(rule => {
    if (rule.oneOf) {
      rule.oneOf.forEach(oneOfRule => {
        if (oneOfRule.test && oneOfRule.test.toString().includes('ttf')) {
          // Force fonts to be loaded as files without transformation
          oneOfRule.type = 'asset/resource';
          oneOfRule.generator = {
            filename: 'static/media/[name].[hash:8][ext]'
          };
        }
      });
    }
  });

  return config;
};
