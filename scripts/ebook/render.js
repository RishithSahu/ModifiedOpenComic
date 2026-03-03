const ipcRenderer = require('electron').ipcRenderer,
	p = require('path');

const app = require(p.join(__dirname, '../.dist/app.js'));
const ebook = require(p.join(__dirname, '../.dist/ebook.js'));
const book = ebook.load();

var windowIsLoaded = false, toProcess = false;

window.onload = function() {

	windowIsLoaded = true;

	if(toProcess)
		process(toProcess);

	toProcess = false;

}

function removeDocumentIframes()
{
	// Remove prev iframes
	let iframes = document.querySelectorAll('iframe');

	for(let i = 0, len = iframes.length; i < len; i++)
	{
		iframes[i].remove();
	}
}

function parseChapterHtml(html = '')
{
	let doc = new DOMParser().parseFromString(html, 'application/xhtml+xml');

	// Fallback for invalid XHTML chapters common in some EPUBs.
	if(doc.querySelector('parsererror'))
		doc = new DOMParser().parseFromString(html, 'text/html');

	return doc;
}

async function handleRenderError(data, error)
{
	console.error('Ebook render job failed', error);

	try
	{
		if(data.type == 'render-page')
			ipcRenderer.send('rendered-page', data.index, []);
		else
			ipcRenderer.send('rendered-ebook', data.index, []);
	}
	catch(error2){}

	removeDocumentIframes();
}

async function process(data)
{
	try
	{
		if(data.type == 'split-in-pages')
		{
			book.updateConfig(data.config);
			let pages = await book.splitInPages(data.html.documentElement, data.basePath, data.path);

			ipcRenderer.send('rendered-ebook', data.index, pages);

			removeDocumentIframes();
		}
		else if(data.type == 'render-page')
		{
			removeDocumentIframes();

			book.updateConfig(data.config);
			let pages = await book.splitInPages(data.html.documentElement, data.basePath, data.path);

			if(!pages || !pages.length || !pages[0]?.html)
			{
				ipcRenderer.send('rendered-page', data.index, []);
				return;
			}

			let renderPageIframe = book.pageToIframe(pages[0].html);

			renderPageIframe.addEventListener('load', function(event) {

				// Delay this to avoid white pages or pages from prev iframe
				window.requestAnimationFrame(function(){

					window.requestAnimationFrame(function(){

						ipcRenderer.send('rendered-page', data.index, pages);

					});

				});

			});

			document.body.appendChild(renderPageIframe);
			if(data.config.imageWidth) renderPageIframe.style.transform = 'scale('+(data.config.imageWidth / data.config.width)+')';
		}
	}
	catch(error)
	{
		await handleRenderError(data, error);
	}
}

ipcRenderer.on('render', function(event, data) {

	try
	{
		data.html = parseChapterHtml(data.html);
	}
	catch(error)
	{
		handleRenderError(data, error);
		return;
	}

	if(!windowIsLoaded)
		toProcess = data;
	else
		process(data).catch(function(error){
			handleRenderError(data, error);
		});

});

ipcRenderer.on('ping', function(event, index) {

	ipcRenderer.send('pong', index);

});
