const METADATA_SCHEMA_VERSION = 1;

const ALLOWED_SOURCES = new Set([
	'',
	'anilist',
	'manual',
	'import',
]);

const ALLOWED_DEMOGRAPHICS = new Set([
	'',
	'shonen',
	'seinen',
	'shojo',
	'josei',
	'kodomomuke',
]);

function normalizeString(value, maxLength = 0)
{
	if(typeof value !== 'string')
		value = value === undefined || value === null ? '' : String(value);

	value = value.replace(/\s+/g, ' ').trim();

	if(maxLength > 0)
		value = value.slice(0, maxLength);

	return value;
}

function normalizeStringArray(value, maxItems = 20, maxLength = 64)
{
	if(!Array.isArray(value))
		return [];

	const result = [];
	const seen = new Set();

	for(let i = 0, len = value.length; i < len; i++)
	{
		const current = normalizeString(value[i], maxLength);
		const key = current.toLowerCase();

		if(!current || seen.has(key))
			continue;

		seen.add(key);
		result.push(current);

		if(result.length >= maxItems)
			break;
	}

	return result;
}

function normalizeYear(value)
{
	const year = Math.floor(Number(value));

	if(!Number.isFinite(year))
		return 0;

	return (year >= 1000 && year <= 3000) ? year : 0;
}

function normalizeInteger(value, min = 0, max = Number.MAX_SAFE_INTEGER)
{
	let number = Number(value);

	if(!Number.isFinite(number))
		number = min;

	number = Math.floor(number);

	if(number < min)
		number = min;
	if(number > max)
		number = max;

	return number;
}

function normalizeSource(value)
{
	const source = normalizeString(value, 20).toLowerCase();
	return ALLOWED_SOURCES.has(source) ? source : '';
}

function normalizeDemographic(value)
{
	const demographic = normalizeString(value, 20).toLowerCase();
	return ALLOWED_DEMOGRAPHICS.has(demographic) ? demographic : '';
}

function createDefaultFolderMetadata()
{
	return {
		version: METADATA_SCHEMA_VERSION,
		anilistId: 0,
		title: '',
		author: '',
		demographic: '',
		genres: [],
		description: '',
		serializationYear: 0,
		recommendation: {
			readingTimeMinutes: 0,
			genreClusters: [],
		},
		source: '',
		confidence: 0,
		createdAt: 0,
		updatedAt: 0,
	};
}

function sanitizeFolderMetadata(input = {}, now = Date.now())
{
	if(!input || typeof input !== 'object' || Array.isArray(input))
		input = {};

	now = normalizeInteger(now, 0);

	const recommendation = (input.recommendation && typeof input.recommendation === 'object' && !Array.isArray(input.recommendation)) ? input.recommendation : {};
	const createdAt = normalizeInteger(input.createdAt, 0);
	const updatedAt = normalizeInteger(input.updatedAt, 0);

	const metadata = createDefaultFolderMetadata();

	metadata.version = METADATA_SCHEMA_VERSION;
	metadata.anilistId = normalizeInteger(input.anilistId, 0);
	metadata.title = normalizeString(input.title, 256);
	metadata.author = normalizeString(input.author, 120);
	metadata.demographic = normalizeDemographic(input.demographic);
	metadata.genres = normalizeStringArray(input.genres, 20, 48);
	metadata.description = normalizeString(input.description, 8000);
	metadata.serializationYear = normalizeYear(input.serializationYear);
	metadata.recommendation = {
		readingTimeMinutes: normalizeInteger(recommendation.readingTimeMinutes, 0, 1000000),
		genreClusters: normalizeStringArray(recommendation.genreClusters, 20, 48),
	};
	metadata.source = normalizeSource(input.source);
	metadata.confidence = normalizeInteger(input.confidence, 0, 100);
	metadata.createdAt = createdAt || (now || 0);
	metadata.updatedAt = updatedAt || (now || metadata.createdAt);

	return metadata;
}

function validateFolderMetadata(input = {})
{
	const errors = [];

	if(!input || typeof input !== 'object' || Array.isArray(input))
	{
		return {
			valid: false,
			errors: ['metadata must be an object'],
		};
	}

	if(input.version !== METADATA_SCHEMA_VERSION)
		errors.push('version must be 1');

	if(!Number.isInteger(input.anilistId) || input.anilistId < 0)
		errors.push('anilistId must be a non-negative integer');

	if(typeof input.title !== 'string')
		errors.push('title must be a string');

	if(typeof input.author !== 'string')
		errors.push('author must be a string');

	if(typeof input.demographic !== 'string' || !ALLOWED_DEMOGRAPHICS.has(input.demographic))
		errors.push('demographic must be one of the allowed values');

	if(!Array.isArray(input.genres))
		errors.push('genres must be an array of strings');

	if(typeof input.description !== 'string')
		errors.push('description must be a string');

	if(!Number.isInteger(input.serializationYear) || input.serializationYear < 0)
		errors.push('serializationYear must be a non-negative integer');

	if(!input.recommendation || typeof input.recommendation !== 'object' || Array.isArray(input.recommendation))
	{
		errors.push('recommendation must be an object');
	}
	else
	{
		if(!Number.isInteger(input.recommendation.readingTimeMinutes) || input.recommendation.readingTimeMinutes < 0)
			errors.push('recommendation.readingTimeMinutes must be a non-negative integer');

		if(!Array.isArray(input.recommendation.genreClusters))
			errors.push('recommendation.genreClusters must be an array of strings');
	}

	if(typeof input.source !== 'string' || !ALLOWED_SOURCES.has(input.source))
		errors.push('source must be one of the allowed values');

	if(!Number.isInteger(input.confidence) || input.confidence < 0 || input.confidence > 100)
		errors.push('confidence must be an integer between 0 and 100');

	if(!Number.isInteger(input.createdAt) || input.createdAt < 0)
		errors.push('createdAt must be a non-negative integer');

	if(!Number.isInteger(input.updatedAt) || input.updatedAt < 0)
		errors.push('updatedAt must be a non-negative integer');

	return {
		valid: errors.length === 0,
		errors: errors,
	};
}

function validateRequiredFolderMetadata(input = {})
{
	const metadata = sanitizeFolderMetadata(input, Date.now());
	const errors = [];

	if(!metadata.title)
		errors.push('title is required');

	if(!metadata.author)
		errors.push('author is required');

	if(!metadata.demographic)
		errors.push('demographic is required');

	if(!Array.isArray(metadata.genres) || !metadata.genres.length)
		errors.push('at least one genre is required');

	if(!metadata.description)
		errors.push('description is required');

	if(!metadata.serializationYear)
		errors.push('serializationYear is required');

	if(!metadata.anilistId)
		errors.push('anilistId is required');

	if(!metadata.source)
		errors.push('source is required');

	if(!Number.isInteger(metadata.confidence) || metadata.confidence < 0 || metadata.confidence > 100)
		errors.push('confidence must be an integer between 0 and 100');

	return {
		valid: errors.length === 0,
		errors: errors,
		metadata: metadata,
	};
}

module.exports = {
	METADATA_SCHEMA_VERSION,
	createDefaultFolderMetadata,
	sanitizeFolderMetadata,
	validateFolderMetadata,
	validateRequiredFolderMetadata,
};
