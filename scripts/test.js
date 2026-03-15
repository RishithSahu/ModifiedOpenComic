const fs = require('fs');
const assert = require('assert');
const folderMetadataSchema = require('./tracking/folder-metadata.js');
const folderTitle = require('./tracking/folder-title.js');
const recommendations = require('./tracking/recommendations.js');

function exists(path, permissions = false, fix = false)
{
	if(!fs.existsSync(path))
		throw new Error('Not exists! '+path+(fix ? '\n\nTry: '+fix : '')+'\n');

	if(permissions !== false)
	{
		try
		{
			fs.accessSync(path, permissions);
		}
		catch (error)
		{
			throw new Error('No access! '+path+', '+error.message);
		}
	}
}

if(process.platform == 'darwin')
{
	// Node ZSTD All
	exists('./node_modules/@toondepauw/node-zstd-darwin-x64/node-zstd.darwin-x64.node', fs.constants.R_OK);
	exists('./node_modules/@toondepauw/node-zstd-darwin-arm64/node-zstd.darwin-arm64.node', fs.constants.R_OK);

	// Sharp x64
	exists('./node_modules/@img/sharp-libvips-darwin-x64/lib/libvips-cpp.8.17.3.dylib', fs.constants.R_OK, 'npm install --cpu=x64 --os=darwin sharp');
	exists('./node_modules/@img/sharp-darwin-x64/lib/sharp-darwin-x64.node', fs.constants.R_OK, 'npm install --cpu=x64 --os=darwin sharp');

	// Sharp arm64
	exists('./node_modules/@img/sharp-libvips-darwin-arm64/lib/libvips-cpp.8.17.3.dylib', fs.constants.R_OK, 'npm install --cpu=arm64 --os=darwin sharp');
	exists('./node_modules/@img/sharp-darwin-arm64/lib/sharp-darwin-arm64.node', fs.constants.R_OK, 'npm install --cpu=arm64 --os=darwin sharp');

	// 7zip
	exists('./node_modules/7zip-bin-full/mac/arm64/7zz', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/7zip-bin-full/mac/x64/7zz', fs.constants.X_OK | fs.constants.R_OK);

	// OpenComicAI
	exists('./node_modules/opencomic-ai-bin/mac/arm64/realcugan/realcugan-ncnn-vulkan.app', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/opencomic-ai-bin/mac/arm64/waifu2x/waifu2x-ncnn-vulkan.app', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/opencomic-ai-bin/mac/arm64/upscayl/upscayl-bin.app', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/opencomic-ai-bin/mac/x64/realcugan/realcugan-ncnn-vulkan.app', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/opencomic-ai-bin/mac/x64/waifu2x/waifu2x-ncnn-vulkan.app', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/opencomic-ai-bin/mac/x64/upscayl/upscayl-bin.app', fs.constants.X_OK | fs.constants.R_OK);

}
else if(process.platform == 'linux')
{	
	// Node ZSTD All
	exists('./node_modules/@toondepauw/node-zstd-linux-x64-gnu/node-zstd.linux-x64-gnu.node', fs.constants.R_OK);
	exists('./node_modules/@toondepauw/node-zstd-linux-arm64-gnu/node-zstd.linux-arm64-gnu.node', fs.constants.R_OK);

	// Sharp x64
	exists('./node_modules/@img/sharp-libvips-linux-x64/lib/libvips-cpp.so.8.17.3', fs.constants.R_OK);
	exists('./node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64.node', fs.constants.R_OK);

	// Sharp arm64
	exists('./node_modules/@img/sharp-libvips-linux-arm64/lib/libvips-cpp.so.8.17.3', fs.constants.R_OK, 'npm install --cpu=arm64 --os=linux --libc=glibc sharp');
	exists('./node_modules/@img/sharp-linux-arm64/lib/sharp-linux-arm64.node', fs.constants.R_OK, 'npm install --cpu=arm64 --os=linux --libc=glibc sharp');

	// 7zip
	exists('./node_modules/7zip-bin-full/linux/arm/7zz', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/7zip-bin-full/linux/arm64/7zz', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/7zip-bin-full/linux/ia32/7zz', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/7zip-bin-full/linux/x64/7zz', fs.constants.X_OK | fs.constants.R_OK);

	// OpenComicAI
	exists('./node_modules/opencomic-ai-bin/linux/arm64/realcugan/realcugan-ncnn-vulkan', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/opencomic-ai-bin/linux/arm64/waifu2x/waifu2x-ncnn-vulkan', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/opencomic-ai-bin/linux/arm64/upscayl/upscayl-bin', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/opencomic-ai-bin/linux/x64/realcugan/realcugan-ncnn-vulkan', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/opencomic-ai-bin/linux/x64/waifu2x/waifu2x-ncnn-vulkan', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/opencomic-ai-bin/linux/x64/upscayl/upscayl-bin', fs.constants.X_OK | fs.constants.R_OK);
}
else if(process.platform == 'win32')
{
	// Node ZSTD All
	exists('./node_modules/@toondepauw/node-zstd-win32-x64-msvc/node-zstd.win32-x64-msvc.node', fs.constants.R_OK);

	// Sharp x64
	exists('./node_modules/@img/sharp-win32-x64/lib/libvips-42.dll', fs.constants.R_OK);
	exists('./node_modules/@img/sharp-win32-x64/lib/libvips-cpp-8.17.3.dll', fs.constants.R_OK);
	exists('./node_modules/@img/sharp-win32-x64/lib/sharp-win32-x64.node', fs.constants.R_OK);

	// Sharp arm64
	exists('./node_modules/@img/sharp-win32-arm64/lib/libvips-42.dll', fs.constants.R_OK, 'npm install --cpu=arm64 --os=win32 sharp');
	exists('./node_modules/@img/sharp-win32-arm64/lib/libvips-cpp-8.17.3.dll', fs.constants.R_OK, 'npm install --cpu=arm64 --os=win32 sharp');
	exists('./node_modules/@img/sharp-win32-arm64/lib/sharp-win32-arm64.node', fs.constants.R_OK, 'npm install --cpu=arm64 --os=win32 sharp');

	// 7zip
	exists('./node_modules/7zip-bin-full/win/x64/7z.exe', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/7zip-bin-full/win/x64/7z.dll', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/7zip-bin-full/win/arm64/7z.exe', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/7zip-bin-full/win/arm64/7z.dll', fs.constants.X_OK | fs.constants.R_OK);

	// OpenComicAI
	exists('./node_modules/opencomic-ai-bin/win/x64/realcugan/realcugan-ncnn-vulkan.exe', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/opencomic-ai-bin/win/x64/waifu2x/waifu2x-ncnn-vulkan.exe', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/opencomic-ai-bin/win/x64/upscayl/upscayl-bin.exe', fs.constants.X_OK | fs.constants.R_OK);
	exists('./node_modules/opencomic-ai-bin/win/arm64/upscayl/upscayl-bin.exe', fs.constants.X_OK | fs.constants.R_OK);
}

const now = 1730000000000;

const sanitized = folderMetadataSchema.sanitizeFolderMetadata({
	version: 999,
	anilistId: '1234',
	title: '  Aho   Girl  ',
	author: ' Hiroyuki ',
	demographic: 'Seinen',
	genres: ['Comedy', 'Comedy', ' Slice of Life '],
	description: 42,
	serializationYear: '2012',
	recommendation: {
		readingTimeMinutes: '120',
		genreClusters: ['Comedy', 'School', 'Comedy'],
	},
	source: 'AniList',
	confidence: '80',
	createdAt: 0,
	updatedAt: 0,
}, now);

assert.equal(sanitized.version, 1);
assert.equal(sanitized.anilistId, 1234);
assert.equal(sanitized.title, 'Aho Girl');
assert.equal(sanitized.author, 'Hiroyuki');
assert.equal(sanitized.demographic, 'seinen');
assert.deepEqual(sanitized.genres, ['Comedy', 'Slice of Life']);
assert.equal(sanitized.serializationYear, 2012);
assert.equal(sanitized.recommendation.readingTimeMinutes, 120);
assert.deepEqual(sanitized.recommendation.genreClusters, ['Comedy', 'School']);
assert.equal(sanitized.source, 'anilist');
assert.equal(sanitized.confidence, 80);
assert.equal(sanitized.createdAt, now);
assert.equal(sanitized.updatedAt, now);

const validation = folderMetadataSchema.validateFolderMetadata(sanitized);
assert.equal(validation.valid, true);
assert.deepEqual(validation.errors, []);

const requiredValidation = folderMetadataSchema.validateRequiredFolderMetadata(sanitized);
assert.equal(requiredValidation.valid, true);
assert.deepEqual(requiredValidation.errors, []);

const invalidValidation = folderMetadataSchema.validateFolderMetadata({
	version: 1,
	anilistId: -1,
	title: '',
	author: '',
	demographic: 'unknown',
	genres: 'bad',
	description: '',
	serializationYear: -1,
	recommendation: null,
	source: 'bad',
	confidence: 101,
	createdAt: -1,
	updatedAt: -1,
});

assert.equal(invalidValidation.valid, false);
assert.ok(invalidValidation.errors.length > 0);

const missingRequiredValidation = folderMetadataSchema.validateRequiredFolderMetadata({
	title: '',
	author: '',
	demographic: '',
	genres: [],
	description: '',
	serializationYear: 0,
	anilistId: 0,
	source: '',
	confidence: 50,
});

assert.equal(missingRequiredValidation.valid, false);
assert.ok(missingRequiredValidation.errors.length >= 8);

const candidates = folderTitle.extractCandidatesFromFolderPath("D:\\Rishith\\Manga\\1. Completed Series\\Ao-chan Can't Study!", [
	'chapter 001',
	'Ao-chan Can\'t Study!',
]);

assert.ok(Array.isArray(candidates));
assert.ok(candidates.length > 0);
assert.equal(candidates[0], "Ao-chan Can't Study!");

const ranked = folderTitle.rankSearchResults(['Ao-chan Cant Study'], [
	{
		id: 1,
		title: 'Ao-chan Can\'t Study!',
		titleRomaji: 'Midara na Ao-chan wa Benkyou ga Dekinai',
	},
	{
		id: 2,
		title: 'Horimiya',
	},
]);

assert.equal(ranked[0].id, 1);
assert.ok(ranked[0].score > ranked[1].score);

const rankedYearAware = folderTitle.rankSearchResults(['Blue Lock'], [
	{
		id: 100,
		title: 'Blue Lock',
		serializationYear: 2018,
	},
	{
		id: 101,
		title: 'Blue Lock',
		serializationYear: 2001,
	},
], {
	referenceYear: 2018,
});

assert.equal(rankedYearAware[0].id, 100);
assert.ok((rankedYearAware[0].yearScore || 0) > (rankedYearAware[1].yearScore || 0));

const rankedExcluded = folderTitle.rankSearchResults(['Blue Lock'], [
	{ id: 100, title: 'Blue Lock', serializationYear: 2018 },
	{ id: 101, title: 'Blue Lock', serializationYear: 2018 },
], {
	excludedIds: [100],
});

assert.equal(rankedExcluded[0].id, 101);

const comicsSample = [
	{ path: 'D:\\Manga\\Aho Girl', added: 1700000000 },
	{ path: 'D:\\Manga\\Diamond no Ace', added: 1701000000 },
	{ path: 'D:\\Manga\\Horimiya', added: 1702000000 },
];

const profile = recommendations.buildProfile(comicsSample, {
	'D:\\Manga\\Aho Girl': {
		genres: ['Comedy', 'School'],
		recommendation: { readingTimeMinutes: 120, genreClusters: ['comedy', 'school'] },
	},
	'D:\\Manga\\Diamond no Ace': {
		genres: ['Sports'],
		recommendation: { readingTimeMinutes: 400, genreClusters: ['sports'] },
	},
	'D:\\Manga\\Horimiya': {
		genres: ['Romance', 'School'],
		recommendation: { readingTimeMinutes: 180, genreClusters: ['romance', 'school'] },
	},
}, {
	'D:\\Manga\\Aho Girl': { page: 100, lastReading: Date.now() - 1000 * 60 * 60 * 24 },
	'D:\\Manga\\Diamond no Ace': { completed: true, page: 300, lastReading: Date.now() - 1000 * 60 * 60 * 24 * 20 },
}, {});

assert.ok(profile.genreWeights.comedy > 0);
assert.ok(profile.genreWeights.school > 0);

const recommended = recommendations.buildRecommendations(comicsSample, {
	trackingFolderMetadata: {
		'D:\\Manga\\Aho Girl': {
			genres: ['Comedy', 'School'],
			recommendation: { readingTimeMinutes: 120, genreClusters: ['comedy', 'school'] },
		},
		'D:\\Manga\\Diamond no Ace': {
			genres: ['Sports'],
			recommendation: { readingTimeMinutes: 400, genreClusters: ['sports'] },
		},
		'D:\\Manga\\Horimiya': {
			genres: ['Romance', 'School'],
			recommendation: { readingTimeMinutes: 180, genreClusters: ['romance', 'school'] },
		},
	},
	readingProgress: {
		'D:\\Manga\\Aho Girl': { page: 10, lastReading: Date.now() - 1000 * 60 * 60 * 24 },
	},
	readingPages: {},
});

assert.equal(recommended[0].path, 'D:\\Manga\\Horimiya');
assert.ok(recommended[0].recommendationScore > 0);

const recommendedWithFeedback = recommendations.buildRecommendations(comicsSample, {
	trackingFolderMetadata: {
		'D:\\Manga\\Aho Girl': {
			genres: ['Comedy', 'School'],
			recommendation: { readingTimeMinutes: 120, genreClusters: ['comedy', 'school'] },
		},
		'D:\\Manga\\Diamond no Ace': {
			genres: ['Sports'],
			recommendation: { readingTimeMinutes: 400, genreClusters: ['sports'] },
		},
		'D:\\Manga\\Horimiya': {
			genres: ['Romance', 'School'],
			recommendation: { readingTimeMinutes: 180, genreClusters: ['romance', 'school'] },
		},
	},
	readingProgress: {
		'D:\\Manga\\Aho Girl': { page: 10, lastReading: Date.now() - 1000 * 60 * 60 * 24 },
	},
	readingPages: {},
	recommendationFeedback: {
		'D:\\Manga\\Horimiya': { shown: 6, liked: 0, disliked: 2, updatedAt: Date.now() },
		'D:\\Manga\\Diamond no Ace': { shown: 3, liked: 2, disliked: 0, updatedAt: Date.now() },
	},
});

// Verify feedback stats are correctly attached to recommendation results.
const diamondFeedback = recommendedWithFeedback.find(item => item.path === 'D:\\Manga\\Diamond no Ace');
const horimiyaFeedback = recommendedWithFeedback.find(item => item.path === 'D:\\Manga\\Horimiya');
assert.ok(diamondFeedback, 'Diamond no Ace should appear in recommendations');
assert.ok(diamondFeedback.recommendationFeedbackLiked >= 2, 'Diamond liked count should be >= 2');
assert.ok(horimiyaFeedback, 'Horimiya should appear in recommendations');
assert.ok(horimiyaFeedback.recommendationFeedbackDisliked >= 2, 'Horimiya disliked count should be >= 2');

const recommendedWithNormalizedFeedbackKey = recommendations.buildRecommendations(comicsSample, {
	trackingFolderMetadata: {
		'D:\\Manga\\Aho Girl': {
			genres: ['Comedy', 'School'],
			recommendation: { readingTimeMinutes: 120, genreClusters: ['comedy', 'school'] },
		},
		'D:\\Manga\\Diamond no Ace': {
			genres: ['Sports'],
			recommendation: { readingTimeMinutes: 400, genreClusters: ['sports'] },
		},
		'D:\\Manga\\Horimiya': {
			genres: ['Romance', 'School'],
			recommendation: { readingTimeMinutes: 180, genreClusters: ['romance', 'school'] },
		},
	},
	readingProgress: {
		'D:\\Manga\\Aho Girl': { page: 10, lastReading: Date.now() - 1000 * 60 * 60 * 24 },
	},
	readingPages: {},
	recommendationFeedback: {
		'd:\\manga\\horimiya': { shown: 12, liked: 0, disliked: 5, updatedAt: Date.now() },
	},
});

const horimiyaNormalizedFeedback = recommendedWithNormalizedFeedbackKey.find(item => item.path === 'D:\\Manga\\Horimiya');
assert.ok(horimiyaNormalizedFeedback, 'Horimiya should appear in recommendations with normalized feedback key');
assert.ok(horimiyaNormalizedFeedback.recommendationFeedbackDisliked >= 5, 'Dislike count should be read from normalized key');

const recommendedSuppressed = recommendations.buildRecommendations(comicsSample, {
	trackingFolderMetadata: {
		'D:\\Manga\\Aho Girl': {
			genres: ['Comedy', 'School'],
			recommendation: { readingTimeMinutes: 120, genreClusters: ['comedy', 'school'] },
		},
		'D:\\Manga\\Diamond no Ace': {
			genres: ['Sports'],
			recommendation: { readingTimeMinutes: 400, genreClusters: ['sports'] },
		},
		'D:\\Manga\\Horimiya': {
			genres: ['Romance', 'School'],
			recommendation: { readingTimeMinutes: 180, genreClusters: ['romance', 'school'] },
		},
	},
	readingProgress: {
		'D:\\Manga\\Aho Girl': { page: 10, lastReading: Date.now() - 1000 * 60 * 60 * 24 },
	},
	readingPages: {},
	recommendationFeedback: {
		'D:\\Manga\\Horimiya': { shown: 240, liked: 0, disliked: 200, updatedAt: Date.now() },
	},
});

const horimiyaSuppressed = recommendedSuppressed.find(item => item.path === 'D:\\Manga\\Horimiya');
assert.ok(!horimiyaSuppressed, 'Horimiya should be suppressed after reaching 200 dislikes');

console.log('Runed tests: Ok');
