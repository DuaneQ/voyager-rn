/**
 * React Native Fetch Replacement with Axios
 * 
 * Fixes "Exception in HostFunction: Expected argument 7 of method 'sendRequest' to be a number, but got undefined"
 * 
 * This error occurs in React Native 0.79.x on Android due to a bug in the native networking module.
 * The bug is fixed in RN 0.80+ but Expo SDK 54 doesn't support 0.80+.
 * 
 * Solution: Replace fetch() with axios on Android to bypass the broken native networking module.
 */

import { Platform } from 'react-native';
import axios from 'axios';

if (Platform.OS === 'android') {
  const originalFetch = global.fetch;
  
  /**
   * Axios-based fetch replacement for Android
   */
  global.fetch = async function(url, options = {}) {
    const urlString = typeof url === 'string' ? url : url.url;
    

    
    // Skip our replacement for symbolicate requests (let original fetch handle these)
    if (urlString.includes('/symbolicate')) {
      return originalFetch.call(this, url, options);
    }
    
    // Skip our replacement for file:// URIs (let original fetch handle local files)
    if (urlString.startsWith('file://')) {
      return originalFetch.call(this, url, options);
    }
    
    try {
      // Convert fetch options to axios config
      const axiosConfig = {
        url: urlString,
        method: (options.method || 'GET').toLowerCase(),
        headers: options.headers || {},
        timeout: 60000, // Always set timeout to avoid Android "argument 7" error
        validateStatus: () => true, // Accept all status codes, handle errors manually
      };
      
      // Add body if present
      if (options.body) {
        if (typeof options.body === 'string') {
          axiosConfig.data = options.body;
        } else {
          axiosConfig.data = options.body;
        }
      }
      
      // Make request with axios
      const response = await axios(axiosConfig);
      
      // Convert axios response to fetch Response format
      const headers = new Headers();
      Object.keys(response.headers).forEach(key => {
        headers.append(key, response.headers[key]);
      });
      
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        headers,
        url: urlString,
        json: async () => response.data,
        text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
        blob: async () => new Blob([JSON.stringify(response.data)]),
        arrayBuffer: async () => new ArrayBuffer(0),
        formData: async () => new FormData(),
        clone: function() { return this; },
      };
    } catch (error) {
      // Convert axios error to fetch-style error
      if (error.response) {
        // Server responded with error status
        const headers = new Headers();
        Object.keys(error.response.headers || {}).forEach(key => {
          headers.append(key, error.response.headers[key]);
        });
        
        return {
          ok: false,
          status: error.response.status,
          statusText: error.response.statusText,
          headers,
          url: urlString,
          json: async () => error.response.data,
          text: async () => JSON.stringify(error.response.data),
          blob: async () => new Blob([JSON.stringify(error.response.data)]),
          arrayBuffer: async () => new ArrayBuffer(0),
          formData: async () => new FormData(),
          clone: function() { return this; },
        };
      }
      
      // Network error or request setup error
      throw new TypeError(`Network request failed: ${error.message}`);
    }
  };

  /**
   * Patch XMLHttpRequest.send() to ensure timeout is always set
   * This fixes Google Places Autocomplete which uses XMLHttpRequest internally
   */
  const OriginalXMLHttpRequest = global.XMLHttpRequest;
  
  class PatchedXMLHttpRequest extends OriginalXMLHttpRequest {
    constructor() {
      super();
      // Set default timeout if not already set
      if (!this.timeout) {
        this.timeout = 60000; // 60 seconds default
      }
    }
    
    open(method, url, async, user, password) {
      return super.open(method, url, async, user, password);
    }
    
    send(body) {
      // Ensure timeout is always set before sending (critical fix for Android)
      if (!this.timeout || this.timeout === 0) {
        this.timeout = 60000;
      }
      return super.send(body);
    }
  }
  
  global.XMLHttpRequest = PatchedXMLHttpRequest;
}
