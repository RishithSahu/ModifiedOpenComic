function normalizeGenre(value = '')
{
	return String(value || '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}

function escapeRegex(value = '')
{
	return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function listGenres(metadata = {})
{
	const clusters = Array.isArray(metadata?.recommendation?.genreClusters) ? metadata.recommendation.genreClusters : [];
	const genres = Array.isArray(metadata?.genres) ? metadata.genres : [];

	const source = clusters.length ? clusters : genres;
	const result = [];
	const seen = new Set();

	for(let i = 0, len = source.length; i < len; i++)
	{
		const genre = normalizeGenre(source[i]);

		if(!genre || seen.has(genre))
			continue;

		seen.add(genre);
		result.push(genre);
	}

	return result.slice(0, 6);
}

function regexForPath(path = '')
{
	return new RegExp('^\\s*' + escapeRegex(path) + '(?:[\\\\/]|$)');
}

function estimateReadPages(path = '', readingProgress = {})
{
	if(!path)
		return 0;

	const direct = readingProgress[path];
	if(direct?.page)
		return direct.page;

	const regex = regexForPath(path);
	let pages = 0;

	for(const key in readingProgress)
	{
		if(!regex.test(key))
			continue;

		const item = readingProgress[key];
		if(item?.page)
			pages += item.page;
	}

	return pages;
}

function readingTimeFromPages(pages = 0)
{
	if(!pages || pages < 1)
		return 0;

	// Average 42 seconds per page.
	return Math.max(1, Math.round((pages * 42) / 60));
}

function estimateSeriesReadingMinutes(path = '', metadata = {}, readingProgress = {}, readingPages = {})
{
	const recommendationTime = Number(metadata?.recommendation?.readingTimeMinutes || 0);
	if(recommendationTime > 0)
		return Math.round(recommendationTime);

	const readPages = estimateReadPages(path, readingProgress);
	if(readPages > 0)
		return readingTimeFromPages(readPages);

	const cachedPages = Number(readingPages?.[path]?.pages || 0);
	if(cachedPages > 0)
		return readingTimeFromPages(cachedPages);

	return 0;
}

function daysAgo(timestamp = 0)
{
	if(!timestamp)
		return 3650;

	const ms = Date.now() - Number(timestamp);
	return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function recencyWeight(timestamp = 0)
{
	const days = daysAgo(timestamp);
	return Math.max(0.2, 1 - (Math.min(days, 720) / 720));
}

function median(values = [])
{
	if(!values.length)
		return 0;

	const sorted = values.slice().sort(function(a, b){ return a - b; });
	const mid = Math.floor(sorted.length / 2);

	if(sorted.length % 2)
		return sorted[mid];

	return (sorted[mid - 1] + sorted[mid]) / 2;
}

function buildProfile(comics = [], trackingFolderMetadata = {}, readingProgress = {}, readingPages = {})
{
	const genreWeights = {};
	const times = [];
	let maxGenreWeight = 0;

	for(let i = 0, len = comics.length; i < len; i++)
	{
		const comic = comics[i];
		if(!comic?.path)
			continue;

		const progress = readingProgress[comic.path];
		const readPages = estimateReadPages(comic.path, readingProgress);
		const hasReadSignal = Boolean((progress?.lastReading || 0) > 0 || readPages > 0);

		if(!hasReadSignal)
			continue;

		const metadata = trackingFolderMetadata[comic.path] || {};
		const genres = listGenres(metadata);
		if(!genres.length)
			continue;

		const minutes = estimateSeriesReadingMinutes(comic.path, metadata, readingProgress, readingPages) || 10;
		const weight = Math.max(1, minutes) * recencyWeight(progress?.lastReading || 0);

		times.push(minutes);

		for(let g = 0, glen = genres.length; g < glen; g++)
		{
			const genre = genres[g];
			genreWeights[genre] = (genreWeights[genre] || 0) + weight;
			maxGenreWeight = Math.max(maxGenreWeight, genreWeights[genre]);
		}
	}

	return {
		genreWeights,
		maxGenreWeight: maxGenreWeight || 1,
		medianMinutes: median(times) || 60,
	};
}

function genreClusterScore(genres = [], profile = {})
{
	if(!genres.length)
		return 0.15;

	let sum = 0;

	for(let i = 0, len = genres.length; i < len; i++)
	{
		const genre = genres[i];
		const weight = profile.genreWeights?.[genre] || 0;
		sum += (weight / (profile.maxGenreWeight || 1));
	}

	return Math.min(1, sum / genres.length);
}

function timeAffinityScore(candidateMinutes = 0, profile = {})
{
	const target = Math.max(30, profile.medianMinutes || 60);
	const value = candidateMinutes || target;
	const delta = Math.abs(value - target);
	const normalized = Math.min(1, delta / target);
	return 1 - normalized;
}

function freshnessScore(added = 0)
{
	if(!added)
		return 0.4;

	const days = daysAgo(added * 1000);
	return Math.max(0.2, 1 - (Math.min(days, 720) / 720));
}

function buildRecommendations(comics = [], options = {})
{
	const trackingFolderMetadata = options.trackingFolderMetadata || {};
	const readingProgress = options.readingProgress || {};
	const readingPages = options.readingPages || {};
	const recommendationFeedback = options.recommendationFeedback || {};
	const profile = buildProfile(comics, trackingFolderMetadata, readingProgress, readingPages);
	const recommended = [];

	for(let i = 0, len = comics.length; i < len; i++)
	{
		const comic = comics[i];
		if(!comic?.path)
			continue;

		const progress = readingProgress[comic.path] || {};
		const readPages = estimateReadPages(comic.path, readingProgress);

		// Skip fully completed series and currently in-progress series.
		if(progress.completed || readPages > 0)
			continue;

		const metadata = trackingFolderMetadata[comic.path];
		if(!metadata)
			continue;

		const feedback = recommendationFeedback[comic.path] || {};
		const feedbackRating = Number(feedback.rating || 0);

		// Hide recommendations explicitly marked as bad by the user.
		if(feedbackRating < 0)
			continue;

		const genres = listGenres(metadata);
		const candidateMinutes = estimateSeriesReadingMinutes(comic.path, metadata, readingProgress, readingPages);

		const genreScore = genreClusterScore(genres, profile);
		const timeScore = timeAffinityScore(candidateMinutes, profile);
		const freshScore = freshnessScore(comic.added || 0);
		let score = Math.round(((genreScore * 0.65) + (timeScore * 0.25) + (freshScore * 0.10)) * 100);

		// Positive feedback nudges highly relevant items upward.
		if(feedbackRating > 0)
			score = Math.min(100, score + 18);

		recommended.push({
			...comic,
			recommendationScore: score,
			recommendationGenres: genres,
			recommendationReadingTimeMinutes: candidateMinutes,
			recommendationRating: feedbackRating,
		});
	}

	recommended.sort(function(a, b){
		if((b.recommendationScore || 0) !== (a.recommendationScore || 0))
			return (b.recommendationScore || 0) - (a.recommendationScore || 0);

		return (b.added || 0) - (a.added || 0);
	});

	return recommended;
}

module.exports = {
	normalizeGenre,
	listGenres,
	estimateReadPages,
	readingTimeFromPages,
	estimateSeriesReadingMinutes,
	buildProfile,
	genreClusterScore,
	timeAffinityScore,
	buildRecommendations,
};
