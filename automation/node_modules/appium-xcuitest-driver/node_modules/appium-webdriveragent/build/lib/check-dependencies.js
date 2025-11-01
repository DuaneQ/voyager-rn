"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bundleWDASim = exports.checkForDependencies = void 0;
const support_1 = require("@appium/support");
const lodash_1 = __importDefault(require("lodash"));
const teen_process_1 = require("teen_process");
const path_1 = __importDefault(require("path"));
const xcodebuild_1 = __importDefault(require("./xcodebuild"));
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const logger_1 = __importDefault(require("./logger"));
async function buildWDASim() {
    const args = [
        '-project', path_1.default.join(utils_1.BOOTSTRAP_PATH, 'WebDriverAgent.xcodeproj'),
        '-scheme', constants_1.WDA_SCHEME,
        '-sdk', constants_1.SDK_SIMULATOR,
        'CODE_SIGN_IDENTITY=""',
        'CODE_SIGNING_REQUIRED="NO"',
        'GCC_TREAT_WARNINGS_AS_ERRORS=0',
    ];
    await (0, teen_process_1.exec)('xcodebuild', args);
}
// eslint-disable-next-line require-await
async function checkForDependencies() {
    logger_1.default.debug('Dependencies are up to date');
    return false;
}
exports.checkForDependencies = checkForDependencies;
async function bundleWDASim(xcodebuild) {
    if (xcodebuild && !lodash_1.default.isFunction(xcodebuild.retrieveDerivedDataPath)) {
        xcodebuild = new xcodebuild_1.default('', {});
    }
    const derivedDataPath = await xcodebuild.retrieveDerivedDataPath();
    const wdaBundlePath = path_1.default.join(derivedDataPath, 'Build', 'Products', 'Debug-iphonesimulator', constants_1.WDA_RUNNER_APP);
    if (await support_1.fs.exists(wdaBundlePath)) {
        return wdaBundlePath;
    }
    await buildWDASim();
    return wdaBundlePath;
}
exports.bundleWDASim = bundleWDASim;
//# sourceMappingURL=check-dependencies.js.map