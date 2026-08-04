var epubjs = false;
const epubDebug = (typeof process !== 'undefined' && process.env.OPENCOMIC_EPUB_DEBUG === '1');
const CONTAINER_PATH = 'META-INF/container.xml';
const IBOOKS_DISPLAY_OPTIONS_PATH = p.join('META-INF', 'com.apple.ibooks.display-options.xml');
const IBOOKS_DISPLAY_OPTIONS_XML = '<?xml version="1.0" encoding="UTF-8"?>\n<display_options>\n\t<platform name="*">\n\t\t<option name="specified-fonts">true</option>\n\t</platform>\n</display_options>\n';

var epub = function(path, config = {}) {

	this.path = path;
	this.realPath = fileManager.realPath(this.path);
	this.realPathZip = fileManager.realPath(this.path, 0, {epub: 'epub-zip'});
	this.config = config;

	this.zip = false;
	this.zipFiles = false;

	this.containerXml = false;
	this.opf = false;
	this.opfRelativePath = '';
	this.opfPromise = false;
	this.openEpubPromise = false;
	this.makeAvailableChain = Promise.resolve();
	this.extractAllPromise = false;

	// Opt-in tracing (OPENCOMIC_EPUB_DEBUG=1). This fired on every stage of every EPUB open,
	// which flooded the console and serialised a payload object per call for nothing.
	this.debug = function(stage = '', payload = {}) {
		if(!epubDebug) return;

		try {
			console.log('[epub-debug][epub]['+stage+']', {
				path: this.path,
				...payload,
			});
		}
		catch (error) {}
	}

	/* Manage Zip epub */

	this.openEpubZip = async function() {

		if(this.zip) return;
		this.debug('zip:open:begin');
		this.zip = fileManager.fileCompressed(this.path, false, '7z', {epub: 'epub-zip'}, {log: true});
		this.zip.updateConfig({progress: {multiply: 0.5}});
		this.debug('zip:open:ok');

	}

	this.extractAllEpubZip = async function() {

		if(this.extracted) return true;
		if(this.extractAllPromise) return this.extractAllPromise;

		const _this = this;

		this.extractAllPromise = (async function() {
			await _this.openEpubZip();
			_this.debug('zip:extract:all:begin');
			await _this.zip.extract();
			_this.extracted = true;
			_this.debug('zip:extract:all:ok');

			return true;
		})().finally(function(){
			_this.extractAllPromise = false;
		});

		return this.extractAllPromise;

	}

	this.readEpubZipFiles = async function() {

		return this.zipFiles || [];

	}

	this.extracted = false;

	// Extract epub files
	this.normalizeRelativeArchivePath = function(relativePath = '') {

		return String(relativePath)
			.replace(/\\/g, '/')
			.replace(/^\/+/, '')
			.replace(/\?.*$/, '')
			.replace(/#.*$/, '');

	}

	this.makeAvailableOne = async function(relativePath) {
		await this.extractAllEpubZip();
		const normalizedRelativePath = this.normalizeRelativeArchivePath(relativePath);

		const _this = this;
		const extractOne = async function() {
			_this.debug('zip:extract:one:skip-all-extracted', {relativePath: normalizedRelativePath});

			return true;
		};

		this.makeAvailableChain = this.makeAvailableChain.then(extractOne, extractOne);

		return this.makeAvailableChain;

	}

	this.getSectionRelativePath = function(section = false) {

		const href = this.normalizeRelativeArchivePath(section?.href || section?.canonical || '');

		if(!href)
			return '';

		const opfDir = this.opfRelativePath ? p.posix.dirname(this.opfRelativePath) : '';
		const relativePath = opfDir && opfDir !== '.' ? p.posix.join(opfDir, href) : href;

		return this.normalizeRelativeArchivePath(relativePath);

	}

	this.findContentOpf = async function() {

		if(this.opf) return this.opf;
		if(this.opfPromise)
		{
			this.debug('opf:find:join');
			return this.opfPromise;
		}

		this.opfPromise = (async () => {

			this.debug('opf:find:begin');

			await this.makeAvailableOne(CONTAINER_PATH);

			let path = p.join(this.realPathZip, CONTAINER_PATH);

			if(fs.existsSync(path))
			{
				this.containerXml = await fsp.readFile(path, 'utf8');
				let opfRelativePath = extract(/\<rootfile\s[^>]*full-path="([^">]+)"/, this.containerXml, 1);

				if(opfRelativePath)
				{
					this.opfRelativePath = this.normalizeRelativeArchivePath(opfRelativePath);
					await this.makeAvailableOne(this.opfRelativePath);

					this.opf = p.join(this.realPathZip, this.opfRelativePath)

					if(!fs.existsSync(this.opf))
						throw new Error('Epub opf file not exists');
				}
				else
				{
					throw new Error('Epub not have opf file');
				}
			}
			else
			{
				throw new Error('Epub container file not exists');
			}

			await this.ensureIbooksDisplayOptionsFile();
			this.debug('opf:find:ok', {opf: this.opf});

			return this.opf;

		})().finally(() => {
			this.opfPromise = false;
		});

		return this.opfPromise;
	}

	this.ensureIbooksDisplayOptionsFile = async function() {

		const candidates = new Set();

		candidates.add(p.join(this.realPathZip, IBOOKS_DISPLAY_OPTIONS_PATH));

		if(this.opf)
			candidates.add(p.join(p.dirname(this.opf), IBOOKS_DISPLAY_OPTIONS_PATH));

		for(const filePath of candidates)
		{
			try
			{
				if(!fs.existsSync(filePath))
				{
					await fsp.mkdir(p.dirname(filePath), {recursive: true});
					await fsp.writeFile(filePath, IBOOKS_DISPLAY_OPTIONS_XML, 'utf8');
				}
			}
			catch(error){}
		}
	}

	/* Manage epub */
	this.ebook = false;

	this.epub = false;
	this.epubFiles = false;
	this.epubMetadata = false;
	this.manualSpine = [];

	this.toc = false;

	this.withTimeout = function(promise, timeout = 15000, label = 'epub') {

		return new Promise(function(resolve, reject) {
			let done = false;

			const timeoutST = setTimeout(function() {
				if(done) return;
				done = true;
				reject(new Error('epubTimeout: '+label));
			}, timeout);

			Promise.resolve(promise).then(function(res) {
				if(done) return;
				done = true;
				clearTimeout(timeoutST);
				resolve(res);
			}).catch(function(error) {
				if(done) return;
				done = true;
				clearTimeout(timeoutST);
				reject(error);
			});
		});
	}

	this.escapeHtml = function(text = '') {

		return String(text)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');

	}

	this.getChapterLoadTimeout = function() {

		// Keep chapter probing bounded to avoid hanging the full EPUB pagination.
		const timeout = this.config?.renderTimeout || 8000;

		return Math.min(Math.max(timeout, 4000), 15000);

	}

	this.createFallbackChapterHtml = function(name = '') {

		const safeName = this.escapeHtml(name || 'Chapter');

		return '<!doctype html><html><head><meta charset="utf-8"></head><body><div style="padding:24px;font-family:sans-serif;">'+safeName+'</div></body></html>';

	}

	this.waitForFileReady = async function(filePath, maxMs = 1200) {

		const startedAt = Date.now();

		while((Date.now() - startedAt) < maxMs)
		{
			try
			{
				if(fs.existsSync(filePath))
				{
					const stat = fs.statSync(filePath);
					if(stat.isFile() && stat.size > 0)
						return true;
				}
			}
			catch(error){}

			await app.sleep(30);
		}

		return false;

	}

	this.getActiveSpineItems = function() {

		const epubSpineItems = this.epub?.spine?.items || [];

		if(epubSpineItems.length > 0)
			return epubSpineItems;

		return this.manualSpine || [];

	}

	this.buildManualSpineFromOpf = async function() {

		await this.findContentOpf();

		if(!this.opf || !fs.existsSync(this.opf))
			return [];

		let opfSource = '';

		try
		{
			opfSource = await fsp.readFile(this.opf, 'utf8');
		}
		catch(error)
		{
			this.debug('manual-spine:read:error', {error: String(error?.message || error)});
			return [];
		}

		let opf = false;

		try
		{
			let parser = new DOMParser();
			opf = parser.parseFromString(opfSource, 'text/xml');
		}
		catch(error)
		{
			this.debug('manual-spine:parse:error', {error: String(error?.message || error)});
			return [];
		}

		const manifestById = {};
		const manifestItems = opf ? opf.getElementsByTagName('item') : [];

		for(let i = 0, len = manifestItems.length; i < len; i++)
		{
			const manifestItem = manifestItems[i];
			const id = manifestItem.getAttribute('id') || '';
			const href = manifestItem.getAttribute('href') || '';

			if(id)
				manifestById[id] = href;
		}

		const spineItems = [];
		const itemRefs = opf ? opf.getElementsByTagName('itemref') : [];

		for(let i = 0, len = itemRefs.length; i < len; i++)
		{
			const itemRef = itemRefs[i];
			const idref = itemRef.getAttribute('idref') || '';
			const href = manifestById[idref] || '';

			if(!href)
				continue;

			const relativePath = this.normalizeRelativeArchivePath(
				this.opfRelativePath ? p.posix.join(p.posix.dirname(this.opfRelativePath), href) : href
			);

			spineItems.push({
				idref: idref,
				href: href,
				relativePath: relativePath,
			});
		}

		this.manualSpine = spineItems;
		this.debug('manual-spine:ok', {count: spineItems.length});

		return spineItems;

	}

	this.openEpub = async function() {

		if(this.epub) return;
		if(this.openEpubPromise)
		{
			this.debug('book:open:join');
			return this.openEpubPromise;
		}

		this.openEpubPromise = (async () => {
			if(epubjs === false) epubjs = require('epubjs');
			this.debug('book:open:begin');

			const loadBookState = async (label = '') => {
				try
				{
					this.toc = await this.withTimeout(this.epub.loaded.navigation, 15000, 'loaded.navigation.'+label);
					this.debug('book:navigation:ok', {label: label, tocItems: this.toc?.toc?.length || 0});
				}
				catch(error)
				{
					console.warn('EPUB navigation not available, fallback to empty TOC', error);
					this.debug('book:navigation:error', {label: label, error: String(error?.message || error)});
					this.toc = {toc: []};
				}

				try
				{
					await this.withTimeout(this.epub.opened, 15000, 'opened.'+label);
					this.debug('book:opened:ok', {label: label});
				}
				catch(error)
				{
					console.warn('EPUB open timeout, continuing with partial load', error);
					this.debug('book:opened:timeout', {label: label, error: String(error?.message || error)});
				}

				return this.epub?.spine?.items?.length || 0;
			};

			let directOpen = false;
			let directSpineItems = 0;

			try
			{
				this.debug('book:open:direct:begin');
				this.epub = new epubjs.Book(this.path, {openAs: 'epub'});
				directOpen = true;
				directSpineItems = await loadBookState('direct');
				this.debug('book:open:direct:state', {spineItems: directSpineItems});
			}
			catch(error)
			{
				this.debug('book:open:direct:error', {error: String(error?.message || error)});
				directOpen = false;
			}

			if(!directOpen || directSpineItems <= 0)
			{
				if(directOpen && directSpineItems <= 0)
					this.debug('book:open:direct:empty-spine');

				this.debug('book:open:fallback-opf:begin');
				await this.findContentOpf();
				this.epub = new epubjs.Book(this.opf);
				this.debug('book:open:fallback-opf:ok', {opf: this.opf});
				await loadBookState('opf');
			}

			if((this.epub?.spine?.items?.length || 0) <= 0)
				await this.buildManualSpineFromOpf();

			this.debug('book:open:ok', {
				spineItems: this.epub?.spine?.items?.length || 0,
				manualSpineItems: this.manualSpine?.length || 0,
			});

		})().finally(() => {
			this.openEpubPromise = false;
		});

		return this.openEpubPromise;
	}

	this.getHrefNames = function(items, hrefNames = {}) {

		for(let i = 0, len = items.length; i < len; i++)
		{
			let item = items[i];
			let href = item.href.replace(/[#?].*/, '');

			if(!hrefNames[href])
				hrefNames[href] = item.label.trim();

			if(item.subitems)
				hrefNames = this.getHrefNames(item.subitems, hrefNames);
		}

		return hrefNames;

	}

	this.readEpubFiles = async function() {

		if(this.epubFiles) return this.epubFiles;

		await this.openEpub();
		this.debug('files:read:begin');

		this.epubFiles = [];


		   // Always generate 'cover.tbn' for EPUBs
		   let coverPath = this.epub.cover;
		   if (!coverPath) {
			   // Fallback: try to find the first image in the EPUB
			   try {
				   const opfPath = this.opf;
				   if (opfPath && fs.existsSync(opfPath)) {
					   const opfXml = fs.readFileSync(opfPath, 'utf8');
					   const parser = new DOMParser();
					   const opf = parser.parseFromString(opfXml, 'text/xml');
					   // Find first image in manifest
					   const manifest = opf.getElementsByTagName('item');
					   let firstImageHref = '';
					   for (let i = 0; i < manifest.length; i++) {
						   const item = manifest[i];
						   const mediaType = item.getAttribute('media-type') || '';
						   if (mediaType.startsWith('image/')) {
							   firstImageHref = item.getAttribute('href');
							   break;
						   }
					   }
					   if (firstImageHref) {
						   // Build the full path to the image inside the EPUB zip extraction
						   const opfDir = this.opfRelativePath ? p.posix.dirname(this.opfRelativePath) : '';
						   const relPath = opfDir && opfDir !== '.' ? p.posix.join(opfDir, firstImageHref) : firstImageHref;
						   coverPath = p.join(this.realPathZip, relPath);
					   }
				   }
			   } catch (e) {}
		   }
		   if (coverPath && fs.existsSync(coverPath)) {
			   this.epubFiles.push('cover.tbn');
			   this._epubCoverPath = coverPath; // Save for renderFiles
		   }

		let hrefNames = this.getHrefNames(this.toc?.toc || []);

		let prevName = '';
		let prevNameNum = 2;
		let spineItems = this.getActiveSpineItems();
		let len = spineItems.length;

		if(len <= 0)
		{
			await this.buildManualSpineFromOpf().catch(() => []);
			spineItems = this.getActiveSpineItems();
			len = spineItems.length;
		}

		if(len <= 0)
		{
			this.debug('files:read:fallback-synthetic');
			this.manualSpine = [{
				idref: 'fallback-chapter-1',
				href: '',
				relativePath: '',
			}];
			spineItems = this.manualSpine;
			len = 1;
		}

		let leadingZeros = Math.max(String(len).length, 4);

		for(let i = 0; i < len; i++)
		{
			let item = spineItems[i] || {};

			let name = hrefNames[item.href] || app.capitalize(app.extract(/^(.*?)\.[a-z0-9]+$/, item.idref || item.href || '', 1).trim());

			if(!name)
			{
				name = prevName+' '+(prevNameNum++);
			}
			else
			{
				prevName = name;
				prevNameNum = 2;
			}

			this.epubFiles.push(String(i).padStart(leadingZeros, '0')+'_sortonly - '+fileManager.replaceReservedCharacters(name)+'.jpg');
		}

		this.debug('files:read:ok', {count: this.epubFiles.length, spine: len});

		return this.epubFiles;

	}

	this.getElements = function(opf, tagName, query = false) {

		const elements = [];
		tagName = Array.isArray(tagName) ? tagName : [tagName];

		for(let i = 0, len = tagName.length; i < len; i++)
		{
			const tag = tagName[i];
			elements.push(...opf.getElementsByTagName(tag));
		}

		if(query)
			elements.push(...opf.querySelectorAll(query));

		return elements;
	}

	this.getStringMetadata = function(opf, tagName, query = false) {

		const elements = this.getElements(opf, tagName, query);
		const element = elements.length > 0 ? elements[0] : false;
		return element ? element.textContent : '';

	}

	this.getArrayMetadata = function(opf, tagName, query = false) {

		const list = [];
		const elements = this.getElements(opf, tagName, query);

		for(let i = 0, len = elements.length; i < len; i++)
		{
			list.push(elements[i].textContent);
		}

		return list.join(', ');

	}

	this.getObjectMetadata = function(opf, tagName, keys) {

		let list = [];
		let elements = opf.getElementsByTagName(tagName);

		for(let i = 0, len = elements.length; i < len; i++)
		{
			let element = elements[i];

			let _list = {
				name: element.textContent,
			};

			for(let k = 0, len2 = keys.length; k < len2; k++)
			{
				let key = keys[k];
				let property = opf.querySelector('*[property="'+key+'"][refines="#'+element.id+'"]');
				_list[key] = property ? property.textContent : '';
			}

			list.push(_list);
		}
		return list;

	}

	// https://standardebooks.org/manual/latest/9-metadata
	// https://www.w3.org/TR/epub-33/#sec-pkg-metadata
	this.readEpubMetadata = async function() {

		if(this.epubMetadata) return this.epubMetadata;

		await this.openEpub();

		let metadata = await this.withTimeout(this.epub.loaded.metadata, 15000, 'loaded.metadata').catch(function(){ return {}; });

		if(!this.opf || !fs.existsSync(this.opf))
			await this.findContentOpf().catch(function(){});

		if(!this.opf || !fs.existsSync(this.opf))
		{
			this.epubMetadata = metadata;
			return this.epubMetadata;
		}

		let res = fs.readFileSync(this.opf, 'utf8');

		let parser = new DOMParser();
		let opf = parser.parseFromString(res, 'text/xml');

		// Author
		metadata.author = this.getArrayMetadata(opf, 'dc:creator');

		// Publisher
		metadata.publisher = this.getArrayMetadata(opf, 'dc:publisher');

		// subject
		metadata.subject = this.getObjectMetadata(opf, 'dc:subject', ['authority', 'term']);

		// Genre
		metadata.genre = this.getArrayMetadata(opf, 'se:subject', '*[property="se:subject"]');

		// Identifier
		metadata.identifier = this.getArrayMetadata(opf, 'dc:identifier');

		// Source
		metadata.source = this.getArrayMetadata(opf, 'dc:source');

		// Contributor
		metadata.contributor = this.getObjectMetadata(opf, 'dc:contributor', ['role']);

		metadata.longDescription = this.getStringMetadata(opf, 'se:long-description', '*[property="se:long-description"]');

		// Series
		metadata.series = this.getStringMetadata(opf, 'calibre:series', '*[property="belongs-to-collection"]');

		// Series index
		metadata.seriesIndex = this.getStringMetadata(opf, 'calibre:series_index', '*[property="group-position"]');

		this.epubMetadata = metadata;

		return this.epubMetadata;

	}

	this.chaptersHtml = {};

	this.chapterHtml = async function(index) {

		if(this.chaptersHtml[index]) return this.chaptersHtml[index];

		let section = this.epub?.spine?.get ? this.epub.spine.get(index) : false;
		let manualSpineItem = false;

		if(!section)
			manualSpineItem = (this.manualSpine || [])[index] || false;

		if(!section && manualSpineItem)
		{
			const relativePath = manualSpineItem.relativePath || this.normalizeRelativeArchivePath(manualSpineItem.href || '');

			if(relativePath)
				await this.makeAvailableOne(relativePath);

			const chapterPath = p.join(this.realPathZip, ...relativePath.split('/'));
			let html = '';

			if(fs.existsSync(chapterPath))
				html = await fsp.readFile(chapterPath, 'utf8').catch(function(){ return ''; });

			if(!html || !html.trim())
				html = this.createFallbackChapterHtml(manualSpineItem.idref || ('Chapter '+(index + 1)));

			section = {
				url: 'file:///'+chapterPath.replace(/\\/g, '/'),
				idref: manualSpineItem.idref || ('chapter-'+index),
				href: manualSpineItem.href || '',
			};

			return this.chaptersHtml[index] = {html: html, section: section};
		}

		if(section)
		{
			let html = '';
			let loaded = false;
			const sectionRelativePath = this.getSectionRelativePath(section);
			let extractedSectionPath = '';

			try
			{
				if(section.render)
				{
					html = await this.withTimeout(
						section.render(this.epub.load.bind(this.epub)),
						this.getChapterLoadTimeout(),
						'section.render.'+index
					);

					loaded = !!(html && html.trim());

					if(loaded)
						this.debug('chapter:render:ok', {index: index, sectionRelativePath: sectionRelativePath});
				}

				const sectionPath = this.removeFileScheme(section.url || '');

				if(!loaded && sectionPath && fs.existsSync(sectionPath))
				{
					html = await this.withTimeout(fsp.readFile(sectionPath, 'utf8'), 3000, 'section.readFile.'+index);
					loaded = !!(html && html.trim());
				}
			}
			catch(error) {}

			if(!loaded)
			{
				this.debug('chapter:load:fallback', {index: index, error: 'local-chapter-missing-or-empty'});
				html = this.createFallbackChapterHtml(section.idref || ('Chapter '+(index + 1)));
			}

			try
			{
				if(section.unload)
					section.unload();
			}
			catch(error) {}

			if(typeof html !== 'string')
			{
				try
				{
					let serializer = new XMLSerializer();
					html = serializer.serializeToString(html);
				}
				catch(error)
				{
					html = this.createFallbackChapterHtml(section.idref || ('Chapter '+(index + 1)));
				}
			}

			if(!html || !html.trim())
			{
				this.debug('chapter:empty:fallback', {index: index});
				html = this.createFallbackChapterHtml(section.idref || ('Chapter '+(index + 1)));
			}

			let sectionUrl = section.url || '';
			if(extractedSectionPath)
				sectionUrl = 'file:///'+extractedSectionPath.replace(/\\/g, '/');

			const normalizedSection = {
				url: sectionUrl,
				idref: section.idref || ('chapter-'+index),
				href: section.href || '',
			};

			return this.chaptersHtml[index] = {html: html, section: normalizedSection};
		}
		else
			throw new Error('Epub section not exists');

	}

	this.renderFileConfig = ebook.standarSizeConfig;

	this.renderFiles = async function(files, config, callback = false) {

		await this.openEpub();

		let chapters = [];


		   for(let i = 0, len = files.length; i < len; i++) {
			   let file = files[i];
			   if(file.name == 'cover.tbn') {
				   // Use the robust cover path (actual cover or fallback first image)
				   let coverPath = this._epubCoverPath || this.epub.cover;
				   if (coverPath && fs.existsSync(coverPath)) {
					   await fsp.copyFile(this.removeFileScheme(coverPath), file.path);
				   } else {
					   // If for some reason coverPath is missing, create a blank file
					   await fsp.writeFile(file.path, '');
				   }
				   if(callback) callback(file.name);
			   } else {
				   let index = this.getFileIndex(file.name);
				   let chapter = await this.chapterHtml(index);
				   let dirname = p.dirname(this.removeFileScheme(chapter.section.url));
				   chapters.push({
					   name: file.name,
					   path: file.path,
					   html: chapter.html,
					   basePath: dirname,
				   });
			   }
		   }

		if(chapters.length > 0)
		{
			this.ebook = ebook.load({chapters: chapters});

			await this.ebook.chaptersImages({...this.renderFileConfig, ...{imageWidth: config.width}}, async function(index, image) {

				await fsp.writeFile(chapters[index].path, image.toJPEG(100));
				if(callback) callback(chapters[index].name);

			});
		}

		return;
	}

	this.epubPages = async function(config, callback = false) {
		const startedAt = Date.now();
		this.debug('pages:start', {
			width: config?.width,
			height: config?.height,
		});

		await this.openEpub();
		let files = await this.readEpubFiles();

		const chapterFiles = [];
		for(let i = 0, len = files.length; i < len; i++)
		{
			if(files[i] != 'cover.tbn')
				chapterFiles.push(files[i]);
		}

		let chapters = new Array(chapterFiles.length);
		let nextIndex = 0;
		const _this = this;
		const workerCount = Math.min(8, Math.max(1, chapterFiles.length));

		async function worker() {
			while(true)
			{
				const i = nextIndex++;
				if(i >= chapterFiles.length)
					return;

				const file = chapterFiles[i];
				const index = _this.getFileIndex(file);
				const chapter = await _this.chapterHtml(index);
				const dirname = p.dirname(_this.removeFileScheme(chapter.section.url));

				const activeSpineItems = _this.getActiveSpineItems();

				chapters[i] = {
					name: file,
					html: chapter.html,
					path: p.join(_this.path, file),
					basePath: dirname,
					spine: activeSpineItems[index] || {},
				};

				if(callback) callback(file);
			}
		}

		if(chapterFiles.length)
			await Promise.all(Array(workerCount).fill(0).map(worker));

		this.debug('pages:chapters-prepared', {
			chapters: chapterFiles.length,
			workerCount: workerCount,
			durationMs: Date.now() - startedAt,
		});

		if(chapters.length > 0)
		{
			this.ebook = ebook.load({chapters: chapters});
			this.ebook.updateConfig(config);

			this.ebook.chaptersPages = chapters.map(function(chapter) {
				return [{
					path: chapter.path,
					ids: [],
					html: chapter.html || '',
				}];
			});

			const pages = this.ebook.pagesToOnedimension(this.ebook.chaptersPages);
			this.ebook.pages = pages;

			let toc = [];
			try
			{
				if(this.toc && this.toc.toc)
					toc = this.ebook.generateTocWithPages(this.toc.toc);
			}
			catch(error)
			{
				console.warn('EPUB TOC generation failed, using empty TOC', error);
				toc = [];
			}

			return {pages: pages, toc: toc, landmarks: false};
		}

		this.debug('pages:empty', {durationMs: Date.now() - startedAt});

		return {pages: [], toc: [], landmarks: false};
	}

	this.getFileIndex = function(name) {

		let chapter = +extract(/^([0-9]+)/, name, 1);

		return chapter;

	}

	this.removeFileScheme = function(path) {

		if(process.platform == 'win32' || process.platform == 'win64')
			path = path.replace(/^file:\/*/, '');
		else
			path = path.replace(/^file:/, '');

		return p.normalize(path);

	}

	this.destroy = async function() {

		if(this.zip) this.zip.destroy();

	}

}




module.exports = {
	load: function(path, config) {
		return new epub(path, config);
	},
}
