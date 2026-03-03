
var currentStatus = {}, shaIndex = {}, _useTempIndex = false;

function setStatus(sha, value) {
	const current = currentStatus[sha] || {};

	value.addToQueue = value.addToQueue || current.addToQueue || false;
	value.addToQueueProgress = value.addToQueueProgress || current.addToQueueProgress || false;

	currentStatus[sha] = { ...current, ...value };
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

function scroll(event = false, throttle = true, force = false) {
	const check = function () {

		const scrollTop = event?.target?.scrollTop || template._contentRight().firstElementChild.scrollTop;
		const visibleItems = dom.calculateVisibleItems(handlebarsContext.page.view, scrollTop);

		if (force || prevScroll.start !== visibleItems.start || prevScroll.end !== visibleItems.end) {
			threads.clean('folderThumbnails');

			for (const sha in currentStatus) {
				const status = currentStatus[sha];
				const index = _useTempIndex ? status.tempIndex : status.index;

				if ((index >= visibleItems.start && index <= visibleItems.end) || status.forceSize) {
					addToQueue(sha);
				}
			}
		}

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

	if (thumbnails || progress) {
		threads.job('folderThumbnails', { key: sha, useThreads: 0.1 }, async function () {
			if (onReading)
				return;

			if (thumbnails) {
				setStatus(sha, {
					thumbnails: false,
				});
			}

			if (progress) {
				setStatus(sha, {
					progress: false,
				});
			}

			if (thumbnails) {
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

					if (!_images) {
						_images = await dom._selectFolderThumbnailSource(file, path);

						if (_images)
							cache.folderThumbnails.set(path, _images);
					}

					if (_images)
						await dom._getFolderThumbnails(file, images, _images, path, folderSha, true, forceSize);
				}
				catch (error) {
					if (error?.message && /notCacheOnly/.test(error.message))
						return;

					console.error(error);

					dom.compressedError(error, false);
					fileManager.requestFileAccess.check(path, error);
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
				}
				catch (error) {
					if (!error.message || !/notCacheOnly/.test(error.message))
						console.error(error);
				}
			}

			return;

		}).catch(function (error) {

			dom.compressedError(error, false);

		});
	}
}

async function event() {
	app.event(template._contentRight().firstElementChild, 'scroll', scroll);

	await app.sleep(200);
	scroll();
}

function reset() {
	threads.clean('folderThumbnails');
	currentStatus = {};
	prevScroll = {};
}

module.exports = {
	check: function () { scroll(false, false, true) },
	reset,
	event,
	setStatus,
	setStatusIndex,
	useTempIndex: useTempIndex,
	get _useTempIndex() { return _useTempIndex },
	get currentStatus() { return currentStatus },
}
