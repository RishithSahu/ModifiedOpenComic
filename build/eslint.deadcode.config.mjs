export default [
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script"
    },
    rules: {
      "no-unused-vars": "error",
      "no-unreachable": "error",
      "no-constant-condition": "error",
      "no-dupe-args": "error",
      "no-dupe-keys": "error"
    }
  }
];
