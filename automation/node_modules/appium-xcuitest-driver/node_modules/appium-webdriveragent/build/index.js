"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WDA_BASE_URL = exports.PROJECT_FILE = exports.WDA_RUNNER_BUNDLE_ID = exports.BOOTSTRAP_PATH = exports.resetTestProcesses = exports.bundleWDASim = exports.checkForDependencies = exports.NoSessionProxy = exports.WebDriverAgent = void 0;
const dependencies = __importStar(require("./lib/check-dependencies"));
const proxies = __importStar(require("./lib/no-session-proxy"));
const driver = __importStar(require("./lib/webdriveragent"));
const constants = __importStar(require("./lib/constants"));
const utils = __importStar(require("./lib/utils"));
const { checkForDependencies, bundleWDASim } = dependencies;
exports.checkForDependencies = checkForDependencies;
exports.bundleWDASim = bundleWDASim;
const { NoSessionProxy } = proxies;
exports.NoSessionProxy = NoSessionProxy;
const { WebDriverAgent } = driver;
exports.WebDriverAgent = WebDriverAgent;
const { WDA_BASE_URL, WDA_RUNNER_BUNDLE_ID, PROJECT_FILE } = constants;
exports.WDA_BASE_URL = WDA_BASE_URL;
exports.WDA_RUNNER_BUNDLE_ID = WDA_RUNNER_BUNDLE_ID;
exports.PROJECT_FILE = PROJECT_FILE;
const { resetTestProcesses, BOOTSTRAP_PATH } = utils;
exports.resetTestProcesses = resetTestProcesses;
exports.BOOTSTRAP_PATH = BOOTSTRAP_PATH;
//# sourceMappingURL=index.js.map