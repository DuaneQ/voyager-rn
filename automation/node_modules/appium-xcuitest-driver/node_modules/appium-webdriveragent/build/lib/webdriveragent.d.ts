export default WebDriverAgent;
export class WebDriverAgent {
    constructor(xcodeVersion: any, args?: {}, log?: null);
    xcodeVersion: any;
    args: {};
    log: import("@appium/types").AppiumLogger;
    device: any;
    platformVersion: any;
    platformName: any;
    iosSdkVersion: any;
    host: any;
    isRealDevice: boolean;
    idb: any;
    wdaBundlePath: any;
    wdaLocalPort: any;
    wdaRemotePort: any;
    wdaBaseUrl: any;
    prebuildWDA: any;
    webDriverAgentUrl: any;
    started: boolean;
    wdaConnectionTimeout: any;
    useXctestrunFile: any;
    usePrebuiltWDA: any;
    derivedDataPath: any;
    mjpegServerPort: any;
    updatedWDABundleId: any;
    usePreinstalledWDA: any;
    xctestApiClient: any;
    xcodebuild: XcodeBuild | null;
    /**
     * Return true if the session does not need xcodebuild.
     * @returns {boolean} Whether the session needs/has xcodebuild.
     */
    get canSkipXcodebuild(): boolean;
    /**
     *
     * @returns {string} Bundle ID for Xctest.
     */
    get bundleIdForXctest(): string;
    setWDAPaths(bootstrapPath: any, agentPath: any): void;
    bootstrapPath: any;
    agentPath: any;
    cleanupObsoleteProcesses(): Promise<void>;
    /**
     * Return boolean if WDA is running or not
     * @return {Promise<boolean>} True if WDA is running
     * @throws {Error} If there was invalid response code or body
     */
    isRunning(): Promise<boolean>;
    get basePath(): any;
    /**
     * Return current running WDA's status like below
     * {
     *   "state": "success",
     *   "os": {
     *     "name": "iOS",
     *     "version": "11.4",
     *     "sdkVersion": "11.3"
     *   },
     *   "ios": {
     *     "simulatorVersion": "11.4",
     *     "ip": "172.254.99.34"
     *   },
     *   "build": {
     *     "time": "Jun 24 2018 17:08:21",
     *     "productBundleIdentifier": "com.facebook.WebDriverAgentRunner"
     *   }
     * }
     *
     * @return {Promise<any?>} State Object
     * @throws {Error} If there was invalid response code or body
     */
    getStatus(): Promise<any | null>;
    /**
     * Uninstall WDAs from the test device.
     * Over Xcode 11, multiple WDA can be in the device since Xcode 11 generates different WDA.
     * Appium does not expect multiple WDAs are running on a device.
     */
    uninstall(): Promise<void>;
    _cleanupProjectIfFresh(): Promise<void>;
    /**
     * Launch WDA with preinstalled package without xcodebuild.
     * @param {string} sessionId Launch WDA and establish the session with this sessionId
     * @return {Promise<any?>} State Object
     */
    launchWithPreinstalledWDA(sessionId: string): Promise<any | null>;
    /**
     * Return current running WDA's status like below after launching WDA
     * {
     *   "state": "success",
     *   "os": {
     *     "name": "iOS",
     *     "version": "11.4",
     *     "sdkVersion": "11.3"
     *   },
     *   "ios": {
     *     "simulatorVersion": "11.4",
     *     "ip": "172.254.99.34"
     *   },
     *   "build": {
     *     "time": "Jun 24 2018 17:08:21",
     *     "productBundleIdentifier": "com.facebook.WebDriverAgentRunner"
     *   }
     * }
     *
     * @param {string} sessionId Launch WDA and establish the session with this sessionId
     * @return {Promise<any?>} State Object
     * @throws {Error} If there was invalid response code or body
     */
    launch(sessionId: string): Promise<any | null>;
    set url(arg: any);
    get url(): any;
    startWithIDB(): Promise<any>;
    parseBundleId(wdaBundlePath: any): Promise<any>;
    prepareWDA(): Promise<{
        wdaBundleId: any;
        testBundleId: any;
        wdaBundlePath: string;
    }>;
    fetchWDABundle(): Promise<string>;
    isSourceFresh(): Promise<boolean>;
    setupProxies(sessionId: any): void;
    jwproxy: JWProxy | undefined;
    proxyReqRes: any;
    noSessionProxy: NoSessionProxy | undefined;
    quit(): Promise<void>;
    _url: any;
    set fullyStarted(arg: boolean);
    get fullyStarted(): boolean;
    retrieveDerivedDataPath(): Promise<any>;
    /**
     * Reuse running WDA if it has the same bundle id with updatedWDABundleId.
     * Or reuse it if it has the default id without updatedWDABundleId.
     * Uninstall it if the method faces an exception for the above situation.
     */
    setupCaching(): Promise<void>;
    /**
     * Quit and uninstall running WDA.
     */
    quitAndUninstall(): Promise<void>;
}
import XcodeBuild from './xcodebuild';
import { JWProxy } from '@appium/base-driver';
import { NoSessionProxy } from './no-session-proxy';
//# sourceMappingURL=webdriveragent.d.ts.map