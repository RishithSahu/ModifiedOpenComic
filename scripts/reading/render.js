const ai = require(p.join(appDir, '.dist/reading/render/ai.js'));

var file = false,
	ebook = false,
	ebookConfigChanged = false,
	renderType = 'canvas',
	renderImages = false,	
	renderCanvas = false,
	renderEbook = false,	
	imagesData = {},
	rendering = {},
	rendered = {},
	renderedMagnifyingGlass = {},
	renderedQuality = {},
	renderedMagnifyingGlassQuality = {},
	renderedObjectsURL = [],
	renderedObjectsURLCache = {},
	maxNext = 10,
	maxPrev = 10,
	currentIndex = 0,
	scale = 1,
	scaleMagnifyingGlass = false,
	globalZoom = false,
	doublePage = false,
	onRender = false;

let syncRenderedPdfDimensionsST = false;

function fitEbookIframeContent(iframe)
{
	if(!iframe) return;

	iframe.addEventListener('load', async function(){

		const applyFit = function() {

			try
			{
				const doc = iframe.contentDocument;
				if(!doc) return;

				const root = doc.documentElement;
				const body = doc.body || doc.querySelector('body');
				if(!root || !body) return;

				// Measure natural layout first; transforms/hidden overflow can under-report scroll sizes and cause clipping.
				body.style.transform = '';
				body.style.width = '';
				body.style.height = '';
				root.style.overflow = '';
				body.style.overflow = '';

				const contentWidth = Math.max(root.scrollWidth, body.scrollWidth, body.offsetWidth, 1);
				const contentHeight = Math.max(root.scrollHeight, body.scrollHeight, body.offsetHeight, 1);

				const viewportWidth = iframe.clientWidth || parseFloat(iframe.style.width) || contentWidth;
				const viewportHeight = iframe.clientHeight || parseFloat(iframe.style.height) || contentHeight;

				if(!viewportWidth || !viewportHeight) return;

				// Keep a small safety margin to avoid edge clipping caused by subpixel rounding.
				const safeViewportWidth = Math.max(1, viewportWidth - 8);
				const safeViewportHeight = Math.max(1, viewportHeight - 6);
				const scaleToFit = Math.min(safeViewportWidth / contentWidth, safeViewportHeight / contentHeight, 1);

				if(scaleToFit < 0.999)
				{
					body.style.transformOrigin = 'top left';
					body.style.transform = 'scale('+scaleToFit+')';
					body.style.width = contentWidth+'px';
					body.style.height = contentHeight+'px';
					body.style.paddingRight = '2px';
				}
				else
				{
					body.style.transform = '';
					body.style.width = '';
					body.style.height = '';
					body.style.paddingRight = '';
				}

				// Keep internal scrollbars disabled after sizing.
				root.style.overflow = 'hidden';
				body.style.overflow = 'hidden';
			}
			catch(error) {}

		}

		applyFit();

		try
		{
			const doc = iframe.contentDocument;
			if(doc?.fonts?.ready)
				await doc.fonts.ready;
		}
		catch(error) {}

		await new Promise(function(resolve){ requestAnimationFrame(resolve); });
		await new Promise(function(resolve){ requestAnimationFrame(resolve); });
		applyFit();

		setTimeout(applyFit, 120);
		setTimeout(applyFit, 350);

	}, {once: true});
}

async function setFile(_file, _scaleMagnifyingGlass = false, _renderType = 'canvas')
{
	if(file) file.destroy();

	renderType = _renderType;

	renderImages = (renderType == 'images') ? true : false;
	renderCanvas = (renderType == 'canvas') ? true : false;
	renderEbook = (renderType == 'ebook') ? true : false;

	file = _file;
	if(file && !renderEbook) await file.read(); // Try make this from cache

	ebook = renderEbook ? await file.ebook() : false;
	ebookConfigChanged = false;

	rendered = {};
	renderedMagnifyingGlass = {};
	renderedQuality = {};
	renderedMagnifyingGlassQuality = {};
	rendering = {};
	scale = 1;
	scaleMagnifyingGlass = _scaleMagnifyingGlass;
	globalZoom = false;
	ai.clean(true);

	if(renderImages)
		revokeAllObjectURL();

	createObserver();

	return;
}

async function reset(_scaleMagnifyingGlass = false)
{
	ebook = renderEbook ? await file.ebook() : false;

	rendered = {};
	renderedMagnifyingGlass = {};
	renderedQuality = {};
	renderedMagnifyingGlassQuality = {};
	rendering = {};
	scale = 1;
	scaleMagnifyingGlass = _scaleMagnifyingGlass;
	globalZoom = false;
	ai.clean(true);

	if(renderImages)
		revokeAllObjectURL();

	return;
}

function setImagesData(_imagesData)
{
	imagesData = _imagesData;
}

function setMagnifyingGlassStatus(active = false, doublePage = false)
{
	scaleMagnifyingGlass = active;

	if(active)
		setRenderQueue(doublePage ? 3 : 2, doublePage ? 4 : 2, false, true);
}

var sendToQueueST = false;

function isPdfCanvasMode()
{
	if(!renderCanvas || !file || !file.getFeatures)
		return false;

	try
	{
		const features = file.getFeatures();
		return !!(features && features.pdf);
	}
	catch(error)
	{
		return false;
	}
}

function getQueueLimits()
{
	if(isPdfCanvasMode())
	{
		return { prev: 10, next: 10 };
	}

	if(reading.readingViewIs('scroll'))
		return { prev: Math.max(maxPrev, 10), next: Math.max(maxNext, 10) };

	return { prev: maxPrev, next: maxNext };
}

function getPrioritizeNextWindow(doublePage = false)
{
	if(reading.readingViewIs('scroll'))
	{
		const limits = getQueueLimits();
		return Math.min(Math.max(4, limits.prev), Math.max(0, limits.next - 1));
	}

	return doublePage ? 2 : false;
}

function shouldUseProcessedImageRender(index, magnifyingGlass = false)
{
	if(renderCanvas || renderEbook || magnifyingGlass || !renderImages)
		return true;

	if(reading.readingViewIs('scroll'))
		return index === currentIndex;

	const spreadWindow = doublePage ? 1 : 0;

	return Math.abs(index - currentIndex) <= spreadWindow;
}

function shouldQueueRender(index, renderedState, renderedStateQuality, scale = false, magnifyingGlass = false)
{
	if(!renderedState[index])
		return true;

	if(scale !== false && renderedState[index] !== scale)
		return true;

	if(shouldUseProcessedImageRender(index, magnifyingGlass) && renderedStateQuality[index] !== 'processed')
		return true;

	return false;
}

async function ensureDirectImageSource(src, img)
{
	if(!img)
		return false;

	if(!img.getAttribute('src') || img.dataset.baseSrc !== src || img.classList.contains('blobRendered'))
		await srcToImage(src, img);

	return true;
}

async function primeImageSource(index)
{
	if(renderCanvas || renderEbook || !imagesData[index])
		return false;

	const contentRight = template._contentRight();
	const img = contentRight.querySelector('.reading-body > div > div.r-flex .r-img-i'+index+' oc-img img');
	if(!img)
		return false;

	const src = img.dataset.src;
	const path = img.dataset.path;

	if(!src || compatible.image.convert(path))
		return false;

	img.loading = 'eager';
	img.fetchPriority = index === currentIndex ? 'high' : 'low';

	await ensureDirectImageSource(src, img);

	try
	{
		img.decode().catch(function(){});
	}
	catch(error) {}

	return true;
}

function primeImmediateSourceWindow(prev = 10, next = 10)
{
	if(renderCanvas || renderEbook)
		return;

	const seen = {};
	const maxDistance = Math.max(prev, next);

	for(let distance = 0; distance <= maxDistance; distance++)
	{
		if(distance <= next)
		{
			const forwardIndex = currentIndex + distance;
			if(!seen[forwardIndex])
			{
				seen[forwardIndex] = true;
				primeImageSource(forwardIndex);
			}
		}

		if(distance > 0 && distance <= prev)
		{
			const backwardIndex = currentIndex - distance;
			if(!seen[backwardIndex])
			{
				seen[backwardIndex] = true;
				primeImageSource(backwardIndex);
			}
		}
	}
}

function getVisbleImages(doublePage = false)
{
	const isScroll = reading.readingViewIs('scroll');

	let images = doublePage ? 2 : 0;
	if(isScroll) images += 2;

	let prev = images;
	let next = images;

	if(next == 0)
		next = 1;

	return {prev: prev, next: next}; 
}

function renderingKey(index, magnifyingGlass = false)
{
	return (magnifyingGlass ? 'mg:' : 'base:') + index;
}

function isRendering(index, magnifyingGlass = false)
{
	return !!rendering[renderingKey(index, magnifyingGlass)];
}

function setRendering(index, magnifyingGlass = false, active = true)
{
	const key = renderingKey(index, magnifyingGlass);

	if(active)
		rendering[key] = true;
	else
		delete rendering[key];
}

function setScale(_scale = 1, _globalZoom = false, _doublePage = false)
{
	if(!file && !renderImages) return;
	if(renderEbook) return;

	clearTimeout(sendToQueueST);

	queue.clean('readingRender');
	ai.clean();
	rendering = {};

	scale = _scale;
	globalZoom = _globalZoom;
	doublePage = _doublePage;

	const visbleImages = getVisbleImages(doublePage);

	if(globalZoom)
	{
		rendered = {};
		renderedMagnifyingGlass = {};
		renderedQuality = {};
		renderedMagnifyingGlassQuality = {};

		setRenderQueue(visbleImages.prev, visbleImages.next);

		sendToQueueST = setTimeout(function(){
			const limits = getQueueLimits();

			if(scaleMagnifyingGlass) setRenderQueue(doublePage ? 3 : 2, doublePage ? 4 : 2, _scale * scaleMagnifyingGlass, true);
			setRenderQueue(limits.prev, limits.next);

		}, 1000);
	}
	else
	{
		setRenderQueue(visbleImages.prev, visbleImages.next, _scale);

		sendToQueueST = setTimeout(function(){

			if(scaleMagnifyingGlass) setRenderQueue(doublePage ? 3 : 2, doublePage ? 4 : 2, _scale * scaleMagnifyingGlass, true);

		}, 500);
	}
}

function setScaleMagnifyingGlass(_scale = 1, doublePage = false)
{
	if(!file || !scaleMagnifyingGlass) return;
	if(renderEbook) return;

	clearTimeout(sendToQueueST);

	queue.clean('readingRender');
	ai.clean();
	rendering = {};

	renderedMagnifyingGlass = {};
	scaleMagnifyingGlass = _scale;

	sendToQueueST = setTimeout(function(){

		if(scaleMagnifyingGlass) setRenderQueue(doublePage ? 3 : 2, doublePage ? 4 : 2, scale * scaleMagnifyingGlass, true);

	}, 500);
}

function resized(doublePage = false)
{
	if(!file && !renderImages) return;
	if(renderEbook) return; // Reset function is used

	let readingBody = template._contentRight().querySelector('.reading-body');
	if(readingBody) readingBody.classList.add('resizing');

	clearTimeout(sendToQueueST);

	queue.clean('readingRender');
	ai.clean();
	rendering = {};

	if(renderImages)
		revokeAllObjectURL();

	rendered = {};
	renderedMagnifyingGlass = {};
	renderedQuality = {};
	renderedMagnifyingGlassQuality = {};

	if(readingBody) readingBody.classList.remove('resizing');

	const visbleImages = getVisbleImages(doublePage);
	setRenderQueue(visbleImages.prev, visbleImages.next);

	sendToQueueST = setTimeout(function(){
		const limits = getQueueLimits();

		if(scaleMagnifyingGlass) setRenderQueue(doublePage ? 3 : 2, doublePage ? 4 : 2, false, true);
		setRenderQueue(limits.prev, limits.next);

	}, 400);
}

async function setEbookConfigChanged(ebookConfig)
{
	ebookConfigChanged = true;

	if(renderEbook && ebook)
		ebook.updateConfig(ebookConfig);
}

async function focusIndex(index, _doublePage = false)
{
	if(!file && !renderImages) return;

	clearTimeout(sendToQueueST);

	currentIndex = index;
	doublePage = !!_doublePage;
	const isScrollView = reading.readingViewIs('scroll');

	if(!isScrollView)
	{
		// Drop stale queued renders from previous turns so the current page does not wait behind old work.
		queue.clean('readingRender');
		ai.clean();
		rendering = {};
	}

	const immediateSourceWindow = isScrollView ? 10 : (_doublePage ? 6 : 5);
	primeImmediateSourceWindow(immediateSourceWindow, immediateSourceWindow);
	pruneRenderedObjectURL();

	const immediateQueue = isScrollView ? getVisbleImages(_doublePage) : {
		prev: _doublePage ? 2 : 1,
		next: _doublePage ? 3 : 2,
	};
	const limits = getQueueLimits();
	const prioritizeNext = getPrioritizeNextWindow(_doublePage);

	setRenderQueue(immediateQueue.prev, immediateQueue.next, false, false, prioritizeNext);

	sendToQueueST = setTimeout(function(){

		setRenderQueue(limits.prev, limits.next, false, false, prioritizeNext);

		if(scaleMagnifyingGlass) setRenderQueue(doublePage ? 3 : 2, doublePage ? 4 : 2, false, true);

	}, 180);
}

function revokeAllObjectURL()
{
	// const total = renderedObjectsURL.reduce((acc, o) => acc + o.data.size, 0);
	// console.log(`Total blob payload megabytes: ${(total / (1024 * 1024)).toFixed(2)} MB in ${renderedObjectsURL.length} images`);

	for(let i = 0, len = renderedObjectsURL.length; i < len; i++)
	{
		renderedObjectsURL[i].img.classList.remove('blobRendered');
		URL.revokeObjectURL(renderedObjectsURL[i].data.blob);
	}

	renderedObjectsURL = [];
	renderedObjectsURLCache = {};
}

function revokeObjectURL(key, force = false)
{
	const index = renderedObjectsURL.findIndex(o => o.key === key);

	if(index !== -1)
	{
		const entry = renderedObjectsURL[index];
		const blob = entry?.data?.blob;

		if(!force)
		{
			if(entry?.createdAt && (Date.now() - entry.createdAt) < 30000)
				return false;

			const images = document.querySelectorAll('img');
			for(let i = 0, len = images.length; i < len; i++)
			{
				if(images[i].src === blob)
					return false;
			}
		}

		// renderedObjectsURL[index].img.classList.remove('blobRendered');
		URL.revokeObjectURL(blob);

		renderedObjectsURL.splice(index, 1);
		delete renderedObjectsURLCache[key];

		return true;
	}

	return false;
}

function renderedBlobLimit()
{
	if(!renderCanvas || !file || !file.getFeatures)
		return reading.readingViewIs('scroll') ? 48 : 32;

	try
	{
		const features = file.getFeatures();
		if(features && features.pdf)
			return file?.pdfFastRead ? 3 : 4;
	}
	catch(e){}

	if(reading.readingViewIs('scroll'))
		return 48;

	return 24;
}

function scheduleRenderedPdfDimensionsSync()
{
	clearTimeout(syncRenderedPdfDimensionsST);
	syncRenderedPdfDimensionsST = setTimeout(function() {

		syncRenderedPdfDimensionsST = false;

		try
		{
			reading.disposeImages();
			reading.calculateView();
			reading.stayInLine();
		}
		catch(error) {}

	}, 40);
}

function syncRenderedPdfDimensions(index, imageData, data = false)
{
	if(!isPdfCanvasMode() || !data || !imagesData[index])
		return;

	const originalWidth = Math.max(1, Math.round(data.originalWidth || 0));
	const originalHeight = Math.max(1, Math.round(data.originalHeight || 0));

	if(!originalWidth || !originalHeight)
		return;

	const rotated90 = (imageData?.rotated == 1 || imageData?.rotated == 2) ? true : false;
	const nextWidth = rotated90 ? originalHeight : originalWidth;
	const nextHeight = rotated90 ? originalWidth : originalHeight;
	const current = imagesData[index];

	if(current.width === nextWidth && current.height === nextHeight)
		return;

	current.width = nextWidth;
	current.height = nextHeight;
	current.aspectRatio = nextWidth / nextHeight;

	scheduleRenderedPdfDimensionsSync();
}

function pruneRenderedObjectURL()
{
	const limit = renderedBlobLimit();
	if(renderedObjectsURL.length <= limit) return;

	// Sort by creation time, evict oldest entries beyond the limit
	const toEvict = renderedObjectsURL
		.filter(o => !o.pinned && o.createdAt && (Date.now() - o.createdAt) > 30000)
		.slice(0, renderedObjectsURL.length - limit);

	for(let i = 0; i < toEvict.length; i++)
	{
		revokeObjectURL(toEvict[i].key, false);
	}
}

function reRenderImage(index, runAi = false)
{
	const image = imagesData[index] || false;
	if(!image) return;

	const contentRight = template._contentRight();

	const img = contentRight.querySelector('.reading-body > div > div.r-flex .r-img-i'+index+' oc-img img');
	if(!img) return;

	const src = img.dataset.src;

	const toRevoke = renderedObjectsURL.filter(o => o.src === src).map(o => o.key);
	toRevoke.forEach(function(key) { revokeObjectURL(key, true); });

	renderedMagnifyingGlass[index] = false;
	rendered[index] = false;
	renderedMagnifyingGlassQuality[index] = false;
	renderedQuality[index] = false;

	setRenderQueue(doublePage ? 3 : 2, doublePage ? 4 : 2, false, false, false, runAi);

	if(scaleMagnifyingGlass)
		setRenderQueue(doublePage ? 3 : 2, doublePage ? 4 : 2, false, true, false, runAi);
}

async function setRenderQueue(prev = 1, next = 1, scale = false, magnifyingGlass = false, prioritizeNext = false, runAi = true)
{
	//console.time('readingRender');

	let _rendered = magnifyingGlass ? renderedMagnifyingGlass : rendered;
	let _renderedQuality = magnifyingGlass ? renderedMagnifyingGlassQuality : renderedQuality;
	const prioritizeForward = prioritizeNext ? Math.max(0, prioritizeNext) : 0;
	const forwardIsReverse = reading.readingManga ? reading.readingManga() : false;

	for(let i = 0, len = Math.max(next, prev + prioritizeForward); i < len; i++)
	{
		const forwardDistance = i;
		const backwardDistance = i - prioritizeForward;
		const forwardI = forwardIsReverse ? currentIndex - forwardDistance : currentIndex + forwardDistance;
		const backwardI = forwardIsReverse ? currentIndex + backwardDistance : currentIndex - backwardDistance;

		// Forward pages in the active reading direction
		if(i < next && shouldQueueRender(forwardI, _rendered, _renderedQuality, scale, magnifyingGlass) && imagesData[forwardI] && !isRendering(forwardI, magnifyingGlass))
		{
			setRendering(forwardI, magnifyingGlass, true);

			if(renderEbook) // Render ebook instantly
			{
				await render(forwardI, scale, magnifyingGlass, 0, runAi);
			}
			else
			{
				queue.add('readingRender', async function(queueIndex) {

					return render(forwardI, scale, magnifyingGlass, queueIndex, runAi);

				}, queue.index('readingRender'));
			}
		}

		// Backward pages after giving forward pages a head start
		if(backwardDistance > 0 && backwardDistance <= prev && forwardI != backwardI && shouldQueueRender(backwardI, _rendered, _renderedQuality, scale, magnifyingGlass) && imagesData[backwardI] && !isRendering(backwardI, magnifyingGlass))
		{
			setRendering(backwardI, magnifyingGlass, true);

			if(renderEbook) // Render ebook instantly
			{
				render(backwardI, scale, magnifyingGlass, 0, runAi);
			}
			else
			{
				queue.add('readingRender', async function(queueIndex) {

					return render(backwardI, scale, magnifyingGlass, queueIndex, runAi);

				}, queue.index('readingRender'));
			}
		}
	}

	queue.end('readingRender', function() {

		//console.timeEnd('readingRender');

	});
}

async function setOnRender(num = 1, callback = false)
{
	queue.clean('readingRender');
	ai.clean();
	rendering = {};

	onRender = {
		num: num,
		callback: callback,
	};
}

async function render(index, _scale = false, magnifyingGlass = false, queueIndex = 0, runAi = true)
{
	try
	{
		let imageData = imagesData[index] || false;

		if(imageData)
		{
		let contentRight = template._contentRight();

		let rImg = contentRight.querySelector(magnifyingGlass ? '.reading-lens > div > div > div.r-flex .r-img-i'+index : '.reading-body > div > div.r-flex .r-img-i'+index);
		if(!rImg) return;

		const rotated90 = (imageData?.rotated == 1 || imageData?.rotated == 2) ? true : false;

		if(renderEbook)
		{
			const ebookPage = ebook.page(index - 1);
			const ebookHtml = (ebookPage && typeof ebookPage.html !== 'undefined' && ebookPage.html)
				? ebookPage.html
				: '<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:24px;font-family:sans-serif;">Page unavailable</body></html>';

			rendered[index] = 1;
			renderedMagnifyingGlass[index] = 1;

			let iframe = ebook.pageToIframe(ebookHtml);
			let iframeMG = iframe.cloneNode(true);
			fitEbookIframeContent(iframe);
			fitEbookIframeContent(iframeMG);

			let ocImg = contentRight.querySelector('.r-img-i'+index+' oc-img');
			let ocImgMG = contentRight.querySelector('.reading-lens .r-img-i'+index+' oc-img');

			if(ocImg)
			{
				let prevIframe = ocImg.querySelector('iframe');
				if(prevIframe) prevIframe.remove();

				ocImg.appendChild(iframe);
			}

			if(ocImgMG)
			{
				let prevIframeMG = ocImgMG.querySelector('iframe');
				if(prevIframeMG) prevIframeMG.remove();

				ocImgMG.appendChild(iframeMG);
			}

			if(ebookConfigChanged)
			{
				ebook.applyConfigToHtml(iframe.contentDocument);
				ebook.applyConfigToHtml(iframeMG.contentDocument);
			}
		}
		else if(renderImages || renderCanvas)
		{
			const shouldSyncDecode = ((onRender && onRender.num > 0) || _scale !== false);
			let renderQuality = shouldUseProcessedImageRender(index, magnifyingGlass) ? 'pending' : 'fast';
			let cssMethods = {
				'pixelated': 'pixelated',
				'webkit-optimize-contrast': '-webkit-optimize-contrast',
			};

			let affineInterpolationMethods = {
				'bicubic': 'bicubic',
				'bilinear': 'bilinear',
				'nohalo': 'nohalo',
				'locally-bounded-bicubic': 'lbb',
				'vertex-split-quadratic-basis-spline': 'vsqbs',
			};

			_scale = (_scale || scale);

			let ocImg = rImg.querySelector('oc-img');
			if(!ocImg) return;

			let img = ocImg.querySelector('img');
			if(!img) return;

			let originalWidth = +ocImg.dataset.width;
			let originalHeight = +ocImg.dataset.height;

			if(isNaN(originalWidth) || isNaN(originalHeight)) return;

			if(magnifyingGlass)
				_scale = scale * scaleMagnifyingGlass;

			let renderDevicePixelRatio = window.devicePixelRatio;
			if(isPdfCanvasMode())
			{
				const pdfDevicePixelRatioCap = file?.pdfFastRead ? 1 : 1.25;
				renderDevicePixelRatio = Math.min(renderDevicePixelRatio, pdfDevicePixelRatioCap);
			}
			if(runAi)
				console.log('[ai.trace] render:scale', {index, windowDevicePixelRatio: window.devicePixelRatio, renderDevicePixelRatio, originalWidth, originalHeight});

			_scale = _scale * renderDevicePixelRatio;

			let _config = {
				width: rotated90 ? Math.round(originalHeight * _scale) : Math.round(originalWidth * _scale),
				height: rotated90 ? Math.round(originalWidth * _scale) : Math.round(originalHeight * _scale),
				compressionLevel: 0,
				// kernel: 'lanczos3',
			};

			let src = img.dataset.src;
			const path = img.dataset.path;
			const key = isPdfCanvasMode() ? src+'|pdf|'+_config.width : src+'|'+_config.width+'x'+_config.height;
			if(runAi)
				console.log('[ai.trace] render:start', {index, src, path, renderCanvas, magnifyingGlass, targetWidth: _config.width, targetHeight: _config.height, key});

			fileManager.macosStartAccessingSecurityScopedResource(src);

			if(compatible.image.convert(path)) // Convert unsupported images
				src = await workers.convertImage(path, {priorize: true});

			const aiInputSrc = src;

			const aiPath = ai.image(src, imageData, {
				run: runAi,
				start: function() {

					if(!magnifyingGlass && !ocImg.querySelector('.ai-loading'))
					{
						const html = template.load('ai.loading.html');
						ocImg.insertAdjacentHTML('beforeend', html);

						//const loading = ocImg.querySelector('.ai-loading .loading');
						//if(loading) events.loadingProgress(loading, 0);
					}

				},
				progress: function(progress) {

					/*const icon = ocImg.querySelector('.ai-loading .material-icon');
					if(icon) icon.style.animationDuration = '1s';

					const loading = ocImg.querySelector('.ai-loading .loading');
					if(loading)
					{
						loading.style.opacity = 1;
						events.loadingProgress(loading, progress);
					}*/

				},
				end: function(aiPath) {

					const aiLoading = ocImg.querySelector('.ai-loading');
					if(aiLoading) aiLoading.remove();

					reRenderImage(index, false);

				}
			});

			if(runAi || aiPath)
			{
				try {
					const meta = await image.metadata(aiInputSrc);
					let sizeBytes = 0;
					try {
						if(typeof fs !== 'undefined' && fs && fs.statSync)
							sizeBytes = fs.statSync(aiInputSrc).size;
					} catch (e) {}
					console.log('[ai.trace] render:src-meta', {index, src: aiInputSrc, width: meta.width, height: meta.height, format: meta.format, sizeBytes});
				}
				catch (e) {
					console.log('[ai.trace] render:src-meta-error', {index, src: aiInputSrc, message: e?.message || String(e)});
				}
			}

			if(aiPath)
				src = aiPath;
			if(runAi || aiPath)
				console.log('[ai.trace] render:ai-result', {index, aiPath: !!aiPath, src});
			if(aiPath)
			{
				try {
					const meta = await image.metadata(aiPath);
					let sizeBytes = 0;
					try {
						if(typeof fs !== 'undefined' && fs && fs.statSync)
							sizeBytes = fs.statSync(aiPath).size;
					} catch (e) {}
					console.log('[ai.trace] render:ai-meta', {index, src: aiPath, width: meta.width, height: meta.height, format: meta.format, sizeBytes});
				}
				catch (e) {
					console.log('[ai.trace] render:ai-meta-error', {index, src: aiPath, message: e?.message || String(e)});
				}
			}

			const imageSize = aiPath ? reading.ai.size(imageData) : imageData;
			_config.kernel = _config.width > imageSize.width ? config.readingImageInterpolationMethodUpscaling : config.readingImageInterpolationMethodDownscaling;
			if(runAi || aiPath)
				console.log('[ai.trace] render:image-size-kernel', {index, imageSizeWidth: imageSize.width, imageSizeHeight: imageSize.height, targetWidth: _config.width, targetHeight: _config.height, kernel: _config.kernel});

			if(renderCanvas)
			{
				let maxWidth = config.renderMaxWidth;
				if(isPdfCanvasMode())
					maxWidth = Math.min(maxWidth, file?.pdfFastRead ? 2800 : 3200);

				if(_config.width > maxWidth)
				{
					const ratio = maxWidth / _config.width;
					_config.width = maxWidth;
					_config.height = Math.max(1, Math.round(_config.height * ratio));
					if(runAi || aiPath)
						console.log('[ai.trace] render:max-width-cap', {index, maxWidth, cappedWidth: _config.width, cappedHeight: _config.height, ratio});
				}

				// Skip cache if AI path was applied; cache key is based on original src, not aiPath
				if(!aiPath && renderedObjectsURLCache[key])
				{
					const data = renderedObjectsURLCache[key];
					syncRenderedPdfDimensions(index, imageData, data);
					if(runAi)
						console.log('[ai.trace] render:cache-hit-non-ai', {index, key, blobWidth: data.width, blobHeight: data.height});

					img.src = data.blob;
					img.classList.add('blobRendered', 'blobRender', 'sizeFromImg');
					img.style.imageRendering = '';

					img.dataset.width = Math.round(data.width);
					img.dataset.height = Math.round(data.height);
					renderQuality = 'processed';
				}
				else {
					try {
						let name = imageData.name;
						name = (name && !/\.jpg$/.test(name)) ? name + '.jpg' : name;

						let data = false;

						if (name) {
							// If an AI-produced path is available, prefer loading it directly instead of
							// rendering the original PDF page blob. This ensures AI output is shown.
							if (aiPath) {
								console.log('[ai.trace] render:ai-branch', {index, kernel: _config.kernel, targetWidth: _config.width, targetHeight: _config.height, aiSrc: src});
									if (_config.kernel && cssMethods[_config.kernel]) {
										// aiPath is already assigned to src above
										await srcToImage(src, img);
										img.style.imageRendering = cssMethods[_config.kernel];
										console.log('[ai.trace] render:ai-css-kernel', {index, kernel: _config.kernel, cssMethod: cssMethods[_config.kernel]});
									}
									else {
										await ensureDirectImageSource(src, img);
										let aiResizeConfig = {..._config};
										if(!aiResizeConfig.kernel || aiResizeConfig.kernel === 'chromium')
											aiResizeConfig.kernel = 'lanczos3';
										console.log('[ai.trace] render:ai-resize-pre', {index, kernel: aiResizeConfig.kernel, width: aiResizeConfig.width, height: aiResizeConfig.height});

										if(!(await image.isAnimated(src))) {
											if(affineInterpolationMethods[aiResizeConfig.kernel]) {
												aiResizeConfig.imageWidth = rotated90 ? imageSize.height : imageSize.width;
												aiResizeConfig.imageHeight = rotated90 ? imageSize.width : imageSize.height;
												aiResizeConfig.interpolator = affineInterpolationMethods[aiResizeConfig.kernel];
												aiResizeConfig.kernel = false;
											}

											try {
												let data = await image.resizeToBlob(src, aiResizeConfig);
												console.log('[ai.trace] render:ai-resize-done', {index, outputSize: data.size, info: data.info || null});

												img.src = data.blob;
												img.classList.add('blobRendered', 'blobRender');
												img.style.imageRendering = '';
												renderQuality = 'processed';
											}
											catch(error) {
												console.error(error);
												console.log('[ai.trace] render:ai-resize-error', {index, message: error?.message || String(error)});

												await srcToImage(src, img);
												renderQuality = 'fast';
											}
										}
										else {
											renderQuality = 'processed';
											console.log('[ai.trace] render:ai-animated-skip-resize', {index});
										}
									}
									// leave data false so we don't cache a rendered blob
							} else {
								data = await file.renderBlob(name, _config);

								if (!data || !data.blob) {
									await srcToImage(src, img);
								} else {
									renderedObjectsURL.push({ data: data, img: img, key, src, index, createdAt: Date.now() });
									renderedObjectsURLCache[key] = data;
									pruneRenderedObjectURL();
									syncRenderedPdfDimensions(index, imageData, data);

									if (queueIndex !== queue.index('readingRender')) return; // Return if the queue is different

img.src = data.blob;
								img.classList.add('blobRendered', 'blobRender', 'sizeFromImg');
								img.style.imageRendering = '';

									img.dataset.width = Math.round(data.width);
									img.dataset.height = Math.round(data.height);
									renderQuality = 'processed';
								}
							}
						} else {
							await srcToImage(src, img);
							renderQuality = 'processed';
						}
					} catch (error) {
						console.error(error);
						await srcToImage(src, img);
						renderQuality = 'fast';
					}
				}
			}
			else if(!shouldUseProcessedImageRender(index, magnifyingGlass))
			{
				await srcToImage(src, img);
				renderQuality = 'fast';
			}
			else if(_config.width !== imageSize.width && _config.kernel && _config.kernel != 'chromium' && !magnifyingGlass)
			{
				if(cssMethods[_config.kernel])
				{
					img.src = app.encodeSrcURI(app.shortWindowsPath(src, true));
					img.classList.remove('blobRendered', 'blobRender');
					img.style.imageRendering = cssMethods[_config.kernel];
					img.dataset.baseSrc = src;
					renderQuality = 'processed';
				}
				else if(renderedObjectsURLCache[key])
				{
					img.src = renderedObjectsURLCache[key].blob;
					img.classList.add('blobRendered', 'blobRender');
					img.style.imageRendering = '';
					renderQuality = 'processed';
				}
				else
				{
					await ensureDirectImageSource(src, img);

					if(!(await image.isAnimated(src)))
					{
						if(affineInterpolationMethods[_config.kernel])
						{
							_config.imageWidth = rotated90 ? imageSize.height : imageSize.width;
							_config.imageHeight = rotated90 ? imageSize.width : imageSize.height;
							_config.interpolator = affineInterpolationMethods[_config.kernel];

							_config.kernel = false;
						}

						try
						{
							let data = await image.resizeToBlob(src, _config);

							renderedObjectsURL.push({data: data, img: img, key, src, index, createdAt: Date.now()});
							renderedObjectsURLCache[key] = {blob: data.blob};
							pruneRenderedObjectURL();

							if(queueIndex !== queue.index('readingRender')) return; // Return if the queue is different

							img.src = data.blob;
							img.classList.add('blobRendered', 'blobRender');
							img.style.imageRendering = '';
							renderQuality = 'processed';
						}
						catch(error)
						{
							console.error(error);

							await srcToImage(src, img);
							renderQuality = 'fast';
						}
					}
					else
					{
						renderQuality = 'processed';
					}
				}
			}
			else
			{
				await srcToImage(src, img);
				renderQuality = 'processed';
			}

			if(shouldSyncDecode)
				await decodeImage(img, true);
			else
				decodeImage(img, false);

			if(magnifyingGlass)
			{
				renderedMagnifyingGlass[index] = _scale;
				renderedMagnifyingGlassQuality[index] = renderQuality === 'pending' ? 'fast' : renderQuality;
			}
			else
			{
				rendered[index] = _scale;
				renderedQuality[index] = renderQuality === 'pending' ? 'fast' : renderQuality;
			}
			if(runAi || aiPath)
				console.log('[ai.trace] render:done', {index, renderQuality, finalSrc: img.src, className: img.className, imageRendering: img.style.imageRendering || ''});
			if(runAi || aiPath)
			{
				const logDims = () => {
					console.log('[ai.trace] render:img-dimensions', {
						index,
						naturalWidth: img.naturalWidth,
						naturalHeight: img.naturalHeight,
						clientWidth: img.clientWidth,
						clientHeight: img.clientHeight,
						containerWidth: ocImg.clientWidth,
						containerHeight: ocImg.clientHeight,
						datasetWidth: ocImg.dataset.width,
						datasetHeight: ocImg.dataset.height,
						scale: _scale,
						renderDevicePixelRatio,
					});
				};
				if(img.complete)
					logDims();
				else
					img.addEventListener('load', logDims, {once: true});
			}
		}

		if(onRender)
		{
			onRender.num--;

			if(onRender.num <= 0)
			{
				let img = rImg.querySelector('oc-img img');

				if(img && !img.complete)
				{
					await new Promise(function(resolve){

						img.onload = resolve;
						img.onerror = resolve;

					});
				}

				onRender.callback();
				onRender = false;
			}
		}
		}

		return;
	}
	finally
	{
		setRendering(index, magnifyingGlass, false);
	}
}

async function srcToImage(src, img)
{
	img.src = app.encodeSrcURI(app.shortWindowsPath(src, true));
	img.classList.remove('blobRendered', 'blobRender');
	img.style.imageRendering = '';
	img.dataset.baseSrc = src;

	return true;
}

async function decodeImage(img, sync = false)
{
	if(sync)
	{
		try
		{
			await img.decode();
		}
		catch(e){}	
	}

	observer.observe(img);
}

var observer = false;

function createObserver()
{
	if(observer)
		observer.disconnect();

	observer = new IntersectionObserver(function(entries) {

		for(let i = 0, len = entries.length; i < len; i++)
		{
			const entry = entries[i];

			if(entry.isIntersecting || entry.intersectionRatio > 0)
			{				
				try
				{
					entry.target.decode();
				}
				catch(e){}	
			}
		}

	}, {
		root: template._contentRight().firstElementChild,
		rootMargin: isPdfCanvasMode() ? '1200px' : (reading.readingViewIs('scroll') ? '9000px' : '4000px'),
		threshold: 0,
	});
}

module.exports = {
	setFile: setFile,
	reset: reset,
	setImagesData: setImagesData,
	setMagnifyingGlassStatus: setMagnifyingGlassStatus,
	setScale: setScale,
	setScaleMagnifyingGlass: setScaleMagnifyingGlass,
	render: render,
	focusIndex: focusIndex,
	resized: resized,
	setEbookConfigChanged: setEbookConfigChanged,
	setOnRender: setOnRender,
	revokeAllObjectURL: revokeAllObjectURL,
	get rendered() {return rendered},
}
