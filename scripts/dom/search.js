function removeDiacritics(str) {
	if (typeof str !== 'string')
		str = str === undefined || str === null ? '' : String(str);

	return str.normalize('NFKD').replace(/\p{Diacritic}/g, '');
}

const SEARCH_RESULT_LIMIT = 20;
const SEARCH_PATH_RESULT_LIMIT = 20;
const RECENT_SEARCHES_LIMIT = 30;
const SAVED_SEARCHES_LIMIT = 60;
const SAVED_SEARCHES_SHOW_LIMIT = 8;

const QUERY_FIELD_ALIASES = {
	author: 'author',
	artist: 'author',
	creator: 'author',
	genre: 'genre',
	genres: 'genre',
	status: 'status',
	state: 'status',
	rating: 'rating',
	score: 'rating',
	tag: 'tag',
	tags: 'tag',
	label: 'label',
	labels: 'label',
	year: 'year',
	title: 'title',
	name: 'name',
	path: 'path',
	type: 'type',
	kind: 'type',
	source: 'source',
	series: 'seriesType',
	seriestype: 'seriesType',
	demographic: 'demographic',
	demo: 'demographic',
	confidence: 'confidence',
	progress: 'progress',
	time: 'readingTime',
	readtime: 'readingTime',
	minutes: 'readingTime',
	has: 'has',
};

const NUMERIC_QUERY_FIELDS = new Set(['rating', 'year', 'confidence', 'progress', 'readingTime']);

const KEYWORD_QUERY_TOKENS = {
	unread: { key: 'status', value: 'unread' },
	reading: { key: 'status', value: 'reading' },
	inprogress: { key: 'status', value: 'reading' },
	'in-progress': { key: 'status', value: 'reading' },
	started: { key: 'status', value: 'reading' },
	read: { key: 'status', value: 'completed' },
	completed: { key: 'status', value: 'completed' },
	done: { key: 'status', value: 'completed' },
	favorite: { key: 'favorite', value: true },
	favourite: { key: 'favorite', value: true },
	fav: { key: 'favorite', value: true },
	folder: { key: 'folder', value: true },
	file: { key: 'file', value: true },
	compressed: { key: 'compressed', value: true },
	tracked: { key: 'tracked', value: true },
	untracked: { key: 'tracked', value: false },
};

function normalizeSearchText(value = '') {
	return removeDiacritics(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeSearchInput(value = '') {
	if (typeof value !== 'string')
		value = String(value || '');

	return value.replace(/\s+/g, ' ').trim();
}

function stripWrappedQuotes(value = '') {
	if (typeof value !== 'string')
		value = String(value || '');

	value = value.trim();

	if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\'')))
		return value.slice(1, -1).trim();

	return value;
}

function splitQueryValues(value = '') {
	if (typeof value !== 'string')
		value = String(value || '');

	const values = value.split(/[,\|]/g);
	const result = [];

	for (let i = 0, len = values.length; i < len; i++) {
		const current = normalizeSearchText(stripWrappedQuotes(values[i]));
		if (current)
			result.push(current);
	}

	return result;
}

function tokenizeSearchQuery(query = '') {
	if (!query)
		return [];

	const tokens = query.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);

	return tokens || [];
}

function parseKeywordQueryToken(token = '') {
	const keyword = KEYWORD_QUERY_TOKENS[token] || false;

	if (!keyword)
		return false;

	return {
		kind: 'keyword',
		key: keyword.key,
		value: keyword.value,
	};
}

function parseSearchQuery(query = '') {
	const tokens = tokenizeSearchQuery(query);
	const parsed = {
		textTerms: [],
		terms: [],
		hasAdvanced: false,
		quickTextOnly: false,
	};

	for (let i = 0, len = tokens.length; i < len; i++) {
		let token = tokens[i];
		let negated = false;

		while ((token.startsWith('-') || token.startsWith('!')) && token.length > 1) {
			negated = !negated;
			token = token.slice(1);
		}

		token = token.trim();
		if (!token)
			continue;

		const fieldMatch = token.match(/^([a-zA-Z][a-zA-Z0-9_-]*)(>=|<=|>|<|=|:)(.+)$/);

		if (fieldMatch) {
			const fieldAlias = normalizeSearchText(fieldMatch[1]);
			const field = QUERY_FIELD_ALIASES[fieldAlias] || false;
			const op = fieldMatch[2];
			const rawValue = stripWrappedQuotes(fieldMatch[3]);

			if (field && rawValue) {
				parsed.hasAdvanced = true;

				if (NUMERIC_QUERY_FIELDS.has(field)) {
					const numeric = Number(rawValue);

					if (Number.isFinite(numeric)) {
						parsed.terms.push({
							kind: 'numeric',
							field: field,
							op: op,
							value: numeric,
							negated: negated,
						});
						continue;
					}
				}

				const values = splitQueryValues(rawValue);

				if (values.length) {
					parsed.terms.push({
						kind: 'field',
						field: field,
						op: op,
						values: values,
						negated: negated,
					});
					continue;
				}
			}
		}

		const normalizedToken = normalizeSearchText(stripWrappedQuotes(token));
		if (!normalizedToken)
			continue;

		const keywordTerm = parseKeywordQueryToken(normalizedToken);
		if (keywordTerm) {
			keywordTerm.negated = negated;
			parsed.hasAdvanced = true;
			parsed.terms.push(keywordTerm);
			continue;
		}

		parsed.textTerms.push({
			value: normalizedToken,
			negated: negated,
		});
	}

	parsed.quickTextOnly = !parsed.hasAdvanced && parsed.textTerms.length > 0 && parsed.textTerms.every(function (term) {
		return !term.negated;
	});

	return parsed;
}

function getPathLookupKey(path = '') {
	if (typeof path !== 'string' || !path)
		return '';

	return p.normalize(path).toLowerCase();
}

function createPathLookup(source = {}) {
	const lookup = {};

	for (let key in source) {
		const lookupKey = getPathLookupKey(key);
		if (lookupKey)
			lookup[lookupKey] = source[key];
	}

	return lookup;
}

function resolveEntryLookupPaths(file) {
	if (Array.isArray(file?._searchLookupPaths))
		return file._searchLookupPaths;

	const paths = [];

	if (file?.path)
		paths.push(file.path);

	if (file?.mainPath)
		paths.push(file.mainPath);

	if (file?.path && !file.folder && !file.compressed)
		paths.push(p.dirname(file.path));

	if (file?.mainPath)
		paths.push(p.dirname(file.mainPath));

	const unique = [];
	const seen = {};

	for (let i = 0, len = paths.length; i < len; i++) {
		const key = getPathLookupKey(paths[i]);

		if (!key || seen[key])
			continue;

		seen[key] = true;
		unique.push(key);
	}

	file._searchLookupPaths = unique;

	return unique;
}

function normalizeSearchStringArray(values = []) {
	if (!Array.isArray(values))
		return [];

	const normalized = [];
	const seen = {};

	for (let i = 0, len = values.length; i < len; i++) {
		const value = normalizeSearchText(values[i]);
		if (!value || seen[value])
			continue;

		seen[value] = true;
		normalized.push(value);
	}

	return normalized;
}

function createSearchContext() {
	return {
		trackingFolderMetadata: createPathLookup(relative.get('trackingFolderMetadata') || {}),
		favorites: createPathLookup(relative.get('favorites') || {}),
		comicLabels: createPathLookup(relative.get('comicLabels') || {}),
		readingProgress: createPathLookup(relative.get('readingProgress') || {}),
	};
}

function getEntryMetadata(file, context) {
	if (file?._trackingMetadata && typeof file._trackingMetadata === 'object')
		return file._trackingMetadata;

	const lookupPaths = resolveEntryLookupPaths(file);

	for (let i = 0, len = lookupPaths.length; i < len; i++) {
		const metadata = context.trackingFolderMetadata[lookupPaths[i]];

		if (metadata && typeof metadata === 'object') {
			file._trackingMetadata = metadata;
			return metadata;
		}
	}

	file._trackingMetadata = false;
	return false;
}

function getEntryLabels(file, context) {
	if (Array.isArray(file?._searchLabels))
		return file._searchLabels;

	const lookupPaths = resolveEntryLookupPaths(file);
	const labels = [];
	const seen = {};

	for (let i = 0, len = lookupPaths.length; i < len; i++) {
		const current = context.comicLabels[lookupPaths[i]];

		if (!Array.isArray(current))
			continue;

		for (let i2 = 0, len2 = current.length; i2 < len2; i2++) {
			const label = normalizeSearchText(current[i2]);

			if (!label || seen[label])
				continue;

			seen[label] = true;
			labels.push(label);
		}
	}

	file._searchLabels = labels;
	return labels;
}

function getEntryProgress(file, context) {
	if (file?._searchProgress && typeof file._searchProgress === 'object')
		return file._searchProgress;

	const lookupPaths = resolveEntryLookupPaths(file);

	for (let i = 0, len = lookupPaths.length; i < len; i++) {
		const progress = context.readingProgress[lookupPaths[i]];

		if (progress && typeof progress === 'object') {
			file._searchProgress = progress;
			return progress;
		}
	}

	file._searchProgress = false;
	return false;
}

function entryIsFavorite(file, context) {
	if (typeof file?._isFavorite === 'boolean')
		return file._isFavorite;

	const lookupPaths = resolveEntryLookupPaths(file);

	for (let i = 0, len = lookupPaths.length; i < len; i++) {
		if (context.favorites[lookupPaths[i]]) {
			file._isFavorite = true;
			return true;
		}
	}

	file._isFavorite = false;
	return false;
}

function extractMetadataRating(metadata = {}) {
	if (Number.isFinite(+metadata.rating))
		return Math.max(0, Math.min(100, +metadata.rating));

	const fromText = String(metadata.metadataRating || '').match(/([0-9]{1,3})/);

	if (fromText)
		return Math.max(0, Math.min(100, +fromText[1]));

	return 0;
}

function extractMetadataYear(metadata = {}) {
	if (Number.isFinite(+metadata.serializationYear))
		return +metadata.serializationYear;

	if (Number.isFinite(+metadata.metadataYear))
		return +metadata.metadataYear;

	return 0;
}

function resolveProgressPercent(progress = false) {
	if (!progress || typeof progress !== 'object')
		return 0;

	if (Number.isFinite(+progress.percent))
		return Math.max(0, Math.min(100, +progress.percent));

	if (Number.isFinite(+progress.progress)) {
		const value = +progress.progress;
		const percent = value <= 1 ? value * 100 : value;

		return Math.max(0, Math.min(100, percent));
	}

	return 0;
}

function resolveReadStatus(progress = false, percent = 0) {
	if (!progress || typeof progress !== 'object')
		return 'unread';

	if (progress.completed || percent >= 99.5)
		return 'completed';

	if ((+progress.lastReading > 0) || percent > 0)
		return 'reading';

	return 'unread';
}

function buildSearchEntry(file) {
	if (file?._search && typeof file._search === 'object')
		return file._search;

	if (!searchContext)
		searchContext = createSearchContext();

	const metadata = getEntryMetadata(file, searchContext) || {};
	const labels = getEntryLabels(file, searchContext);
	const favorite = entryIsFavorite(file, searchContext);
	const progress = getEntryProgress(file, searchContext);

	const author = normalizeSearchText(metadata.author || file.metadataAuthor || '');
	const title = normalizeSearchText(metadata.title || file.metadataTitle || '');
	const source = normalizeSearchText(metadata.source || file.metadataSource || '');
	const seriesType = normalizeSearchText(metadata.seriesType || file.seriesType || '');
	const demographic = normalizeSearchText(metadata.demographic || file.metadataDemographic || '');

	const genres = normalizeSearchStringArray((Array.isArray(metadata.genres) ? metadata.genres : []).concat(Array.isArray(file.metadataGenres) ? file.metadataGenres : [], Array.isArray(file.genres) ? file.genres : []));
	const recommendationTags = normalizeSearchStringArray(metadata?.recommendation?.genreClusters || []);
	const tags = normalizeSearchStringArray([].concat(labels, genres, recommendationTags));

	const rating = extractMetadataRating(metadata);
	const year = extractMetadataYear(metadata);
	const confidence = Number.isFinite(+metadata.confidence) ? Math.max(0, Math.min(100, +metadata.confidence)) : 0;
	const readingTime = Number.isFinite(+metadata?.recommendation?.readingTimeMinutes) ? Math.max(0, +metadata.recommendation.readingTimeMinutes) : 0;
	const progressPercent = resolveProgressPercent(progress);
	const status = resolveReadStatus(progress, progressPercent);

	const hasMetadata = !!(author || title || source || seriesType || demographic || genres.length || rating > 0 || year > 0 || confidence > 0 || readingTime > 0);

	const name = file._nameN || normalizeSearchText(file.name || file._name || '');
	const path = file._pathN || normalizeSearchText(file.path || file._path || '');

	const textIndex = normalizeSearchText([
		name,
		path,
		title,
		author,
		source,
		seriesType,
		demographic,
		genres.join(' '),
		tags.join(' '),
		labels.join(' '),
		status,
		rating,
		year,
		confidence,
		readingTime,
		Math.round(progressPercent),
	].join(' '));

	file._search = {
		name,
		path,
		textIndex,
		author,
		title,
		source,
		seriesType,
		demographic,
		genres,
		tags,
		labels,
		rating,
		year,
		confidence,
		readingTime,
		progressPercent,
		status,
		hasMetadata,
		favorite,
		folder: !!file.folder,
		compressed: !!file.compressed,
	};

	return file._search;
}

function evaluateNumericQuery(entryValue = 0, op = ':', expectedValue = 0) {
	if (!Number.isFinite(entryValue))
		return false;

	if (op === '>')
		return entryValue > expectedValue;
	if (op === '>=')
		return entryValue >= expectedValue;
	if (op === '<')
		return entryValue < expectedValue;
	if (op === '<=')
		return entryValue <= expectedValue;

	return entryValue === expectedValue;
}

function evaluateStringQuery(text = '', values = [], exact = false) {
	if (!text || !Array.isArray(values) || !values.length)
		return false;

	for (let i = 0, len = values.length; i < len; i++) {
		if (exact ? (text === values[i]) : text.includes(values[i]))
			return true;
	}

	return false;
}

function evaluateListQuery(list = [], values = [], exact = false) {
	if (!Array.isArray(list) || !list.length || !Array.isArray(values) || !values.length)
		return false;

	for (let i = 0, len = values.length; i < len; i++) {
		const value = values[i];

		for (let i2 = 0, len2 = list.length; i2 < len2; i2++) {
			const item = list[i2];

			if (exact ? (item === value) : item.includes(value))
				return true;
		}
	}

	return false;
}

function normalizeStatusValue(value = '') {
	if (value === 'read' || value === 'done')
		return 'completed';

	if (value === 'inprogress' || value === 'in-progress' || value === 'started')
		return 'reading';

	return value;
}

function evaluateStatusField(entry, values = []) {
	for (let i = 0, len = values.length; i < len; i++) {
		const value = normalizeStatusValue(values[i]);

		if (value === 'tracked' && entry.hasMetadata)
			return true;
		if (value === 'untracked' && !entry.hasMetadata)
			return true;
		if (value === 'favorite' && entry.favorite)
			return true;
		if (value === 'folder' && entry.folder)
			return true;
		if (value === 'file' && !entry.folder)
			return true;

		if (entry.status === value)
			return true;
	}

	return false;
}

function evaluateTypeField(entry, values = []) {
	for (let i = 0, len = values.length; i < len; i++) {
		const value = values[i];

		if (value === 'folder' && entry.folder)
			return true;
		if (value === 'file' && !entry.folder)
			return true;
		if (value === 'compressed' && entry.compressed)
			return true;
		if (value === 'series' && (entry.folder || entry.compressed))
			return true;

		if (entry.seriesType && (entry.seriesType === value || entry.seriesType.includes(value)))
			return true;
	}

	return false;
}

function evaluateHasField(entry, values = []) {
	for (let i = 0, len = values.length; i < len; i++) {
		const value = values[i];

		switch (value) {
			case 'metadata':
			case 'tracked':
				if (entry.hasMetadata)
					return true;
				break;
			case 'author':
				if (!!entry.author)
					return true;
				break;
			case 'genre':
			case 'genres':
				if (entry.genres.length > 0)
					return true;
				break;
			case 'tag':
			case 'tags':
				if (entry.tags.length > 0)
					return true;
				break;
			case 'label':
			case 'labels':
				if (entry.labels.length > 0)
					return true;
				break;
			case 'rating':
				if (entry.rating > 0)
					return true;
				break;
			case 'year':
				if (entry.year > 0)
					return true;
				break;
			case 'source':
				if (!!entry.source)
					return true;
				break;
			case 'series':
			case 'seriestype':
				if (!!entry.seriesType)
					return true;
				break;
			case 'progress':
				if (entry.progressPercent > 0)
					return true;
				break;
			case 'favorite':
			case 'fav':
				if (entry.favorite)
					return true;
				break;
		}
	}

	return false;
}

function evaluateKeywordTerm(entry, term) {
	switch (term.key) {
		case 'status':
			return evaluateStatusField(entry, [term.value]);
		case 'favorite':
			return !!entry.favorite;
		case 'folder':
			return !!entry.folder;
		case 'file':
			return !entry.folder;
		case 'compressed':
			return !!entry.compressed;
		case 'tracked':
			return term.value ? !!entry.hasMetadata : !entry.hasMetadata;
	}

	return false;
}

function evaluateFieldTerm(entry, term) {
	const exact = term.op === '=';

	switch (term.field) {
		case 'author':
			return evaluateStringQuery(entry.author, term.values, exact);
		case 'title':
			return evaluateStringQuery(entry.title, term.values, exact);
		case 'name':
			return evaluateStringQuery(entry.name, term.values, exact);
		case 'path':
			return evaluateStringQuery(entry.path, term.values, exact);
		case 'genre':
			return evaluateListQuery(entry.genres, term.values, exact);
		case 'tag':
			return evaluateListQuery(entry.tags, term.values, exact);
		case 'label':
			return evaluateListQuery(entry.labels, term.values, exact);
		case 'status':
			return evaluateStatusField(entry, term.values);
		case 'type':
			return evaluateTypeField(entry, term.values);
		case 'source':
			return evaluateStringQuery(entry.source, term.values, exact);
		case 'seriesType':
			return evaluateStringQuery(entry.seriesType, term.values, exact);
		case 'demographic':
			return evaluateStringQuery(entry.demographic, term.values, exact);
		case 'has':
			return evaluateHasField(entry, term.values);
	}

	return false;
}

function evaluateSearchQuery(entry, parsedQuery) {
	for (let i = 0, len = parsedQuery.textTerms.length; i < len; i++) {
		const term = parsedQuery.textTerms[i];
		const matched = entry.textIndex.includes(term.value);

		if (term.negated ? matched : !matched)
			return false;
	}

	for (let i = 0, len = parsedQuery.terms.length; i < len; i++) {
		const term = parsedQuery.terms[i];
		let matched = false;

		if (term.kind === 'keyword')
			matched = evaluateKeywordTerm(entry, term);
		else if (term.kind === 'numeric')
			matched = evaluateNumericQuery(entry[term.field], term.op, term.value);
		else
			matched = evaluateFieldTerm(entry, term);

		if (term.negated ? matched : !matched)
			return false;
	}

	return true;
}

function quickTextMatch(file, parsedQuery) {
	const nameText = file._nameN || normalizeSearchText(file._name || file.name || '');
	const pathText = file._pathN || normalizeSearchText(file._path || file.path || '');

	let matchesName = true;
	let matchesPath = true;

	for (let i = 0, len = parsedQuery.textTerms.length; i < len; i++) {
		const term = parsedQuery.textTerms[i].value;

		if (!nameText.includes(term))
			matchesName = false;

		if (!pathText.includes(term))
			matchesPath = false;
	}

	return {
		matched: matchesName || matchesPath,
		pathOnly: !matchesName && matchesPath,
	};
}

function classifyPathOnlyMatch(entry, parsedQuery) {
	let hasPositive = false;
	let matchesName = true;
	let matchesPath = true;

	for (let i = 0, len = parsedQuery.textTerms.length; i < len; i++) {
		const term = parsedQuery.textTerms[i];

		if (term.negated)
			continue;

		hasPositive = true;

		if (!entry.name.includes(term.value))
			matchesName = false;

		if (!entry.path.includes(term.value))
			matchesPath = false;
	}

	if (!hasPositive)
		return false;

	return !matchesName && matchesPath;
}

function getSavedSearches() {
	let savedSearches = storage.get('savedSearches');

	if (!Array.isArray(savedSearches))
		savedSearches = [];

	const result = [];
	const seen = {};

	for (let i = 0, len = savedSearches.length; i < len; i++) {
		const value = normalizeSearchInput(savedSearches[i]);
		const key = normalizeSearchText(value);

		if (!value || !key || seen[key])
			continue;

		seen[key] = true;
		result.push(value);

		if (result.length >= SAVED_SEARCHES_LIMIT)
			break;
	}

	return result;
}

function setSavedSearches(savedSearches = []) {
	if (!Array.isArray(savedSearches))
		savedSearches = [];

	const normalized = [];
	const seen = {};

	for (let i = 0, len = savedSearches.length; i < len; i++) {
		const value = normalizeSearchInput(savedSearches[i]);
		const key = normalizeSearchText(value);

		if (!value || !key || seen[key])
			continue;

		seen[key] = true;
		normalized.push(value);

		if (normalized.length >= SAVED_SEARCHES_LIMIT)
			break;
	}

	storage.set('savedSearches', normalized);
}

function isSavedSearch(text = '') {
	const normalized = normalizeSearchText(text);

	if (!normalized)
		return false;

	const savedSearches = getSavedSearches();

	for (let i = 0, len = savedSearches.length; i < len; i++) {
		if (normalizeSearchText(savedSearches[i]) === normalized)
			return true;
	}

	return false;
}

function toggleSavedSearch(text = '') {
	const inputValue = normalizeSearchInput(text);
	if (!inputValue)
		return false;

	const key = normalizeSearchText(inputValue);
	const savedSearches = getSavedSearches();
	const nextSavedSearches = [];
	let removed = false;

	for (let i = 0, len = savedSearches.length; i < len; i++) {
		if (normalizeSearchText(savedSearches[i]) === key) {
			removed = true;
			continue;
		}

		nextSavedSearches.push(savedSearches[i]);
	}

	if (!removed)
		nextSavedSearches.unshift(inputValue);

	setSavedSearches(nextSavedSearches);

	const input = document.querySelector('.search-bar > div input');
	if (input)
		search(input.value || '');

	return !removed;
}

function buildSavedSearchActionResult(text = '') {
	const value = normalizeSearchInput(text);
	if (!value)
		return false;

	const saved = isSavedSearch(value);
	const escapedValue = escapeQuotes(escapeBackSlash(value), 'simples');

	return {
		icon: saved ? 'bookmark_remove' : 'bookmark_add',
		text: saved ? ('Remove saved search: ' + value) : ('Save search: ' + value),
		click: 'dom.search.toggleSavedSearch(\'' + escapedValue + '\')',
	};
}

function stripMainPath(path = '', mainPath = '') {
	if (typeof path !== 'string' || !path)
		return '';

	if (typeof mainPath !== 'string' || !mainPath)
		return path;

	const normalizedPath = p.normalize(path);
	const normalizedMainPath = p.normalize(mainPath);

	if (normalizedPath.toLowerCase().startsWith(normalizedMainPath.toLowerCase())) {
		let relativePath = normalizedPath.slice(normalizedMainPath.length);

		if (relativePath.startsWith(p.sep))
			relativePath = relativePath.slice(1);

		return relativePath;
	}

	return path;
}

var searchAbort = {}, searchAbortIndex = 0;
var searchContext = false;

function abortAll() {
	for (let key in searchAbort) {
		delete searchAbort[key];
	}
}

function isAborted(index) {
	if (searchAbort[index])
		return false;
	else
		return true;
}

async function search(text) {
	text = normalizeSearchInput(text);

	if (!text) {
		if (filterCurrentPage) {
			dom.queryAll('.content-view-module > div, .content-view-list > div, .boxes').css({ display: '' });

			dom.scroll.useTempIndex(false);
			dom.scroll.check();

			setResults([]);
			return;
		}

		showRecentlySearched();

		return;
	}

	if (fileManager.isOpds(dom.history.path)) {
		setResults([]);

		return;
	}

	abortAll();

	const index = searchAbortIndex++;
	searchAbort[index] = 1;

	const parsedQuery = parseSearchQuery(text);

	let matchesName = [];
	let matchesPath = [];

	let firstIndex = true;

	toBreak:
	for (let i = 0, len = files.length; i < len; i++) {
		let group = files[i];

		if (group.files === false && !filterCurrentPage) {
			if (firstIndex)
				showLoading();

			firstIndex = false;

			files[i].files = await _indexFiles(group.file, group.mainPath, true);
		}

		if (isAborted(index)) return;

		if (!Array.isArray(group.files))
			continue;

		for (let i2 = 0, len2 = group.files.length; i2 < len2; i2++) {
			let file = group.files[i2];
			let matched = false;
			let pathOnly = false;

			if (parsedQuery.quickTextOnly) {
				const quickMatch = quickTextMatch(file, parsedQuery);
				matched = quickMatch.matched;
				pathOnly = quickMatch.pathOnly;
			}
			else {
				const entry = buildSearchEntry(file);
				matched = evaluateSearchQuery(entry, parsedQuery);
				pathOnly = matched ? classifyPathOnlyMatch(entry, parsedQuery) : false;
			}

			if (matched) {
				if (pathOnly && matchesPath.length < SEARCH_PATH_RESULT_LIMIT) {
					file.matchPath = true;
					matchesPath.push(file);
				}
				else if (!pathOnly && matchesName.length < SEARCH_RESULT_LIMIT) {
					file.matchPath = false;
					matchesName.push(file);
				}
			}

			if (!filterCurrentPage && matchesName.length >= SEARCH_RESULT_LIMIT && matchesPath.length >= SEARCH_PATH_RESULT_LIMIT)
				break toBreak;
		}
	}

	let matches = [...matchesName, ...matchesPath];

	if (isAborted(index)) return;

	if (filterCurrentPage) {
		let indexs = {};

		for (let i = 0, len = matches.length; i < len; i++) {
			indexs[matches[i].index] = matches[i];
		}

		let contentRight = template._contentRight();
		let elements = contentRight.querySelectorAll('div:not(.box-content) > .content-view-module > div, div:not(.box-content) > .content-view-list > div');

		dom.scroll.useTempIndex(true, true);
		let tempIndex = 0;

		for (let i = 0, len = elements.length; i < len; i++) {
			const element = elements[i];
			const data = indexs[i];

			if (data)
				element.style.display = '';
			else
				element.style.display = 'none';

			if (data) {
				dom.scroll.setStatusIndex(data.index, {
					tempIndex,
				});

				tempIndex++;
			}
		}

		dom.scroll.check();

		dom.queryAll('.boxes').css({ display: 'none' });

		setResults([]);
	}
	else {
		cache.cleanQueue();
		cache.stopQueue();

		let totalResults = 0;

		let results = [];

		let len = matches.length;

		if (len > 0) {
			let images = [];

			for (let i = 0; i < len; i++) {
				let file = matches[i];

				if (!file.folder && !file.compressed) {
					let sha = sha1(file.path);
					matches[i].sha = sha;

					images.push(matches[i]);
				}

			}

			let thumbnails = cache.returnThumbnailsImages(images, function (data) {

				dom.addImageToDom(data.sha, data.path);

			}, fileManager.file(false, { cacheServer: true }));

			for (let i = 0, len = matches.length; i < len; i++) {
				let file = matches[i];

				let click = '';
				let image = {};

				if (file.folder || file.compressed) {
					click = 'dom.loadIndexPage(true, \'' + escapeQuotes(escapeBackSlash(file.path), 'simples') + '\', false, false, \'' + escapeQuotes(escapeBackSlash(file.mainPath), 'simples') + '\', false, true)';
				}
				else {
					let thumbnail = thumbnails[file.sha] || false;

					image.sha = file.sha;
					image.thumbnail = (thumbnail && thumbnail.cache) ? thumbnail.path : '';

					click = 'dom.openComic(true, \'' + escapeQuotes(escapeBackSlash(file.path), 'simples') + '\', \'' + escapeQuotes(escapeBackSlash(file.mainPath), 'simples') + '\')';
				}

				let text = file.matchPath ? stripMainPath(file.path, file.mainPath) : file.name;

				results.push({
					icon: file.compressed ? 'folder_zip' : (file.folder ? 'folder' : ''),
					image: image,
					text: text,
					click: 'dom.search.saveRecentlySearched(); dom.search.hide(); ' + click,
				});

				totalResults++;

				if (totalResults >= SEARCH_RESULT_LIMIT)
					break;
			}
		}

		if (isAborted(index)) return;

		const savedSearchAction = buildSavedSearchActionResult(text);
		if (savedSearchAction)
			results.unshift(savedSearchAction);

		setResults(results);
		cache.resumeQueue();
	}
}

function searchClick(event) {
	if (!showed) return;

	if (!event.target.closest('.search-bar, .button-search')) {
		if (filterCurrentPage) {
			let gamepadItem = event.target.closest('.gamepad-item');

			if ((!gamepadItem || !gamepadItem.closest('.content-right')))
				dom.queryAll('.content-view-module > div, .content-view-list > div, .boxes').css({ display: '' });
			else
				saveRecentlySearched();

			dom.scroll.useTempIndex(false);
			dom.scroll.check();
		}

		hide(true);
	}
}

var fromFillInput = false;

function keyup(event) {
	const text = this.value;

	if (event.keyCode != 37 && event.keyCode != 38 && event.keyCode != 39 && event.keyCode != 40 && event.keyCode != 13) {
		// Debounced: search() scans the whole index synchronously, so running it on every
		// keystroke stalls typing on large libraries. The throttle bound keeps it responsive.
		app.setThrottle('dom-search-input', function () {
			search(text);
		}, 120, 400);
	}
	else if (text && filterCurrentPage && (event.keyCode == 13 || event.keyCode == 40) && !fromFillInput) {
		if (fileManager.isOpds(dom.history.path))
			opds.search.request(text);

		hide(true);
		saveRecentlySearched();

		gamepad.updateBrowsableItems('search', true);
	}

	fromFillInput = false;
}

function showRecentlySearched() {
	let recentlySearched = storage.get('recentlySearched');

	if (!Array.isArray(recentlySearched))
		recentlySearched = [];

	const savedSearches = getSavedSearches();
	let results = [];
	const seen = {};

	for (let i = 0, len = savedSearches.length; i < len; i++) {
		if (i >= SAVED_SEARCHES_SHOW_LIMIT)
			break;

		const value = normalizeSearchInput(savedSearches[i]);
		const key = normalizeSearchText(value);

		if (!value || !key || seen[key])
			continue;

		seen[key] = true;

		results.push({
			icon: 'bookmark',
			text: value,
			click: 'dom.search.fillInput(\'' + escapeQuotes(escapeBackSlash(value), 'simples') + '\')',
		});
	}

	for (let i = 0, len = recentlySearched.length; i < len; i++) {
		const value = normalizeSearchInput(recentlySearched[i]);
		const key = normalizeSearchText(value);

		if (!value || !key || seen[key])
			continue;

		seen[key] = true;

		results.push({
			icon: 'history',
			text: value,
			click: 'dom.search.fillInput(\'' + escapeQuotes(escapeBackSlash(value), 'simples') + '\')',
		});

		if (results.length >= (RECENT_SEARCHES_LIMIT + SAVED_SEARCHES_SHOW_LIMIT))
			break;
	}

	setResults(results);
}

function showLoading() {
	const searchBarResults = document.querySelector('.search-bar-results');

	searchBarResults.innerHTML = template.load('loading.html');
	searchBarResults.classList.add('active');

	if (+searchBarResults.dataset.height < 200) {
		const height = 200;
		searchBarResults.style.height = height + 'px';
		searchBarResults.dataset.height = height;
	}
}

function saveRecentlySearched() {
	let input = document.querySelector('.search-bar > div input');
	let text = normalizeSearchInput(input.value);

	if (!text)
		return;

	let recentlySearched = storage.get('recentlySearched');

	if (!Array.isArray(recentlySearched))
		recentlySearched = [];

	const key = normalizeSearchText(text);
	const deduplicated = [text];
	const seen = {
		[key]: true,
	};

	for (let i = 0, len = recentlySearched.length; i < len; i++) {
		const value = normalizeSearchInput(recentlySearched[i]);
		const valueKey = normalizeSearchText(value);

		if (!value || !valueKey || seen[valueKey])
			continue;

		seen[valueKey] = true;
		deduplicated.push(value);

		if (deduplicated.length >= RECENT_SEARCHES_LIMIT)
			break;
	}

	storage.set('recentlySearched', deduplicated);
}

var updateBrowsableItemsST = false;

function setResults(results) {
	clearTimeout(updateBrowsableItemsST);

	handlebarsContext.searchResults = results;

	let len = results.length;

	let searchBarResults = document.querySelector('.search-bar-results');

	let height = (len * 56);

	if (height > window.innerHeight - 136 - titleBar.height())
		height = window.innerHeight - 136 - titleBar.height();

	searchBarResults.style.height = height + 'px';
	searchBarResults.innerHTML = template.load('search.results.html');
	searchBarResults.dataset.height = height;

	if (len > 0)
		searchBarResults.classList.add('active');
	else
		searchBarResults.classList.remove('active');

	if (document.querySelector('.search-bar.active')) {
		updateBrowsableItemsST = setTimeout(function () {

			gamepad.updateBrowsableItems('search', true);

		}, 300);
	}
}

var files = [], filesHas = {};

async function _indexFiles(file, mainPath, first = false) {
	let files = [];

	return new Promise(async function (resolve) {

		if (!filesHas[file.path]) {
			filesHas[file.path] = true;

			if (!first) {
				const relativePath = file.path.replace(new RegExp('^\s*' + pregQuote(file.mainPath)), '');

				files.push({
					name: file.name,
					_name: removeDiacritics(file.name),
					_nameN: normalizeSearchText(file.name),
					path: file.path,
					_path: removeDiacritics(relativePath),
					_pathN: normalizeSearchText(relativePath),
					mainPath: mainPath,
					folder: file.folder,
					compressed: file.compressed,
					_search: false,
					_searchLookupPaths: false,
					_trackingMetadata: false,
					_searchLabels: false,
					_searchProgress: false,
					_isFavorite: undefined,
				});
			}

			if (file.folder) {
				let _files;

				if (file.files) {
					_files = fileManager.filtered(file.files);
				}
				else {
					let _file = fileManager.file(file.path, { cacheServer: true });

					try {
						_files = await _file.read({ sha: false, sort: false });
					}
					catch (error) {
						// Never rethrow from inside this async executor: the rejection would be
						// swallowed, resolve() would never run and the whole search would hang
						// on an unreadable folder.
						console.error(error);
					}
					finally {
						_file.destroy();
					}
				}

				if (!Array.isArray(_files))
					_files = [];

				let promises = [];

				for (let i = 0, len = _files.length; i < len; i++) {
					let _file = _files[i];
					promises.push(_indexFiles(_file, mainPath));

					if (promises.length > 4 || i + 1 === len) {
						const results = await Promise.all(promises);

						for (let i = 0, len = results.length; i < len; i++) {
							files = files.concat(results[i]);
						}

						promises = [];
					}
				}

				resolve(files);
			}
			else {
				resolve(files);
			}
		}
		else {
			resolve(files);
		}

	});
}

async function indexFiles() {
	let currentFiles = handlebarsContext.comics;
	searchContext = false;

	files = [{
		file: false,
		mainPath: false,
		files: [],
	}];
	filesHas = {};

	const _files = [];

	for (let i = 0, len = currentFiles.length; i < len; i++) {
		let file = currentFiles[i];
		const relativePath = file.path.replace(new RegExp('^\s*' + pregQuote(file.mainPath)), '');

		files.push({
			file: file,
			mainPath: file.mainPath,
			files: false,
		});

		_files.push({
			name: file.name,
			_name: removeDiacritics(file.name),
			_nameN: normalizeSearchText(file.name),
			path: file.path,
			_path: removeDiacritics(relativePath),
			_pathN: normalizeSearchText(relativePath),
			mainPath: file.mainPath,
			folder: file.folder,
			compressed: file.compressed,
			_search: false,
			_searchLookupPaths: false,
			_trackingMetadata: false,
			_searchLabels: false,
			_searchProgress: false,
			_isFavorite: undefined,
		});
	}

	files[0].files = _files;
}

async function indexFilesDom() {
	if (fileManager.isOpds(dom.history.path))
		return;

	searchContext = false;

	let currentFiles = handlebarsContext.comics;

	let _files = [];

	for (let i = 0, len = currentFiles.length; i < len; i++) {
		let file = currentFiles[i];
		const relativePath = (file.path && file.mainPath) ? file.path.replace(new RegExp('^\s*' + pregQuote(file.mainPath)), '') : '';

		_files.push({
			index: i,
			name: file.name,
			_name: removeDiacritics(file.name),
			_nameN: normalizeSearchText(file.name),
			path: file.path,
			_path: removeDiacritics(relativePath),
			_pathN: normalizeSearchText(relativePath),
			mainPath: file.mainPath,
			folder: file.folder,
			compressed: file.compressed,
			_search: false,
			_searchLookupPaths: false,
			_trackingMetadata: false,
			_searchLabels: false,
			_searchProgress: false,
			_isFavorite: undefined,
		});
	}

	files = [{
		path: 'dom',
		mainPath: false,
		files: _files,
	}];
}

var showed = false, filterCurrentPage = false;

function showHide(_filterCurrentPage = false) {
	if (showed) return hide();

	clearTimeout(updateBrowsableItemsST);
	clearTimeout(hideST);

	let searchBarResults = document.querySelector('.search-bar-results');
	let height = +searchBarResults.dataset.height;

	if (height > window.innerHeight - 136 - titleBar.height()) {
		height = window.innerHeight - 136 - titleBar.height();
		searchBarResults.style.height = height + 'px';
	}

	filterCurrentPage = _filterCurrentPage;

	let search = document.querySelector('.search-bar');
	search.classList.remove('disable');
	search.classList.add('active');

	let input = document.querySelector('.search-bar > div input');
	input.value = '';
	input.placeholder = filterCurrentPage ? (language.global.filterCurrentPage || language.global.search || 'Filter') : (language.global.search || 'Search');
	input.focus();

	updateBrowsableItemsST = setTimeout(function () {

		gamepad.updateBrowsableItems('search', true);

	}, 300);

	if (filterCurrentPage) {
		indexFilesDom();
		document.querySelector('.search-bar > span').style.display = 'none';
		setResults([]);
	}
	else {
		indexFiles();
		document.querySelector('.search-bar > span').style.display = '';
		showRecentlySearched();
	}

	app.event(window, 'click', searchClick, { capture: true });

	showed = true;
}

let hideST = false;

async function hide(fromSearchClick = false) {
	if (!showed) return;

	abortAll();

	clearTimeout(updateBrowsableItemsST);
	clearTimeout(hideST);

	let search = document.querySelector('.search-bar');
	search.classList.remove('active');
	search.classList.add('disable');

	let input = document.querySelector('.search-bar > div input');
	input.blur();
	input.placeholder = language.global.search || 'Search';

	app.eventOff(window, 'click', searchClick, { capture: true });

	if (filterCurrentPage && !fromSearchClick) {
		dom.queryAll('.content-view-module > div, .content-view-list > div, .boxes').css({ display: '' });

		dom.scroll.useTempIndex(false);
		dom.scroll.check();
	}

	if (!filterCurrentPage)
		hideST = setTimeout(showRecentlySearched, 500);
	else
		setResults([]);

	showed = false;
	files = [];
	filesHas = {};
	searchContext = false;
}

function fillInput(text) {
	fromFillInput = true;

	let input = document.querySelector('.search-bar > div input');
	input.value = text;

	search(text);

	if (fileManager.isOpds(dom.history.path)) {
		opds.search.request(text);

		hide(true);
		saveRecentlySearched();

		gamepad.updateBrowsableItems('search', true);
	}
}

module.exports = {
	showHide: showHide,
	keyup: keyup,
	hide: hide,
	fillInput: fillInput,
	toggleSavedSearch: toggleSavedSearch,
	saveRecentlySearched: saveRecentlySearched,
	files: function () { return files },
	start: function () {

		hideST = setTimeout(showRecentlySearched, 500);

	},
};
