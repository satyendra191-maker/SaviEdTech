/**
 * Global Polyfills for the Browser
 * This file should be imported at the very top of the root layout.
 */

if (typeof window !== 'undefined') {
    // 1. Polyfill global
    if (!(window as any).global) {
        (window as any).global = window;
    }

    // 2. Polyfill process
    if (!(window as any).process) {
        (window as any).process = {
            env: { NODE_ENV: 'development' },
            browser: true,
            version: '',
            nextTick: (fn: Function) => setTimeout(fn, 0),
        };
    }

    // 3. Polyfill Buffer
    if (!(window as any).Buffer) {
        // Use a simple mock that allows basic checks like isBuffer
        (window as any).Buffer = {
            isBuffer: (obj: any) => obj && obj._isBuffer,
            from: () => [],
            alloc: () => [],
            concat: () => [],
        };
    }
}

export {};
