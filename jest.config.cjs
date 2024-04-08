module.exports = {
    preset: "ts-jest",
    testEnvironment: "jsdom",
    testMatch: ["**/test/**/*.test.ts"],
    moduleDirectories: ["node_modules", "src"],
};
