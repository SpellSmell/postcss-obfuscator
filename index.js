const {
    writeJsonToFile,
    copyDirectory,
    replaceJsonKeysInFiles,
    getFileCount,
    logger,
    getRelativePath,
    isFileOrInDirectory,
    processSelector,
} = require("./utils");
const path = require("path");

const pluginName = "PostCSS Obfuscator";
const pluginVersion = "V 1.6.0 Beta";
const pluginWebSite = "https://github.com/n4j1Br4ch1D/postcss-obfuscator";
const pluginHead = `     __                    ${pluginName}                     __     
    (oo)                     ${pluginVersion}                        (xx)    
   //||\\\\   ${pluginWebSite}   //||\\\\   
 ======================================================================> `;
const defaultOptions = {
    enable: true, // Enable plugin
    debug: false,
    length: 5, // Random  name length.
    classMethod: "random", // 'random', 'simple', 'none' obfuscation method for classes.
    classPrefix: "", // ClassName prefix.
    classSuffix: "", // ClassName suffix.
    classIgnore: [], // Class to ignore from obfuscation.
    classInclude: [],
    ids: false, //  Obfuscate #IdNames.
    idMethod: "random", // 'random', 'simple', 'none' obfuscation method for ids .
    idPrefix: "", // idName Prefix.
    idSuffix: "", // idName suffix.
    idIgnore: [], // Ids to ignore from obfuscation.
    idInclude: [],
    indicatorStart: null, // Identify ids & classes by the preceding string.
    indicatorEnd: null, // Identify ids & classes by the following string.
    jsonsPath: "css-obfuscator", // Path and file name where to save obfuscation data.
    srcPath: "src", // Source of your files.
    desPath: "out", // Destination for obfuscated html/js/.. files. Be careful using the same directory as your src(you will lose your original files).
    extensions: ['.html'], // Extesnion of files you want osbfucated ['.html', '.php', '.js', '.svelte'].
    htmlExcludes: [], // Files and paths to exclude from html obfuscation replacement.
    cssExcludes: [], // Files and paths to exclude from css obfuscation.
    fresh: false, // Create new obfuscation data list or use already existed one (to keep production cache or prevent data scrapping).
    multi: false, // Generate obsfucated data file for each css file.
    differMulti: false, // Generate different Random names for each file.
    formatJson: false, // Format obfuscation data JSON file.
    showConfig: false, // Show config on terminal when runinng.
    keepData: true, // Keep or delete Data after obfuscation is finished?
    preRun: () => Promise.resolve(), // do something before the plugin runs.
    callBack: function () {
    }, // Callback function to call after obfuscation is done.
};
let data = {};
let jsonData = {};
let singleFileData = {};
let processedFiles = new Set();
let idList = new Set();
let cssNo = 0;
let handledClassesCount = 0;
let totalClassesCount = 0;
let idsNo = 0;
let isFirstRun = true;
const classesInCssList = [];
const envMode = process.env.NODE_ENV;

module.exports = (options = {}) => {
    // Get Final Option By Merging the default and user-defined options
    const {
        enable,
        debug,
        length,
        classMethod,
        classPrefix,
        classSuffix,
        classIgnore,
        classInclude,
        ids,
        idMethod,
        idPrefix,
        idSuffix,
        idIgnore,
        idInclude,
        indicatorStart,
        indicatorEnd,
        jsonsPath,
        srcPath,
        desPath,
        extensions,
        htmlExcludes,
        cssExcludes,
        fresh,
        multi,
        differMulti,
        formatJson,
        showConfig,
        keepData,
        preRun,
        callBack,
    } = {...defaultOptions, ...options};
    return {
        postcssPlugin: pluginName,
        Once: async (root, {result}) => {
            // Add the file path to the set of processed files
            if (!enable) {
                return;
            } else {
                await preRun();
                if (processedFiles.size == 0) {
                    console.log("\x1b[48;2;103;113;210m%s\x1b[0m", pluginHead);
                    if (envMode === "dev" || envMode === "development") {
                        logger(
                            "warn",
                            pluginName,
                            "Warning:",
                            "You are Running in Dev Mode!"
                        );
                    }
                    if (srcPath === desPath) {
                        logger(
                            "warn",
                            pluginName,
                            "Warning:",
                            "Are You Sure You wanna Replace this file This my cause you loose your surce data please specify antother folder"
                        );
                    }
                    cssFilesNo = getFileCount(srcPath, [".css"], cssExcludes);
                    if (showConfig) {
                        console.info("\x1b[34m", "Plug", "\x1b[36m", "Config:", {
                            ...defaultOptions,
                            ...options,
                        });
                    }
                    logger("info", pluginName, "PreRun:", "PreRun event hook finished.");
                }
                let cssFile = getRelativePath(result.opts.from);
                if (isFileOrInDirectory(cssExcludes, cssFile)) {
                    logger("info", pluginName, "Ignoring:", cssFile);
                    return;
                }
                cssNo++;
                logger("info", pluginName, "processing:", cssFile);
                if (envMode === "dev" || envMode === "development") {
                    root.prepend({
                        text: `                              __     
                                (oo) 
                               //||\\\\  
                         ${pluginName}
                           ${pluginVersion}
          ${pluginWebSite}
             **     this only appears on Dev Mode     **        
`,
                    });
                }
                singleFileData = {};
                if (multi) {
                    data = singleFileData;
                    if (differMulti) {
                        data = singleFileData;
                    } else {
                        data = jsonData;
                    }
                } else {
                    data = jsonData;
                }
                root.walkRules((rule) => {
                    rule.selectors = rule.selectors.map((selector) => {
                        const config = {
                            debug,
                            length,
                            classIgnore,
                            classInclude,
                            classMethod,
                            classPrefix,
                            classSuffix,
                            ids,
                            idIgnore,
                            idInclude,
                            idMethod,
                            idPrefix,
                            idSuffix,
                        };

                        const result = processSelector(selector, config, idList, jsonData, singleFileData, isFirstRun);
                        classesInCssList.push(...result.classesInCssList);
                        handledClassesCount += result.handledClassesCount;
                        totalClassesCount += result.totalClassesCount;
                        idsNo += result.idsNo;
                        isFirstRun = false;

                        return result.selector;
                    });
                });
                jsonData = {...jsonData, ...singleFileData};
                const fileName = path.basename(root.source.input.file, ".css");
                // If mult & keep same get and replace.
                const newjsonsPath = `${jsonsPath}/${multi ? fileName : "main"}.json`;
                writeJsonToFile(data, newjsonsPath, formatJson, fresh, !multi & fresh);
                const desPaths = Array.isArray(desPath) ? desPath : [desPath];
                if (cssNo == cssFilesNo) {
                    const replaceInDesPath = destinationPath => {
                        replaceJsonKeysInFiles(
                            destinationPath,
                            extensions,
                            htmlExcludes,
                            jsonsPath,
                            indicatorStart,
                            indicatorEnd,
                            keepData
                        );
                        logger(
                            "info",
                            pluginName,
                            "Replacing:",
                            `All files have been updated!`
                        );
                        logger(
                            "success",
                            pluginName,
                            "Processed:",
                            `${cssFilesNo}/${getFileCount(
                                srcPath,
                                [".css"],
                                []
                            )} CSS | ${getFileCount(
                                destinationPath,
                                extensions,
                                htmlExcludes
                            )}/${getFileCount(destinationPath, extensions, [])} Files| ${
                                handledClassesCount - classIgnore.length
                            }/${totalClassesCount} Class | ${idsNo - idIgnore.length}/${idsNo} Id`
                        );
                        callBack();
                        console.info(
                            "\x1b[38;2;99;102;241m%s\x1b[0m",
                            "==========================================================================>",
                            "\x1b[0m"
                        );
                    };

                    if (Array.isArray(desPath)) {
                        for (const destinationPath of desPath) {
                            logger(
                                "info",
                                pluginName,
                                `Replacing in directory: ${destinationPath}`,
                                `started!`
                            );

                            replaceInDesPath(destinationPath);
                        }
                    } else {
                        copyDirectory(srcPath, desPath, true)
                            .then(() => {
                                logger(
                                    "info",
                                    pluginName,
                                    "Copying:",
                                    `${srcPath} to ${desPath} finished!`
                                );

                                replaceInDesPath(desPath);
                            })
                            .catch((error) => {
                                logger(
                                    "error",
                                    pluginName,
                                    "Error copying directory:",
                                    error.message
                                );
                            });
                    }

                    if (classInclude.length > 0) {
                        const notSpecifiedInCssClasses = classInclude.filter(className => !classesInCssList.includes(className));

                        if (notSpecifiedInCssClasses.length > 0) {
                            logger(
                                'info',
                                pluginName,
                                `${notSpecifiedInCssClasses.length} css classes was obfuscated, nut not specified in css: `,
                                notSpecifiedInCssClasses.join(', '),
                            );
                        }
                    }
                }
            }
            processedFiles.add(jsonsPath);
        },
    };
};

module.exports.postcss = true;
