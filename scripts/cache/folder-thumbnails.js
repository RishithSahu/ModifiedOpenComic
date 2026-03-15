
function calcKey(path) {
	const { sortReading: sort, sortInvertReading: sortInvert, foldersFirstReading: foldersFirst, compressedFirstReading: compressedFirst } = config;
	return sha1(`${path}|${sort}|${sortInvert}|${foldersFirst}|${compressedFirst}`);
}

function hit(key) {
	const folderThumbnails = storage.get('cacheFolderThumbnails');
	if (!folderThumbnails[key]) return;

	folderThumbnails[key].lastAccess = app.time();
	storage.setThrottle('cacheFolderThumbnails', folderThumbnails);
}

function validate(images, isPoster, forceSize = false) {
	return images.every(function (image) {
		return !!(image && image.path && image.sha);

	});
}

function get(path, forceSize = false) {
	const folderThumbnails = storage.get('cacheFolderThumbnails');
	const key = calcKey(path);

	const data = folderThumbnails[key];
	if (!data) return false;

	const isPoster = !!data?.poster?.path;
	const images = isPoster ? [data.poster] : data.images;

	if (!validate(images, isPoster, forceSize)) return false;

	hit(key);

	return {
		poster: isPoster ? data.poster : false,
		images: !isPoster ? data.images : [],
	};
}

function set(path, images) {
	const folderThumbnails = storage.get('cacheFolderThumbnails');
	const key = calcKey(path);

	const isPoster = !Array.isArray(images);

	const poster = isPoster ? { path: images.path, sha: images.sha } : { path: '', sha: '' };
	const _images = !isPoster ? images.map((img) => ({ path: img.path, sha: img.sha })) : [];

	folderThumbnails[key] = {
		lastAccess: app.time(),
		poster: {
			path: isPoster ? poster.path : '',
			sha: isPoster ? poster.sha : '',
		},
		images: _images,
	};

	storage.setThrottle('cacheFolderThumbnails', folderThumbnails);
}

function remove(path) {
	const folderThumbnails = storage.get('cacheFolderThumbnails');
	const key = calcKey(path);

	if (folderThumbnails[key]) {
		delete folderThumbnails[key];
		storage.set('cacheFolderThumbnails', folderThumbnails);
	}
}

function purge() {
	const folderThumbnails = storage.get('cacheFolderThumbnails');

	const time = app.time();
	const cacheMaxOld = config.cacheMaxOld * 60 * 60 * 24;

	for (let key in folderThumbnails) {
		if (time - folderThumbnails[key].lastAccess > cacheMaxOld)
			delete folderThumbnails[key];
	}

	storage.set('cacheFolderThumbnails', folderThumbnails);

	return;
}

module.exports = {
	get,
	set,
	remove,
	purge,
}
