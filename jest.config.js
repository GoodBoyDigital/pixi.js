export default {
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/lib/'],
    preset: 'ts-jest/presets/js-with-ts',
    runner: '@pixi/jest-electron/runner',
    testEnvironment: '@pixi/jest-electron/environment',
    setupFilesAfterEnv: [
        'jest-extended/all',
    ],
    globalSetup: '<rootDir>/scripts/jest/jest-global-setup.ts',
    globalTeardown: '<rootDir>/scripts/jest/jest-global-teardown.ts',
    transform: {
        '\\.worker.ts$': '@pixi/webworker-plugins/lib/jest-transform',
        '\\.vert$': 'jest-raw-loader',
        '\\.frag$': 'jest-raw-loader',
        '\\.wgsl$': 'jest-raw-loader',
    },
    moduleNameMapper: {
        '^worker:(.*)$': '$1',
        '^~/(.*)$': '<rootDir>/src/$1',
        '^@test-utils$': '<rootDir>/tests/utils/index.ts'
    },
    testMatch: ['**/?(*.)+(test)\\.ts'],
    snapshotResolver: '<rootDir>/scripts/jest/jest-snapshot-resolver.js',
    globals: {
        'ts-jest': {
            tsconfig: {
                module: 'ESNext',
                esModuleInterop: true,
            },
            diagnostics: false,
        },
    },
    collectCoverageFrom: [
        '<rootDir>/src/**/*.ts',
    ],
    coverageDirectory: '<rootDir>/dist/coverage',
    testTimeout: 10000
};
