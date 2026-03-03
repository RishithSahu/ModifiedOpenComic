
const recommendations = require(p.join(appDir, '.dist/tracking/recommendations.js'));

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
	const estimatedBoxWidth = Math.max(260, Math.floor((window.innerWidth - 64) / 3));
	const maxItems = Math.max(3, Math.min(6, Math.floor((estimatedBoxWidth - 20) / 118)));

	comics = app.copy(comics.slice(0, maxItems));
	const len = comics.length;

	// Find images here
	for(let i = 0; i < len; i++)
	{
		if(comics[i].addToQueue === 2 || (viewModuleSize !== 100 && viewModuleSize !== 150))
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

	if(len > 1 || (single && len > 0))
		handlebarsContext.boxes.push(box);
}

function continueReading(comics, single = false)
{
	return box(comics, single, language.comics.continueReading, 'real-numeric', 'readingProgress', 'lastReading', 'continue');
}

function recentlyAdded(comics, single = false)
{
	return box(comics, single, language.comics.recentlyAdded, 'real-numeric', 'added', false, 'recent');
}

async function recommended(comics, single = false)
{
	const recommendedComics = recommendations.buildRecommendations(comics, {
		trackingFolderMetadata: relative.get('trackingFolderMetadata') || {},
		readingProgress: relative.get('readingProgress') || {},
		readingPages: storage.get('readingPages') || {},
		recommendationFeedback: storage.get('recommendationFeedback') || {},
	});

	if(!recommendedComics.length)
		return;

	return box(recommendedComics, single, language.comics.recommendedForYou || 'Recommended for you', 'real-numeric', 'recommendationScore', false, 'recommended');
}

function reset()
{
	handlebarsContext.boxes = [];
}

module.exports = {
	continueReading: continueReading,
	recentlyAdded: recentlyAdded,
	recommended: recommended,
	reset: reset,
};
