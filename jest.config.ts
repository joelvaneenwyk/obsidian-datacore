/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',

    // Indicates whether each individual test should be reported during the run
    verbose: true,

    roots: [
        '<rootDir>/src',
    ],

    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },

    moduleDirectories: [
        'node_modules',
        'src'
    ],

    // An array of file extensions your modules use
    moduleFileExtensions: [
        "js",
        "mjs",
        "cjs",
        "ts",
        "tsx"
    ],

    testRegex: ".*(test|spec)\\.ts$",
};

export default config;
