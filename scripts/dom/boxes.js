
const recommendations = require(p.join(appDir, '.dist/tracking/recommendations.js'));

function getBoxMaxItems()
{
	const estimatedBoxWidth = Math.max(260, Math.floor((window.innerWidth - 64) / 3));
	return Math.max(3, Math.min(6, Math.floor((estimatedBoxWidth - 20) / 118)));
}

function normalizeRecommendationPath(path = '')
{
	if(!path)
		return '';

	return p.normalize(path);
}

function getRecommendationStats(feedback = {}, path = '')
{
	const normalizedPath = normalizeRecommendationPath(path);
	const item = feedback[normalizedPath] || feedback[path] || {};

	let shown = Math.max(0, +(item.shown || 0));
	let liked = Math.max(0, +(item.liked || 0));
	let disliked = Math.max(0, +(item.disliked || 0));

	const legacyRating = +(item.rating || 0);
	if(legacyRating > 0)
	{
		shown = Math.max(shown, 1);
		liked = Math.max(liked, 1);
	}
	else if(legacyRating < 0)
	{
		shown = Math.max(shown, 1);
		disliked = Math.max(disliked, 1);
	}

	if(liked > shown)
		shown = liked;

	if(disliked > shown)
		shown = disliked;

	return {
		normalizedPath,
		shown,
		liked,
		disliked,
	};
}

function rankRecommendedComicsForDisplay(comics = [], feedback = {})
{
	const ranked = [];

	for(let i = 0, len = comics.length; i < len; i++)
	{
		const comic = comics[i];
		const stats = getRecommendationStats(feedback, comic?.path || '');
		const shown = stats.shown;
		const liked = stats.liked;
		const disliked = stats.disliked;

		const likeRatio = (liked + 1) / (shown + 2);
		const exposurePenalty = Math.min(45, shown * 6);
		const dislikePenalty = Math.min(30, disliked * 7);
		const likeBoost = Math.round(likeRatio * 30);
		const refreshJitter = Math.random() * 7;

		const recommendationDisplayScore = Math.max(1, Math.round((comic.recommendationScore || 0) + likeBoost - exposurePenalty - dislikePenalty + refreshJitter));

		ranked.push({
			...comic,
			recommendationDisplayScore,
			recommendationFeedbackShown: shown,
			recommendationFeedbackLiked: liked,
			recommendationFeedbackDisliked: disliked,
		});
	}

	ranked.sort(function(a, b){
		if((b.recommendationDisplayScore || 0) !== (a.recommendationDisplayScore || 0))
			return (b.recommendationDisplayScore || 0) - (a.recommendationDisplayScore || 0);

		if((b.recommendationScore || 0) !== (a.recommendationScore || 0))
			return (b.recommendationScore || 0) - (a.recommendationScore || 0);

		return (Math.random() > 0.5) ? 1 : -1;
	});

	return ranked;
}

function registerRecommendationsShown(comics = [])
{
	if(!comics.length)
		return;

	const feedback = storage.get('recommendationFeedback') || {};
	let changed = false;

	for(let i = 0, len = comics.length; i < len; i++)
	{
		const comic = comics[i];
		const path = normalizeRecommendationPath(comic?.path || '');
		if(!path)
			continue;

		const stats = getRecommendationStats(feedback, path);
		const next = {
			shown: stats.shown + 1,
			liked: stats.liked,
			disliked: stats.disliked,
			updatedAt: Date.now(),
		};

		feedback[path] = next;
		changed = true;
	}

	if(changed)
		storage.set('recommendationFeedback', feedback);
}

async function box(_comics, single, title, order, orderKey = false, orderKey2 = false, variant = '')
{
	const viewModuleSize = handlebarsContext.page.viewModuleSize || 150;

	let comics = [];

	for(let i = 0, len = _comics.length; i < len; i++)
	{
		comics.push(_comics[i]);
	}

	comics.sort(function(a, b){
		return -(dom.orderBy(a, b, order, orderKey, orderKey2));
	});

	// Top sections render 3 boxes side-by-side, so cap items per box based on
	// estimated box width to keep title/author readable.
	const maxItems = getBoxMaxItems();

	comics = app.copy(comics.slice(0, maxItems));
	const len = comics.length;

	// Find images here
	for(let i = 0; i < len; i++)
	{
		const hasLoadedImages = !!(comics[i].poster || (Array.isArray(comics[i].images) && comics[i].images.length));

		if(!hasLoadedImages || comics[i].addToQueue === 2 || (viewModuleSize !== 100 && viewModuleSize !== 150))
		{
			const images = await dom.getFolderThumbnails(comics[i].path, (viewModuleSize === 100 ? 100 : null));

			comics[i].poster = images.poster;
			comics[i].images = images.images;
			comics[i].progress = images.progress;
		}
	}

	if(len)
	{
		comics[0] = app.copy(comics[0]);
		comics[0].noHighlight = true;
	}

	const box = {
		title: title,
		boxes: true,
		size: 100,
		comics: comics,
		variant: variant,
	};

	// Guard: only push one box per variant — concurrent loadIndexPage calls can
	// otherwise accumulate duplicate sections before reset() is called again.
	const alreadyExists = variant && handlebarsContext.boxes.some(function(b){ return b.variant === variant; });

	if(!alreadyExists && (len > 1 || (single && len > 0)))
		handlebarsContext.boxes.push(box);

	return comics;
}

function continueReading(comics, single = false)
{
	const candidates = buildIndexedBoxCandidates(comics);
	let readingCandidates = candidates.filter(function(comic){
		return +(comic?.readingProgress?.lastReading || 0) > 0;
	});

	if(!readingCandidates.length)
		readingCandidates = candidates;

	return box(readingCandidates, single, language.comics.continueReading, 'real-numeric', 'readingProgress', 'lastReading', 'continue');
}

function recentlyAdded(comics, single = false)
{
	const candidates = buildIndexedBoxCandidates(comics);
	return box(candidates, single, language.comics.recentlyAdded, 'real-numeric', 'added', false, 'recent');
}

function buildIndexedBoxCandidates(comics = [])
{
	const trackingFolderMetadata = relative.get('trackingFolderMetadata') || {};
	const readingProgress = relative.get('readingProgress') || {};
	const recommendationCandidates = buildRecommendationCandidates(comics, trackingFolderMetadata);

	const filtered = [];

	for(let i = 0, len = recommendationCandidates.candidates.length; i < len; i++)
	{
		const comic = recommendationCandidates.candidates[i];

		// Items sourced from trackingFolderMetadata are always real manga — keep them.
		if(comic.fromMasterFolder === true)
		{
			comic.readingProgress = readingProgress[comic.path] || { lastReading: 0 };
			filtered.push(comic);
			continue;
		}

		// Items from the current page that are NOT plain folders are real content — keep them.
		if(!comic.folder || compatible.compressed(comic.path))
		{
			comic.readingProgress = readingProgress[comic.path] || { lastReading: 0 };
			filtered.push(comic);
			continue;
		}

		// Plain folder items from the current page: keep only if they have direct tracking metadata
		// (meaning they ARE a manga, not just a category container like "3 Reading").
		const normalizedPath = p.normalize(comic.path || '');
		const hasDirectMetadata = !!(trackingFolderMetadata[normalizedPath] || trackingFolderMetadata[comic.path]);

		if(hasDirectMetadata)
		{
			comic.readingProgress = readingProgress[comic.path] || { lastReading: 0 };
			filtered.push(comic);
		}
	}

	return filtered;
}

function buildRecommendationCandidates(comics = [], trackingFolderMetadata = {})
{
	const candidates = [];
	const indexedPaths = {};
	const currentPaths = {};

	for(let i = 0, len = comics.length; i < len; i++)
	{
		const comic = comics[i];
		if(!comic?.path)
			continue;

		const path = p.normalize(comic.path);
		const key = String(path).toLowerCase();

		if(indexedPaths[key])
			continue;

		indexedPaths[key] = true;
		currentPaths[key] = true;
		candidates.push(comic);
	}

	for(const metadataPath in trackingFolderMetadata)
	{
		const path = p.normalize(metadataPath);
		const key = String(path).toLowerCase();

		if(indexedPaths[key])
			continue;

		if(!fileManager.simpleExists(path))
			continue;

		indexedPaths[key] = true;

		const metadata = trackingFolderMetadata[metadataPath] || {};
		let statsPath = path;

		try
		{
			const firstCompressedFile = fileManager.firstCompressedFile(path, 0, false);
			if(firstCompressedFile)
				statsPath = firstCompressedFile;
		}
		catch(error){}

		let added = 0;

		try
		{
			if(!fileManager.isServer(path))
				added = Math.round(fs.statSync(statsPath).ctimeMs / 1000);
		}
		catch(error){}

		if(!added && metadata.updatedAt)
			added = Math.round(+metadata.updatedAt / 1000);

		candidates.push({
			name: metadata.title || p.basename(path),
			subname: metadata.author || false,
			path: path,
			mainPath: path,
			added: added,
			folder: true,
			compressed: compatible.compressed(path),
			fromMasterFolder: true,
		});
	}

	return {
		candidates,
		currentPaths,
	};
}

function applyRecommendationFeedbackButtonState(button = false)
{
	if(!button || !button.classList)
		return;

	const container = button.parentElement;
	if(container)
	{
		const siblings = container.querySelectorAll('.recommendation-feedback-button');

		for(let i = 0, len = siblings.length; i < len; i++)
			siblings[i].classList.remove('fill');
	}

	button.classList.add('fill');
}

function setRecommendationFeedback(path = '', rating = 0, event = false, button = false)
{
	if(event)
	{
		event.preventDefault();
		event.stopPropagation();
	}

	const normalizedPath = normalizeRecommendationPath(path);
	if(!normalizedPath)
		return;

	const feedback = storage.get('recommendationFeedback') || {};
	const nextRating = +(rating || 0);
	const stats = getRecommendationStats(feedback, normalizedPath);

	if(nextRating !== 1 && nextRating !== -1)
		return;

	feedback[normalizedPath] = {
		shown: stats.shown,
		liked: stats.liked + (nextRating > 0 ? 1 : 0),
		disliked: stats.disliked + (nextRating < 0 ? 1 : 0),
		updatedAt: Date.now(),
	};

	storage.set('recommendationFeedback', feedback);
	applyRecommendationFeedbackButtonState(button);

	if(nextRating < 0)
		dom.reload();
}

async function recommended(comics, single = false)
{
	const trackingFolderMetadata = relative.get('trackingFolderMetadata') || {};
	const recommendationFeedback = storage.get('recommendationFeedback') || {};
	const recommendationCandidates = buildRecommendationCandidates(comics, trackingFolderMetadata);

	let recommendedComics = recommendations.buildRecommendations(recommendationCandidates.candidates, {
		trackingFolderMetadata,
		readingProgress: relative.get('readingProgress') || {},
		readingPages: storage.get('readingPages') || {},
		recommendationFeedback,
	});

	recommendedComics = recommendedComics.filter(function(comic){
		const key = String(p.normalize(comic?.path || '')).toLowerCase();
		if(!key)
			return false;

		return !recommendationCandidates.currentPaths[key];
	});

	if(!recommendedComics.length)
		return;

	recommendedComics = rankRecommendedComicsForDisplay(recommendedComics, recommendationFeedback);

	const selectedComics = recommendedComics.slice(0, getBoxMaxItems());
	registerRecommendationsShown(selectedComics);

	return box(selectedComics, single, language.comics.recommendedForYou || 'Recommended for you', 'real-numeric', 'recommendationDisplayScore', false, 'recommended');
}

function reset()
{
	handlebarsContext.boxes = [];
}

module.exports = {
	continueReading: continueReading,
	recentlyAdded: recentlyAdded,
	recommended: recommended,
	setRecommendationFeedback: setRecommendationFeedback,
	reset: reset,
};
