process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || (Math.max(4, Math.min(require('os').cpus().length, 8))).toString();

const { app, ipcMain, BrowserWindow, screen, Menu, nativeImage, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const windowStateKeeper = require('electron-window-state');
const folderPortable = require(path.join(__dirname, 'folder-portable.js'));

// Startup tracing is opt-in (OPENCOMIC_STARTUP_LOG=1 or --startup-log); it appended to an
// ever-growing file on every launch, including argv which can contain user file paths.
const startupLogEnabled = process.env.OPENCOMIC_STARTUP_LOG === '1' || process.argv.includes('--startup-log');
const startupLogMaxSize = 1024 * 1024;

function writeStartupLog(message = '')
{
	if(!startupLogEnabled)
		return;

	try
	{
		const logsDir = path.join(app.getPath('userData'), 'logs');
		if(!fs.existsSync(logsDir))
			fs.mkdirSync(logsDir, { recursive: true });

		const logFile = path.join(logsDir, 'startup.log');

		try
		{
			if(fs.statSync(logFile).size > startupLogMaxSize)
				fs.rmSync(logFile, { force: true });
		}
		catch{}

		const line = '['+new Date().toISOString()+'] '+String(message)+'\n';
		fs.appendFileSync(logFile, line, 'utf8');
	}
	catch(error)
	{
		console.error('Startup log error:', error);
	}
}

writeStartupLog('Process start. argv='+JSON.stringify(process.argv));
writeStartupLog('Versions='+JSON.stringify(process.versions));

try
{
	const sessionDataPath = path.join(app.getPath('userData'), 'session-data');
	if (!fs.existsSync(sessionDataPath))
		fs.mkdirSync(sessionDataPath, { recursive: true });
	app.setPath('sessionData', sessionDataPath);
	app.commandLine.appendSwitch('disk-cache-dir', path.join(sessionDataPath, 'Cache'));
}
catch(error)
{
	console.error('Failed to set session cache path:', error);
}

require('@electron/remote/main').initialize();
//remoteMain.enable(window.webContents);

// Do NOT cap --max-old-space-size here: decoding large PDF/EPUB pages and multi-megapixel
// scans routinely needs more than the default cap, and a low ceiling turns a slow render
// into a renderer OOM crash. --optimize-for-size also measurably slows image processing.
app.commandLine.appendSwitch('js-flags', '--expose-gc');
app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
const windows = new Map();
let firstWindowCreated = false;

process.traceProcessWarnings = true;

process.on('uncaughtException', function (error) {
	console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', function (reason) {
	console.error('Unhandled rejection:', reason);
});

function getArgValue(args, flag, defaultValue = null) {
	const arg = args.find(a => a.startsWith(flag + '='));
	if (!arg) return defaultValue;
	return arg.split('=')[1];
}

function createWindow(options = {}) {

	const args = options.args ?? process.argv;

	// Create the browser window.
	const id = crypto.randomUUID();
	const newWindow = args.includes('--new-window');

	let win = null;
	let appClosing = false;
	let windowShowed = false;
	let showWindowTimeout = false;

	let gotSingleInstanceLock = app.requestSingleInstanceLock();
	if (!gotSingleInstanceLock) {
		let _toOpenFile = false;

		const len = args.length;
		const last = args[len - 1];

		if (/^opencomic:\/\//.test(last))
			app.quit();

		for (let i = 1; i < len; i++) {
			let arg = args[i];

			if (arg && !['--no-sandbox', 'scripts/main.js', '.dist/main.js', '.', '--new-window'].includes(arg) && !/^--/.test(arg) && !/app\.asar/i.test(arg) && fs.existsSync(arg)) {
				_toOpenFile = arg;
				break;
			}
		}

		if (_toOpenFile && !newWindow) app.quit();
	}

	let mainWindowState = windowStateKeeper({
		defaultWidth: 1100,
		defaultHeight: 640,
		fullScreen: false,
	});

	let image = nativeImage.createFromPath(path.join(__dirname, '../images/logo.png'));

	const windowOffset = (newWindow && !mainWindowState.isMaximized && !mainWindowState.isFullScreen ? 24 : 0);

	const x = windowOffset ? +getArgValue(args, '--window-x', mainWindowState.x) : mainWindowState.x;
	const y = windowOffset ? +getArgValue(args, '--window-y', mainWindowState.y) : mainWindowState.y;
	const width = windowOffset ? +getArgValue(args, '--window-width', mainWindowState.width) : mainWindowState.width;
	const height = windowOffset ? +getArgValue(args, '--window-height', mainWindowState.height) : mainWindowState.height;

	win = new BrowserWindow({
		show: false,
		x: x + windowOffset,
		y: y + windowOffset,
		width: width,
		height: height,
		minWidth: 320,
		minHeight: 200,
		icon: image,
		webPreferences: {
			plugins: true,
			contextIsolation: false,
			nodeIntegration: true,
			nodeIntegrationInWorker: true,
			enableRemoteModule: true,
			backgroundThrottling: false,
			nativeWindowOpen: false,
			spellcheck: false,
			v8CacheOptions: 'bypassHeatCheck',
			additionalArguments: options.args ?? [],
		},
		titleBarStyle: (process.platform == 'linux' && !configInit.forceLinuxHiddenTitleBar) ? 'native' : 'hidden',
		titleBarOverlay: {
			color: '#242a3000',
			symbolColor: '#c2c7cf',
			height: 29,
		},
		trafficLightPosition: { x: 10, y: 7 },
		backgroundColor: '#242a30',
	});

	require('@electron/remote/main').enable(win.webContents)

	let menuTemplate = [
		{
			label: '...',
			submenu: [
				{ role: 'reload' },
				{ role: 'forceReload' },
				{ role: 'toggleDevTools' },
			]
		}
	];

	let menu = Menu.buildFromTemplate(menuTemplate);
	win.setMenu(menu);

	win.removeMenu();

	const showWindow = function (message = '') {

		if (windowShowed || !win || win.isDestroyed() || !win.webContents || win.webContents.isDestroyed())
			return;

		if (!windowShowed) {
			win.show();
			windowShowed = true;

			if (showWindowTimeout) {
				clearTimeout(showWindowTimeout);
				showWindowTimeout = false;
			}

			if (message)
				console.log(message);
		}

	}
	const windowCreatedAt = Date.now();
	const markWindowPhase = function (phase) {
		writeStartupLog(phase + ' at +' + (Date.now() - windowCreatedAt) + 'ms');
	};

	win.once('ready-to-show', function () {
		markWindowPhase('ready-to-show');
		showWindow();
	});

	// https://github.com/electron/electron/issues/42409
	win.webContents.once('did-finish-load', () => {
		markWindowPhase('did-finish-load');
		showWindow('Warning: win.show() from did-finish-load and not from ready-to-show');
	});
	win.webContents.once('dom-ready', () => markWindowPhase('dom-ready'));

	showWindowTimeout = setTimeout(() => showWindow('Warning: win.show() from setTimeout and not from ready-to-show'), 5000);

	// and load the index.html of the app.
	win.loadURL(url.format({
		pathname: path.join(__dirname, '../templates/index.html'),
		protocol: 'file:',
		slashes: true
	}));
	win.webContents.on('did-fail-load', function (event, errorCode, errorDescription, validatedURL) {
		console.error('did-fail-load:', errorCode, errorDescription, validatedURL);
	});
	win.webContents.on('render-process-gone', function (event, details) {
		console.error('render-process-gone:', details);
	});
	win.webContents.on('unresponsive', function () {
		console.error('webContents unresponsive');
	});

	// Open the DevTools.
	if (configInit.openDevTools)
		win.webContents.openDevTools()

	// JSON.stringify, not string concatenation: Windows paths are full of backslashes that
	// a raw JS string literal would swallow (C:\Users\... -> C:Users...).
	if (toOpenFile && !newWindow && win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed())
		win.webContents.executeJavaScript('toOpenFile = ' + JSON.stringify(String(toOpenFile)) + ';', false);

	const initData = {};

	if (options.initHistory)
		initData.history = options.initHistory;

	if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed())
		win.webContents.send('init-data', initData);

	win.on('close', function (event) {

		if (!appClosing) {
			appClosing = true;
			if (showWindowTimeout) {
				clearTimeout(showWindowTimeout);
				showWindowTimeout = false;
			}

			win.webContents.executeJavaScript('const saved = reading.progress.save(); tabs.restore.save(false, true); settings.purgeTemporaryFiles(); cache.purge(); ebook.closeAllRenders(); workers.closeAllWorkers(); storage.purgeOldAtomic(); saved;', false).then(function (value) {

				win.hide();

				// Wait for it to save
				setTimeout(function (win) {
					win.close();
				}, 500, win);

			}).catch(function (error) {

				console.error('Error during close cleanup:', error);
				win.hide();

				setTimeout(function (win) {
					win.close();
				}, 200, win);

			});

			event.preventDefault();
		}

	});

	// Emitted when the window is closed.
	win.on('closed', function () {

		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		windows.delete(id);
		win = null;

	});

	win.webContents.setWindowOpenHandler(function (details) {

		shell.openExternal(details.url);

		return { action: 'deny' };

	});

	let wasInside = false;

	setInterval(function () {

		if (!win || win.isDestroyed())
			return;

		const cursor = screen.getCursorScreenPoint();
		const bounds = win.getBounds();

		const inside = (cursor.x >= bounds.x) && (cursor.x <= bounds.x + bounds.width) && (cursor.y >= bounds.y) && (cursor.y <= bounds.y + bounds.height);

		if (inside && !wasInside)
			win.webContents.send('cursorenter');
		else if (!inside && wasInside)
			win.webContents.send('cursorleave');

		wasInside = inside;

	}, 250);

	if (gotSingleInstanceLock && !newWindow)
		mainWindowState.manage(win);

	windows.set(id, win);
	firstWindowCreated = true;
}

let configInitFile = path.join(app.getPath('userData'), 'storage', 'configInit.json');

if (folderPortable.check()) {
	const executableDir = process.env.OPENCOMIC_PORTABLE_EXECUTABLE_DIR || process.env.PORTABLE_EXECUTABLE_DIR;

	if (executableDir) {
		configInitFile = path.join(executableDir, 'opencomic', 'storage', 'configInit.json');
	}
	else {
		const outsidePath = path.join(__dirname, '../../../../', 'opencomic');

		if (fs.existsSync(outsidePath))
			configInitFile = path.join(outsidePath, 'storage', 'configInit.json');
		else
			configInitFile = path.join(__dirname, '../../../', 'storage', 'configInit.json');
	}
}

const configInit = fs.existsSync(configInitFile) ? JSON.parse(fs.readFileSync(configInitFile, 'utf8')) : {};

if (configInit.forceColorProfile)
	app.commandLine.appendSwitch('force-color-profile', configInit.forceColorProfile);

var toOpenFile = false;

app.on('open-file', function (event, path) {

	if (!firstWindowCreated)
		toOpenFile = path;

});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {

	createWindow();

})

// Quit when all windows are closed.
app.on('window-all-closed', () => {

	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin')
		app.quit()

})

app.on('activate', () => {

	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (windows.size === 0)
		createWindow()

})

ipcMain.on('open-at-login', function (event, active = false) {

	app.setLoginItemSettings({
		openAtLogin: active,
	})

});

ipcMain.handle('move-to-trash', function (event, path) {

	return shell.trashItem(path);

});

ipcMain.handle('open-new-window', function (event, options = {}) {

	createWindow(options)

});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


// Menu
/*
const menuTemplate = [{}];

const menu = Menu.buildFromTemplate(menuTemplate)
Menu.setApplicationMenu(menu)*/
