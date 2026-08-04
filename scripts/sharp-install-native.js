// Ensures every sharp native binary for the current OS is installed, for all architectures.
//
// npm only installs the optional platform package matching the build machine's own CPU, and
// installing another one with --os/--cpu prunes the previous one. That is a problem here for
// two reasons:
//
//   * test.js / test-postbuild.js assert that BOTH the x64 and arm64 binaries are present,
//     because a single node_modules is used to build installers for both architectures
//     (build.files picks the right one per arch via the `node_modules/@img/*${arch}*` glob).
//   * If the wrong one is present, electron-builder happily produces an installer whose sharp
//     cannot load, and the app dies on start with
//     `Could not load the "sharp" module using the win32-x64 runtime`.
//
// --force is what lets both coexist (it bypasses npm's os/cpu gate). The versions are read
// from sharp's own optionalDependencies rather than hardcoded, so this cannot drift out of
// sync the next time sharp is upgraded — installing a mismatched version is its own failure
// mode, since the bundled libvips DLL is named after the libvips version.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const modules = path.join(root, 'node_modules');

function readJson(file) {
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8'));
	}
	catch {
		return false;
	}
}

const sharpPackage = readJson(path.join(modules, 'sharp', 'package.json'));

if (!sharpPackage) {
	console.error('sharp is not installed; run npm install first.');
	process.exit(1);
}

const platform = process.platform;
const wanted = [];

for (const [name, version] of Object.entries(sharpPackage.optionalDependencies || {})) {
	// Only the per-architecture binaries for this OS, e.g. @img/sharp-win32-{x64,arm64}.
	// ia32 is skipped: nothing in build.files ships a 32 bit target.
	if (!name.startsWith('@img/sharp-' + platform + '-') || name.endsWith('-ia32'))
		continue;

	wanted.push({ name, version });
}

if (!wanted.length) {
	console.log('No sharp native packages to check for platform ' + platform + '.');
	process.exit(0);
}

const missing = wanted.filter(function (entry) {
	const installed = readJson(path.join(modules, entry.name, 'package.json'));

	return !installed || installed.version !== entry.version;
});

if (!missing.length) {
	console.log('sharp native binaries already correct: ' + wanted.map(e => e.name + '@' + e.version).join(', '));
	process.exit(0);
}

const specs = wanted.map(e => e.name + '@' + e.version);

console.log('Installing sharp native binaries: ' + specs.join(', '));

try {
	execFileSync('npm', ['install', '--no-save', '--include=optional', '--force', ...specs], {
		cwd: root,
		stdio: 'inherit',
		shell: process.platform === 'win32',
	});
}
catch (error) {
	console.error('Failed to install sharp native binaries.', error.message);
	process.exit(1);
}

const stillMissing = wanted.filter(function (entry) {
	const installed = readJson(path.join(modules, entry.name, 'package.json'));

	return !installed || installed.version !== entry.version;
});

if (stillMissing.length) {
	console.error('Still missing after install: ' + stillMissing.map(e => e.name + '@' + e.version).join(', '));
	process.exit(1);
}

console.log('sharp native binaries ready.');
