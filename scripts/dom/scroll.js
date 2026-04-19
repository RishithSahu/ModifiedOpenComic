
var currentStatus = {}, shaIndex = {}, _useTempIndex = false;

function setStatus(sha, value) {
	const current = currentStatus[sha] || {};

	if (typeof value.addToQueue === 'undefined')
		value.addToQueue = (typeof current.addToQueue === 'undefined') ? false : current.addToQueue;

	if (typeof value.addToQueueProgress === 'undefined')
		value.addToQueueProgress = (typeof current.addToQueueProgress === 'undefined') ? false : current.addToQueueProgress;

	currentStatus[sha] = { ...current, ...value };

	if (typeof value.index !== 'undefined')
		shaIndex[value.index] = sha;
}

function setStatusIndex(index, value) {
	if (shaIndex[index])
		setStatus(shaIndex[index], value);
}

function useTempIndex(value, reset = false) {
	_useTempIndex = value;

	if (reset) {
		for (const sha in currentStatus) {
			const status = currentStatus[sha];
			status.tempIndex = 9999999;
		}
	}

	return _useTempIndex;
}

var prevScroll = {};
var warmupST = false;
var loadedFolderPosters = {};
var eventsBound = {
	scrollTarget: false,
	resize: false,
};

function rememberFolderPoster(folderSha, path) {
	if (!folderSha || !path)
		return;

	loadedFolderPosters[folderSha] = path;
}

function restoreFolderPoster(folderSha) {
	if (!folderSha)
		return false;

	const path = loadedFolderPosters[folderSha];

	if (!path)
		return false;

	dom.addImageToDom(folderSha + '-0', path, false);
	return true;
}

function hasFolderPosterSrc(folderSha) {
	const image = template._contentRight().querySelector('img.sha-image-' + folderSha + '-0, img.sha-image-' + folderSha);

	if (!image)
		return false;

	const src = image.getAttribute('src');

	if (!(src && String(src).trim()))
		return false;

	if (image.dataset.thumbnailState === 'error')
		return false;

	if (image.complete && image.naturalWidth === 0)
		return false;

	return true;
}

async function invalidateStatusCache(status) {
	if (!status?.path)
		return;

	const cached = cache.folderThumbnails.get(status.path, status.forceSize);
	const sourcePaths = new Set();

	if (cached?.poster?.path)
		sourcePaths.add(cached.poster.path);

	if (Array.isArray(cached?.images)) {
		for (let i = 0, len = cached.images.length; i < len; i++) {
			const image = cached.images[i];

			if (image?.path)
				sourcePaths.add(image.path);
		}
	}

	cache.folderThumbnails.remove(status.path);

	if (status.folderSha)
		delete loadedFolderPosters[status.folderSha];

	for (const sourcePath of sourcePaths) {
		try {
			await cache.deleteInCache(sourcePath);
		}
		catch (error) {
			console.warn('Warning: Failed to invalidate folder thumbnail cache source | ' + sourcePath, error);
		}
	}
}

function clearRetryStateByPath(path = '') {
	const normalizedPath = p.normalize(path || '');

	if (!normalizedPath)
		return;

	for (const sha in currentStatus) {
		const status = currentStatus[sha] || {};

		if (p.normalize(status.path || '') !== normalizedPath)
			continue;

		setStatus(sha, {
			loadErrorCount: 0,
			lastLoadError: 0,
		});
	}
}

async function retryByPath(path = '', options = {}) {
	const normalizedPath = p.normalize(path || '');

	if (!normalizedPath)
		return false;

	const now = Date.now();
	let retried = false;
	let invalidated = false;

	for (const sha in currentStatus) {
		const status = currentStatus[sha] || {};

		if (p.normalize(status.path || '') !== normalizedPath)
			continue;

		const retryCount = +(status.loadErrorCount || 0) + 1;
		const cooldown = Math.min(4000, 180 * Math.pow(2, Math.min(retryCount - 1, 4)));

		if (status.lastLoadError && (now - status.lastLoadError) < cooldown)
			continue;

		if (options.invalidateCache && !invalidated) {
			await invalidateStatusCache(status);
			invalidated = true;
		}

		setStatus(sha, {
			thumbnails: 2,
			addToQueueProgress: false,
			lastQueueTry: 0,
			loadErrorCount: retryCount,
			lastLoadError: now,
		});

		addToQueue(sha);
		retried = true;
	}

	return retried;
}

function queueWarmup(visibleItems = false) {
	if (warmupST)
		return;

	warmupST = setTimeout(function () {
		warmupST = false;

		const pending = [];
		const now = Date.now();
		const center = visibleItems ? ((visibleItems.start + visibleItems.end) / 2) : 0;

		for (const sha in currentStatus) {
			const status = currentStatus[sha] || {};

			if (!(status.thumbnails || status.progress) || status.addToQueueProgress)
				continue;

			if (status.lastQueueTry && (now - status.lastQueueTry) < 800)
				continue;

			const index = _useTempIndex ? status.tempIndex : status.index;
			const distance = visibleItems ? Math.abs((index || 0) - center) : (index || 0);

			pending.push({ sha, distance });
		}

		if (!pending.length)
			return;

		pending.sort(function (a, b) {
			return a.distance - b.distance;
		});

		const limit = 24;

		for (let i = 0, len = Math.min(limit, pending.length); i < len; i++) {
			addToQueue(pending[i].sha);
		}

		if (pending.length > limit)
			queueWarmup(visibleItems);

	}, 120);
}

function resized() {
	scroll(false, false, true);
}

function scroll(event = false, throttle = true, force = false) {
	const check = function () {

		const scrollTop = event?.target?.scrollTop || template._contentRight().firstElementChild.scrollTop;
		const visibleItems = dom.calculateVisibleItems(handlebarsContext.page.view, scrollTop);

		if (force || prevScroll.start !== visibleItems.start || prevScroll.end !== visibleItems.end) {
			for (const sha in currentStatus) {
				const status = currentStatus[sha];
				const index = _useTempIndex ? status.tempIndex : status.index;

				if ((index >= visibleItems.start && index <= visibleItems.end) || status.forceSize) {
					if (status.folderSha && !hasFolderPosterSrc(status.folderSha))
						restoreFolderPoster(status.folderSha);

					if (!status.thumbnails && !status.addToQueueProgress && status.folderSha && !hasFolderPosterSrc(status.folderSha)) {
						setStatus(sha, { thumbnails: 2 });
					}

					addToQueue(sha);
				}
			}
		}

		queueWarmup(visibleItems);

		prevScroll = visibleItems;

	};

	if (throttle)
		app.setThrottle('dom-scroll', check, 50, 100);
	else
		check();
}

function addToQueue(sha) {
	const status = currentStatus[sha] || {};
	const { path, folderSha, forceSize, thumbnails, progress } = status;

	if (status.addToQueueProgress)
		return;

	if (thumbnails || progress) {
		setStatus(sha, { addToQueueProgress: true, lastQueueTry: Date.now() });

		threads.job('folderThumbnails', { key: sha, useThreads: 0.1 }, async function () {
			if (onReading)
			{
				setStatus(sha, { addToQueueProgress: false });
				return;
			}

			let loadedThumbnails = false;
			let loadedProgress = false;

			if (thumbnails) {
				let loadedPosterPath = false;

				const images = [
					{ cache: false, path: '', sha: folderSha + '-0' },
					{ cache: false, path: '', sha: folderSha + '-1' },
					{ cache: false, path: '', sha: folderSha + '-2' },
					{ cache: false, path: '', sha: folderSha + '-3' },
				];

				const file = fileManager.file(path, { fromThumbnailsGeneration: true, subtask: true, log: false, sort: { extraKey: 'Reading' } });

				try {
					const cached = cache.folderThumbnails.get(path, forceSize);
					let _images = cached ? (cached.poster ? cached.poster : (cached.images?.[0] || false)) : false;

					// Invalidate stale cache: if cached poster is from inside a compressed
					// file but a cover image now exists in the folder, prefer the cover
					if (_images && _images.path) {
						const compressedFile = fileManager.lastCompressedFile(_images.path);
						if (compressedFile && !fileManager.simpleExists(compressedFile)) {
							cache.folderThumbnails.remove(path);
							_images = false;
						}
						else if (compressedFile) {
							try {
								const coverRegex = /^cover(?:[\s._-].*)?\.[a-z0-9]+$/i;
								const entries = fs.readdirSync(path);
								const hasCover = entries.some(name => coverRegex.test(name) && compatible.image(name));
								if (hasCover) {
									cache.folderThumbnails.remove(path);
									_images = false;
								}
							} catch {}
						}
					}

					if (!_images) {
						_images = await dom._selectFolderThumbnailSource(file, path);

						if (_images)
							cache.folderThumbnails.set(path, _images);
					}

					if (_images) {
						const loaded = await dom._getFolderThumbnails(file, images, _images, path, folderSha, true, forceSize);

						loadedPosterPath = loaded?.poster?.path || loaded?.images?.[0]?.path || false;
						if (loadedPosterPath)
							rememberFolderPoster(folderSha, loadedPosterPath);
					}

					if (loadedPosterPath && !hasFolderPosterSrc(folderSha))
						dom.addImageToDom(folderSha + '-0', loadedPosterPath, false);

					loadedThumbnails = true;
				}
				catch (error) {
					if (error?.message && /notCacheOnly/.test(error.message))
						loadedThumbnails = false;
					else {
						console.error(error);

						dom.compressedError(error, false);
						fileManager.requestFileAccess.check(path, error);
					}
				}
				finally {
					file.destroy();
				}
			}

			if (progress) {
				try {
					const type = fileManager.file(path).getType();
					const _progress = type.folder ? await reading.progress.getFolderItemProgress(path, true, true) : await reading.progress.get(path, true, true);
					dom.addProgressToDom(folderSha, _progress, (progress === 1));
					loadedProgress = true;
				}
				catch (error) {
					if (!error.message || !/notCacheOnly/.test(error.message))
						console.error(error);
				}
			}

			const update = { addToQueueProgress: false };
			if (loadedThumbnails) update.thumbnails = false;
			if (loadedProgress) update.progress = false;
			setStatus(sha, update);

			return;

		}).catch(function (error) {
			setStatus(sha, { addToQueueProgress: false });

			dom.compressedError(error, false);

		});
	}
}

async function event() {
	const scrollTarget = template._contentRight().firstElementChild;

	if (eventsBound.scrollTarget && eventsBound.scrollTarget !== scrollTarget)
		app.eventOff(eventsBound.scrollTarget, 'scroll', scroll);

	if (eventsBound.scrollTarget !== scrollTarget) {
		app.event(scrollTarget, 'scroll', scroll);
		eventsBound.scrollTarget = scrollTarget;
	}

	if (!eventsBound.resize) {
		app.event(window, 'resize', resized);
		eventsBound.resize = true;
	}

	await app.sleep(200);
	scroll();
}

function reset() {
	if (warmupST)
		clearTimeout(warmupST);

	warmupST = false;
	loadedFolderPosters = {};
	threads.clean('folderThumbnails');
	currentStatus = {};
	prevScroll = {};

	if (eventsBound.scrollTarget) {
		app.eventOff(eventsBound.scrollTarget, 'scroll', scroll);
		eventsBound.scrollTarget = false;
	}

	if (eventsBound.resize) {
		app.eventOff(window, 'resize', resized);
		eventsBound.resize = false;
	}
}

module.exports = {
	check: function () { scroll(false, false, true) },
	reset,
	event,
	setStatus,
	setStatusIndex,
	retryByPath,
	clearRetryStateByPath,
	useTempIndex: useTempIndex,
	get _useTempIndex() { return _useTempIndex },
	get currentStatus() { return currentStatus },
}
