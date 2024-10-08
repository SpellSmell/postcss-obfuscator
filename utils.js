const fs = require("fs");
const path = require("path");
const readline = require("readline");
const {createParser} = require('css-selector-parser');

const pluginName = "PostCSS Obfuscator";

function getRandomName(length) {
    // Generate a random string of characters with the specified length
    const randomString = Math.random()
        .toString(36)
        .substring(2, length - 1 + 2);
    // Combine the random string with a prefix to make it a valid class name (starts with a letter, contains only letters, digits, hyphens, and underscores)
    const randomLetter = String.fromCharCode(Math.floor(Math.random() * 26) + 97); // 97 is the ASCII code for lowercase 'a'
    return `${randomLetter}${randomString}`;
}

function simplifyString(str) {
    tempStr = str.replace(/[aeiouw\d_-]/gi, "");
    return tempStr.length < 1
        ? String.fromCharCode(Math.floor(Math.random() * 26) + 97) + tempStr
        : tempStr;
}

function writeJsonToFile(
    data,
    filePath,
    format = true,
    fresh = false,
    startOver = false
) {
    // If startOver is true, remove the directory path
    const dirPath = filePath.substring(0, filePath.lastIndexOf("/"));
    if (startOver) {
        if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, {recursive: true});
            logger("info", pluginName, "Directory removed:", dirPath);
        }
    }

    // Create the directory path if it doesn't exist
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {recursive: true});
        logger("info", pluginName, "Directory created:", dirPath);
    }

    // Create the file with an empty object as the default content
    fs.writeFileSync(filePath, "{}");
    logger("info", pluginName, "File created:", filePath);

    // Read the existing JSON data from the file
    let jsonData = fs.readFileSync(filePath);

    // Parse the existing JSON data
    let parsedData = JSON.parse(jsonData);

    // Merge the new data with the existing data
    const mergedData = fresh ? data : {...data, ...parsedData};

    // Write the merged data to the file
    const outputData = format
        ? JSON.stringify(mergedData, null, 2)
        : JSON.stringify(mergedData);
    fs.writeFileSync(filePath, outputData);
    logger("info", pluginName, "Data written to file:", filePath);
}

function replaceJsonKeysInFiles(
    filesDir,
    htmlExtensions,
    htmlExclude,
    jsonDataPath,
    indicatorStart,
    indicatorEnd,
    keepData
) {
    // Read and merge the JSON data
    const jsonData = {};
    fs.readdirSync(jsonDataPath).forEach((file) => {
        const filePath = path.join(jsonDataPath, file);
        const fileData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        Object.assign(jsonData, fileData);
    });

    // Read and process the files
    const replaceJsonKeysInFile = (filePath) => {
        const fileExt = path.extname(filePath).toLowerCase();
        if (fs.statSync(filePath).isDirectory()) {
            // Recursively process all files in subdirectories
            fs.readdirSync(filePath).forEach((subFilePath) => {
                replaceJsonKeysInFile(path.join(filePath, subFilePath));
            });
        } else if (
            htmlExtensions.includes(fileExt) &&
            !htmlExclude.includes(path.basename(filePath))
        ) {
            // Replace JSON keys in the file
            const fileContent = fs.readFileSync(filePath, "utf-8");
            fs.writeFileSync(filePath, replaceInString(jsonData, fileContent, fileExt, indicatorStart, indicatorEnd));
        }
        if (!keepData) {
            if (fs.existsSync(jsonDataPath)) {
                fs.rmSync(jsonDataPath, {recursive: true});
                logger("info", pluginName, "Data removed:", jsonDataPath);
            }
        }
    };

    // Process all files in the directory
    replaceJsonKeysInFile(filesDir);
}

function replaceInString(jsonData, content, extension, indicatorStart, indicatorEnd) {
    let result = content;

    Object.keys(jsonData).forEach((key) => {
        let keyUse = escapeRegExp(key.slice(1).replace(/\\/g, ""));
        let regex;
        regex = new RegExp(`([\\s\."'\\\\\`]|^)(${keyUse})(?=$|[\\s"'\\\\\`])`, 'g'); // match exact wording & avoid ` ' ""

        result = result.replace(regex, `$1` + jsonData[key].slice(1).replace(/\\\\/g, "")); // capture preceding space
        if (indicatorStart || indicatorEnd) {
            regex = new RegExp(`([\\s"'\\\`]|^)(${indicatorStart || ''}${keyUse})(?=$|[\\s"'\\\`])`, 'g');
            result = result.replace(regex, `$1` + jsonData[key].slice(1).replace(/\\/g, ""));
            regex = new RegExp(`([\\s"'\\\`]|^)(${keyUse}${indicatorEnd || ''})(?=$|[\\s"'\\\`])`, 'g');
            result = result.replace(regex, `$1` + jsonData[key].slice(1).replace(/\\/g, ""));
            regex = new RegExp(`([\\s"'\\\`]|^)(${indicatorStart || ''}${keyUse}${indicatorEnd || ''})(?=$|[\\s"'\\\`])`, 'g');
            result = result.replace(regex, `$1` + jsonData[key].slice(1).replace(/\\/g, ""));
        }
    });

    return result;
}

function replaceInSelector(selector, search, replace) {
    return selector.replace(search, replace);
}

function processSelector(selector, config = {}, idList = new Set(), jsonData = {}, singleFileData = {}, isFirstRun = true) {
    const {
        debug = false,
        length = 5,
        classIgnore = [],
        classInclude = [],
        classMethod = 'random',
        classPrefix = '',
        classSuffix = '',
        ids = false,
        idIgnore = [],
        idInclude = [],
        idMethod = 'random',
        idPrefix = '',
        idSuffix = '',
    } = config;

    let totalClassesCount = 0;
    let handledClassesCount = 0;
    let idsNo = 0;
    const classesInCssList = [];

    // get List of all classNames in the selector
    const classList = getClassNames(selector);
    classesInCssList.push(...classList.values())
    totalClassesCount += classList.size;
    if (isFirstRun) {
        for (const className of classInclude) {
            if (!classList.has(className)) {
                classList.add(className);
            }
        }
    }

    const classListArray = Array.from(classList);

    classListArray.sort().reverse().forEach((className) => {
        // Generate new className
        let oldClassName = "." + className;
        let newClassName;
        if (classIgnore.includes(className) || classMethod === 'none') {
            return;
        } else if (classInclude.length !== 0 && !classInclude.includes(className)) {
            return;
        } else if (classMethod === 'simple') {
            newClassName = simplifyString(className);
        } else {
            newClassName = getRandomName(length);
        }
        if (debug) {
            console.debug(`.${className} => .${newClassName}`);
        }

        handledClassesCount++;
        newClassName = `.${classPrefix}${newClassName}${classSuffix}`;
        const validCssClassName = '.' + escapeClassName(oldClassName.slice(1));
        //cond
        const octalValidCssClassName = '.' + octalizeClassName(oldClassName.slice(1));
        // If ClassName already exist replace with its value else generate new : the should have same name.
        if (jsonData.hasOwnProperty(oldClassName)) {
            selector = replaceInSelector(
                selector,
                validCssClassName,
                jsonData[oldClassName]
            );
            //cond
            selector = replaceInSelector(
                selector,
                octalValidCssClassName,
                jsonData[oldClassName]
            );
        } else {
            selector = replaceInSelector(selector, validCssClassName, newClassName);
            //cond
            selector = replaceInSelector(selector, octalValidCssClassName, newClassName);
            jsonData[oldClassName] = newClassName;
        }
        singleFileData[oldClassName] = newClassName;
    });
    if (ids) {
        idList = getIdNames(selector);
        if (isFirstRun) {
            for (const id of idInclude) {
                if (!idList.has(id)) {
                    idList.add(id);
                }
            }
        }

        idList.forEach((idName) => {
            idsNo++;
            // Get only idName not other elements or pseudo-element & remove spaces.
            let oldIdName = idName;
            // Generate new idName
            let newIdName;
            if (idIgnore.includes(idName) || idMethod === 'none') {
                newIdName = idName.splice(1);
            } else if (idInclude.length !== 0 && !idInclude.includes(idName)) {
                newIdName = idName.splice(1);
            } else if (idMethod === 'simple') {
                newIdName = simplifyString(idName);
            } else {
                newIdName = getRandomName(length);
            }
            newIdName = `#${idPrefix}${newIdName}${idSuffix}`;

            if (jsonData.hasOwnProperty(oldIdName)) {
                selector = replaceInSelector(selector, oldIdName, jsonData[oldIdName]);
            } else {
                selector = replaceInSelector(selector, oldIdName, newIdName);
                jsonData[oldIdName] = newIdName;
            }
            singleFileData[oldIdName] = newIdName;
        });
    }

    return {
        selector,
        classesInCssList,
        handledClassesCount,
        totalClassesCount,
        idsNo,
        jsonData,
        singleFileData,
    };
}

function copyDirectory(source, destination, copyHiddenFiles = false) {
    return new Promise((resolve, reject) => {
        // Create the destination directory if it doesn't exist
        if (!fs.existsSync(destination)) {
            fs.mkdirSync(destination);
        }

        // Get a list of all the files and directories in the source directory
        const files = fs.readdirSync(source);

        // Loop through the files and directories
        for (const file of files) {
            // Check if hidden file should be copied
            if (!copyHiddenFiles && file.startsWith(".")) {
                continue;
            }
            const sourcePath = path.join(source, file);
            const destPath = path.join(destination, file);

            // Check if the current item is a directory
            if (fs.statSync(sourcePath).isDirectory()) {
                // Recursively copy the directory
                copyDirectory(sourcePath, destPath);
            } else {
                // Copy the file
                fs.copyFileSync(sourcePath, destPath);
            }
        }

        // All files and directories have been copied
        resolve();
    });
}

function getFileCount(directoryPath, extensions, excludePathsOrFiles = []) {
    let count = 0;
    const files = fs.readdirSync(directoryPath);
    files.forEach((file) => {
        const filePath = path.join(directoryPath, file);
        const isExcluded = excludePathsOrFiles.some((excludePathOrFile) => {
            return (
                excludePathOrFile === file ||
                excludePathOrFile === filePath ||
                excludePathOrFile === path.basename(filePath)
            );
        });

        if (fs.statSync(filePath).isDirectory()) {
            count += getFileCount(filePath, extensions, excludePathsOrFiles);
        } else if (
            extensions.some((extension) => file.endsWith(extension)) &&
            !isExcluded
        ) {
            count++;
        }
    });
    return count;
}

function extractClassNames(obj) {
    const classNames = new Set();

    function traverse(node) {
        if (node.type === "ClassName") {
            classNames.add(node.name);
        }
        for (const key of Object.keys(node)) {
            const value = node[key];
            if (typeof value === "object" && value !== null) {
                if (Array.isArray(value)) {
                    value.forEach(traverse);
                } else {
                    traverse(value);
                }
            }
        }
    }

    traverse(obj);
    return classNames;
}

function escapeClassName(className) {
    // CSS escapes for some special characters
    const escapes = {
        '!': '\\!',
        '"': '\\"',
        '#': '\\#',
        '$': '\\$',
        '%': '\\%',
        '&': '\\&',
        '\'': '\\\'',
        '(': '\\(',
        ')': '\\)',
        '*': '\\*',
        '+': '\\+',
        ',': '\\,',
        '.': '\\.',
        '/': '\\/',
        ':': '\\:',
        ';': '\\;',
        '<': '\\<',
        '=': '\\=',
        '>': '\\>',
        '?': '\\?',
        '@': '\\@',
        '[': '\\[',
        '\\': '\\\\',
        ']': '\\]',
        '^': '\\^',
        '`': '\\`',
        '{': '\\{',
        '|': '\\|',
        '}': '\\}',
        '~': '\\~',
        ' ': '\\ ',
    };

    // Special handling for class names starting with a digit
    if (/^\d/.test(className)) {
        // Convert the first digit to its hexadecimal escape code
        const firstCharCode = className.charCodeAt(0).toString(16);
        const rest = className.slice(1);

        // Use the hexadecimal escape for the first character, followed by the rest of the class name
        // Note: A trailing space is added after the escape sequence to ensure separation
        return `\\${firstCharCode}${rest.split('').map(char => escapes[char] || char).join('')}`;
    }
    // Replace each special character with its escaped version for the rest of the class name
    return className.split('').map(char => escapes[char] || char).join('');
}

function octalizeClassName(className) {
    // Escape the first character if it's a digit or a special character
    let firstCharEscaped = '';
    if (/[\d>]/.test(className.charAt(0))) {
        const firstChar = className.charCodeAt(0).toString(16).toLowerCase();
        firstCharEscaped = `\\${firstChar}`;
    }

    // Escape other special characters in the rest of the className
    const restEscaped = className.slice(firstCharEscaped ? 1 : 0)
        .split('')
        .map(char => {
            if (/[!\"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/.test(char)) {
                // Directly escape special characters
                return `\\${char}`;
            }
            return char;
        })
        .join('');

    return firstCharEscaped + restEscaped;
}

function getClassNames(selectorStr) {
    // https://github.com/mdevils/css-selector-parser/issues/40
    // Avoid keyframe selectors: @keyframes, from, to, 0%, 100%. 50%
    const keyframeOrAtRuleRegex = /^(?:@|\d+|from|to)\b/;
    if (keyframeOrAtRuleRegex.test(selectorStr)) {
        return new Set(); // Return an empty set for ignored cases
    }

    // https://github.com/mdevils/css-selector-parser/issues/41
    // Remove '&' used for nesting in CSS, if present
    selectorStr = selectorStr.replace(/(^|\s+)&/g, '');

    const parse = createParser({syntax: 'progressive'});
    const ast = parse(selectorStr);
    return extractClassNames(ast);
}

function getIdNames(selectorStr) {
    let ids = selectorStr.replace(".#", " ").replace(".", " ").trim().split(" ");
    ids = ids.filter((id) => id.charAt(0) == "#");
    return ids;
}

function logger(type, issuer, task, data) {
    const mainColor = "\x1b[38;2;99;102;241m%s\x1b[0m";
    switch (type) {
        case "info":
            console.info(mainColor, issuer, "\x1b[36m", task, data, "\x1b[0m");
            break;
        case "warn":
            console.warn(mainColor, issuer, "\x1b[33m", task, data, "\x1b[0m");
            break;
        case "error":
            console.error(mainColor, issuer, "\x1b[31m", task, data, "\x1b[0m");
            break;
        case "success":
            console.log(mainColor, issuer, "\x1b[32m", task, data, "\x1b[0m");
            break;
        default:
            console.log("'\x1b[0m'", issuer, task, data, "\x1b[0m");
            break;
    }
}

function getRelativePath(absolutePath) {
    const currentDirectory = process.cwd();
    const relativePath = path.relative(currentDirectory, absolutePath);
    return relativePath;
}

function isFileOrInDirectory(paths, filePath) {
    const resolvedFilePath = filePath.replace(/\\/g, "/"); // Replace backslashes with forward slashes

    for (const currentPath of paths) {
        const resolvedCurrentPath = currentPath.replace(/\\/g, "/"); // Replace backslashes with forward slashes

        if (resolvedCurrentPath === resolvedFilePath) {
            // The path is one of the items in the array, so it's a file or directory
            return true;
        }

        if (
            resolvedCurrentPath.endsWith("/") &&
            resolvedFilePath.startsWith(resolvedCurrentPath)
        ) {
            // The current path is a directory, so check whether the file is inside it
            const relativeFilePath = resolvedFilePath.substr(
                resolvedCurrentPath.length
            );

            if (!relativeFilePath.startsWith("/") && relativeFilePath !== "") {
                // The file is inside the directory
                return true;
            }
        }
    }

    return false;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

async function findFiles(dir, extension) {
    const results = [];
    const files = await fs.promises.readdir(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fs.promises.stat(fullPath);

        if (stat.isDirectory()) {
            const subDirResults = await findFiles(fullPath, extension);
            results.push(...subDirResults);
        } else {
            if (path.extname(file) === '.' + extension) {
                results.push(fullPath);
            }
        }
    }

    return results;
}

module.exports = {
    getRandomName,
    simplifyString,
    writeJsonToFile,
    copyDirectory,
    replaceJsonKeysInFiles,
    getFileCount,
    getClassNames,
    getIdNames,
    logger,
    getRelativePath,
    isFileOrInDirectory,
    escapeClassName,
    octalizeClassName,
    findFiles,
    replaceInString,
    replaceInSelector,
    processSelector,
};
