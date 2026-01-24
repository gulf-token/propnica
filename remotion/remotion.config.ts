import { Config } from '@remotion/cli/config';
import { enableTailwind } from '@remotion/tailwind';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// Enable Tailwind for Remotion
Config.overrideWebpackConfig((currentConfiguration) => {
  return enableTailwind(currentConfiguration);
});

// Set default codec
Config.setCodec('h264');

// Set quality
Config.setQuality(90);

// Concurrency for rendering
Config.setConcurrency(4);

// Log level
Config.setLogLevel('info');

// Enable Chrome sandbox (required for some environments)
Config.setChromiumDisableWebSecurity(true);

// Browser executable
// Config.setBrowserExecutable('/path/to/chrome');
