function normalizeString(value = '')
{
	value = String(value || '').toLowerCase();

	if(value.normalize)
		value = value.normalize('NFKD');

	// Remove accents
	value = value.replace(/[\u0300-\u036f]/g, '');
	value = value.replace(/['`´’]/g, '');
	value = value.replace(/[^a-z0-9]+/g, ' ');
	value = value.replace(/\s+/g, ' ').trim();

	return value;
}

function tokenize(value = '')
{
	const normalized = normalizeString(value);
	if(!normalized) return [];

	return normalized.split(' ').filter(Boolean);
}

function isGenericFolderName(value = '')
{
	const normalized = normalizeString(value);
	if(!normalized) return true;

	if(/^\d+$/.test(normalized))
		return true;

	const generic = new Set([
		'manga',
		'comic',
		'comics',
		'books',
		'library',
		'series',
		'completed',
		'ongoing',
		'dropped',
		'favorites',
		'favourites',
		'chapters',
		'chapter',
		'volumes',
		'volume',
	]);

	if(generic.has(normalized))
		return true;

	if(/^(?:\d+\s*)?(?:completed|ongoing)\s+series$/.test(normalized))
		return true;

	return false;
}

function cleanCandidateTitle(value = '')
{
	value = String(value || '');

	// File extension (if any)
	value = value.replace(/\.[^./\\]{1,6}$/g, '');

	// Common release / technical tags
	value = value.replace(/[\[\(](?:\s*(?:\d{3,4}p|x26[45]|web[- ]?dl|raws?|v\d+|vol(?:ume)?\s*\d+|ch(?:apter)?\s*\d+|episode\s*\d+)[^\]\)]*)[\]\)]/giu, ' ');
	value = value.replace(/[\[\(][^\]\)]{1,40}[\]\)]/g, ' ');

	value = value.replace(/[_]+/g, ' ');
	value = value.replace(/[.]+/g, ' ');
	value = value.replace(/\s+-\s+/g, ' ');

	// Remove obvious chapter/volume suffixes from folder names
	value = value.replace(/\b(?:chapter|chap|ch|episode|ep|volume|vol|v|issue|part)\s*[-_.:]?\s*\d+(?:\.\d+)?\b/giu, ' ');
	value = value.replace(/\b(?:tomo|tomo\.|capitulo|cap|tome)\s*[-_.:]?\s*\d+(?:\.\d+)?\b/giu, ' ');

	value = value.replace(/\s+/g, ' ').trim();
	return value;
}

function uniqueStrings(values = [])
{
	const output = [];
	const seen = new Set();

	for(let i = 0, len = values.length; i < len; i++)
	{
		const value = String(values[i] || '').trim();
		const key = normalizeString(value);

		if(!value || !key || seen.has(key))
			continue;

		seen.add(key);
		output.push(value);
	}

	return output;
}

function extractYearsFromString(value = '')
{
	const years = [];
	const seen = new Set();
	const matches = String(value || '').match(/\b(1[0-9]{3}|2[0-9]{3}|3000)\b/g) || [];

	for(let i = 0, len = matches.length; i < len; i++)
	{
		const year = +matches[i];
		if(!year || year < 1000 || year > 3000 || seen.has(year))
			continue;

		seen.add(year);
		years.push(year);
	}

	return years;
}

function getReferenceYear(candidates = [], options = {})
{
	const preferred = Math.floor(Number(options?.referenceYear || 0));
	if(preferred >= 1000 && preferred <= 3000)
		return preferred;

	for(let i = 0, len = candidates.length; i < len; i++)
	{
		const years = extractYearsFromString(candidates[i]);
		if(years.length)
			return years[0];
	}

	return 0;
}

function yearProximityScore(resultYear = 0, referenceYear = 0)
{
	resultYear = Math.floor(Number(resultYear) || 0);
	referenceYear = Math.floor(Number(referenceYear) || 0);

	if(resultYear < 1000 || resultYear > 3000 || referenceYear < 1000 || referenceYear > 3000)
		return 0;

	const delta = Math.abs(resultYear - referenceYear);

	if(delta === 0) return 10;
	if(delta <= 1) return 8;
	if(delta <= 3) return 6;
	if(delta <= 5) return 4;
	if(delta <= 10) return 2;
	if(delta <= 20) return 1;

	return -6;
}

function extractCandidatesFromFolderPath(folderPath = '', extraTitles = [])
{
	const rawSegments = String(folderPath || '').split(/[\\/]/g).filter(Boolean);
	const segments = rawSegments.slice(-4).reverse(); // leaf first

	const candidates = [];

	for(let i = 0, len = segments.length; i < len; i++)
	{
		const raw = segments[i];
		const cleaned = cleanCandidateTitle(raw);

		if(cleaned && !isGenericFolderName(cleaned) && cleaned.length > 1)
			candidates.push(cleaned);
	}

	if(Array.isArray(extraTitles))
	{
		for(let i = 0, len = extraTitles.length; i < len; i++)
		{
			const cleaned = cleanCandidateTitle(extraTitles[i]);

			if(cleaned && !isGenericFolderName(cleaned) && cleaned.length > 1)
				candidates.push(cleaned);
		}
	}

	return uniqueStrings(candidates).slice(0, 6);
}

function scoreTitleMatch(query = '', target = '')
{
	const q = normalizeString(query);
	const t = normalizeString(target);

	if(!q || !t)
		return 0;

	if(q === t)
		return 100;

	const qTokens = tokenize(q);
	const tTokens = tokenize(t);

	if(!qTokens.length || !tTokens.length)
		return 0;

	const qSet = new Set(qTokens);
	const tSet = new Set(tTokens);

	let intersection = 0;

	for(const token of qSet)
	{
		if(tSet.has(token))
			intersection++;
	}

	const qCoverage = intersection / qSet.size;
	const tCoverage = intersection / tSet.size;
	const contains = (q.length >= 4 && t.includes(q)) || (t.length >= 4 && q.includes(t));
	const startsWith = t.startsWith(q) || q.startsWith(t);

	let score = 0;
	score += qCoverage * 50;
	score += tCoverage * 30;
	if(contains) score += 15;
	if(startsWith) score += 5;

	if(score > 100) score = 100;
	return Math.round(score);
}

function flattenResultTitles(result = {})
{
	const titles = [];

	if(result.title) titles.push(result.title);
	if(result.titleRomaji) titles.push(result.titleRomaji);
	if(result.titleEnglish) titles.push(result.titleEnglish);
	if(result.titleNative) titles.push(result.titleNative);
	if(result.titleUserPreferred) titles.push(result.titleUserPreferred);

	if(Array.isArray(result.synonyms))
		titles.push(...result.synonyms);

	return uniqueStrings(titles);
}

function rankSearchResults(candidates = [], results = [], options = {})
{
	const safeCandidates = uniqueStrings(candidates);
	if(!safeCandidates.length)
		return [];

	const excludedIds = new Set((Array.isArray(options?.excludedIds) ? options.excludedIds : []).map(function(id) {
		return +id;
	}).filter(Boolean));
	const referenceYear = getReferenceYear(safeCandidates, options);
	const ranked = [];

	for(let i = 0, len = results.length; i < len; i++)
	{
		const result = results[i] || {};
		const resultId = +(result.id || 0);
		if(resultId && excludedIds.has(resultId))
			continue;

		const titles = flattenResultTitles(result);
		let bestScore = 0;
		let bestCandidate = '';
		let bestTitle = '';

		for(let c = 0, clen = safeCandidates.length; c < clen; c++)
		{
			const candidate = safeCandidates[c];

			for(let t = 0, tlen = titles.length; t < tlen; t++)
			{
				const title = titles[t];
				const score = scoreTitleMatch(candidate, title);

				if(score > bestScore)
				{
					bestScore = score;
					bestCandidate = candidate;
					bestTitle = title;
				}
			}
		}

		const yearScore = yearProximityScore(result.serializationYear, referenceYear);
		const totalScore = Math.max(0, Math.min(100, bestScore + yearScore));

		ranked.push({
			...result,
			score: totalScore,
			titleScore: bestScore,
			yearScore: yearScore,
			referenceYear: referenceYear,
			matchedCandidate: bestCandidate,
			matchedTitle: bestTitle,
		});
	}

	ranked.sort(function(a, b) {
		if((b.score || 0) !== (a.score || 0))
			return (b.score || 0) - (a.score || 0);

		if((b.titleScore || 0) !== (a.titleScore || 0))
			return (b.titleScore || 0) - (a.titleScore || 0);

		return (a.id || 0) - (b.id || 0);
	});

	return ranked;
}

module.exports = {
	normalizeString,
	tokenize,
	isGenericFolderName,
	cleanCandidateTitle,
	extractYearsFromString,
	getReferenceYear,
	yearProximityScore,
	extractCandidatesFromFolderPath,
	scoreTitleMatch,
	flattenResultTitles,
	rankSearchResults,
};
