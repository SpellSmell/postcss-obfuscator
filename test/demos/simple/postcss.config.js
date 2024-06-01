const obfuscator = require('../../index');

// Check if in development mode
const isDevMode = process.env.NODE_ENV === 'development'; //production

// config
const options = {
  enable: isDevMode, // Run on Dev Env
  length: 5, // Random  name length
  classMethod: 'random', // 'random', 'simple', 'none' obfuscation method for classes
  classPrefix: "c-", // ClassName prefix
  classSuffix: "-c", // ClassName suffix
  classIgnore: ['red'], // Class to ignore from obfuscation
  ids: true, //  Obfuscate #IdNames
  idMethod: 'random', // 'random', 'simple', 'none' obfuscation method for ids 
  idPrefix: "i-", // idName Prefix
  idSuffix: "-i", // idName suffix
  idIgnore: [], // Ids to ignore from obfuscation
  indicatorStart: null, // Identify ids & classes by the preceding string.
  indicatorEnd: null, // Identify ids & classes by the following string.
  jsonsPath: "test\\demo\\css-obfuscator", // Path and file name where to save obfuscation data.
  srcPath: "test\\demo\\src", // Source of your files.
  desPath: "test\\demo\\out", // Destination for obfuscated html/js/.. files. Be careful using the same directory as your src(you will lose your original files).
  extensions: ['.html', '.htm'], // Extesnion of files you want osbfucated ['.html', '.php', '.js', '.svelte']
  htmlExcludes: ['404.html'], // Files and paths to exclude from html obfuscation replacement
  cssExcludes: ['test\\demo\\src\\css\\exclude.css', 'test\\demo\\src\\css\\top\\'], // Files and paths to exclude from css obfuscation
  fresh: false, // Create new obfuscation data list or use already existed one (to keep production cache or prevent data scrapping).
  multi: false, // Generate obsfucated data file for each css file.
  differMulti: false, // Generate different Random names for each file.
  formatJson: true, // Format obfuscation data JSON file.
  showConfig: false, // Show config on terminal when runinng
  keepData: true,  // Keep or delete Data after obfuscation is finished?
  // preRun: () => Promise.resolve(), // do something before the plugin runs.
  // callBack: function () {console.log("Call Me back! ;)");} // Callback function to call after obfuscation is done.
};

module.exports = {
    plugins: [
      obfuscator(options),
    ],
}
