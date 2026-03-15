// Tutorial system for first-time users
// Shows a step-by-step guided tour highlighting UI elements with explanatory dialogues

var tutorial = {

	_active: false,
	_stepIndex: 0,
	_steps: [],
	_overlay: null,
	_dialog: null,
	_highlight: null,
	_actionCleanup: null,
	_actionTimer: null,
	_actionPoll: null,

	steps: function() {
		return [
			// === WELCOME ===
			{
				id: 'welcome',
				title: 'Welcome to OpenComic!',
				text: 'This quick tour will walk you through every feature so you can get the most out of OpenComic. You can skip at any time.',
				selector: null,
				position: 'center',
				icon: 'auto_stories',
			},

			// === SIDEBAR / CONTENT LEFT ===
			{
				title: 'Library',
				text: 'This is your Library — the home screen. All your added comics, manga, and ebooks appear here as a browsable grid or list.',
				selector: '.content-left .menu-item-library',
				position: 'right',
				icon: 'book',
			},
			{
				title: 'Recents',
				text: 'Recents shows files you\'ve opened recently, so you can quickly jump back into whatever you were reading.',
				selector: '.content-left .menu-item-recently-opened',
				position: 'right',
				icon: 'history',
			},
			{
				title: 'Favorites',
				text: 'Mark any comic or manga as a Favorite with a right-click and it will show up here for quick access.',
				selector: '.content-left .menu-item-favorites',
				position: 'right',
				icon: 'favorite',
			},
			{
				title: 'OPDS Catalogs',
				text: 'OpenComic supports OPDS catalogs — online comic/ebook libraries you can browse and download from directly inside the app.',
				selector: '.content-left .menu-item-opds',
				position: 'right',
				icon: 'local_library',
			},
			{
				title: 'Language Settings',
				text: 'Change the app\'s display language here. OpenComic supports over 20 languages.',
				selector: '.content-left .menu-item-language',
				position: 'right',
				icon: 'language',
			},
			{
				title: 'Theme',
				text: 'Customize the look of OpenComic. Choose accent colors and switch between light and dark modes.',
				selector: '.content-left .menu-item-theme',
				position: 'right',
				icon: 'palette',
			},
			{
				title: 'Settings',
				text: 'Access all configuration options: master folders, server connections, reading behavior, keyboard shortcuts, tap zones, gamepad settings, and more.',
				selector: '.content-left .menu-item-settings',
				position: 'right',
				icon: 'settings',
			},

			// === HEADER BAR BUTTONS ===
			{
				title: 'Sort',
				text: 'Sort your comics by name, number, date added, last reading, and more. You can also choose folders-first or compressed-first ordering.',
				selector: '.bar-right-buttons .button-sort',
				position: 'bottom',
				icon: 'sort',
			},
			{
				title: 'View Mode',
				text: 'Toggle between Grid view and List view. In Grid mode you can also adjust the thumbnail size using the slider in this menu.',
				selector: '.bar-right-buttons .button-view',
				position: 'bottom',
				icon: 'view_module',
			},
			{
				title: 'Reload',
				text: 'Refresh the current folder view. Useful if you\'ve added or removed files outside of OpenComic.',
				selector: '.bar-right-buttons [hover-text] .material-icon:not(.button-sort):not(.button-view)',
				selectorFallback: '.bar-right-buttons div div[onclick*="dom.reload"]',
				position: 'bottom',
				icon: 'refresh',
			},
			{
				title: 'Genre Filter',
				text: 'Filter comics on the current page by genre. This uses metadata from tracking sites like AniList to let you browse by action, romance, comedy, etc.',
				selector: '.bar-right-buttons .button-genre-filter',
				position: 'bottom',
				icon: 'filter_list',
			},
			{
				title: 'Search',
				text: 'Search through your library by title. The search bar supports deep search across all your master folders and subfolders.',
				selector: '.bar-right-buttons .button-search',
				position: 'bottom',
				icon: 'search',
			},
			{
				title: 'Pick at Random',
				text: 'Can\'t decide what to read? This button picks a random comic or manga from the current folder for you!',
				selector: '.bar-right-buttons .button-random',
				position: 'bottom',
				icon: 'shuffle',
			},
			{
				title: 'Labels',
				text: 'Create custom labels (like "To Read", "Completed", "Favorite Shonen") and assign them to any comic. Filter your library by label to stay organized.',
				selector: '.bar-right-buttons .button-labels',
				position: 'bottom',
				icon: 'label',
			},

			// === FLOATING ACTION BUTTONS ===
			{
				title: 'Add Comics',
				text: 'Use the + button to add individual comic files (CBZ, CBR, PDF, EPUB, ZIP, 7Z, etc.) or entire folders to your library.',
				selector: '.floating-action-button-add',
				position: 'top',
				icon: 'add',
			},

			// === OPEN SAMPLE COMIC ===
			{
				id: 'open-sample',
				title: 'Open the Sample Comic',
				text: 'Click "Pepper & Carrot" to open the included sample. We will use it to learn the reading controls.',
				getTarget: function() { return tutorial._findLibraryItemByName('Pepper & Carrot', true, 'Pepper & Carrot'); },
				position: 'right',
				icon: 'menu_book',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
			},
			{
				id: 'open-episode-1',
				title: 'Open Episode 1',
				text: 'Now click "Episode 1, Potion of Flight" to start reading.',
				getTarget: function() { return tutorial._findLibraryItemByName('Episode 1, Potion of Flight', true, 'Episode 1, Potion of Flight'); },
				position: 'right',
				icon: 'auto_stories',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
			},

			// === GENERAL FEATURES (no specific element) ===
			{
				title: 'Supported Formats',
				text: 'OpenComic reads images (JPG, PNG, WEBP, AVIF, GIF, SVG, and more), compressed archives (CBZ, CBR, ZIP, RAR, 7Z, TAR), PDFs, and EPUBs.',
				selector: null,
				position: 'center',
				icon: 'description',
			},
			{
				title: 'Master Folders',
				text: 'In Settings, add Master Folders — top-level directories where your comics live. OpenComic will automatically detect and display everything inside them in the sidebar.',
				selector: null,
				position: 'center',
				icon: 'folder_special',
			},
			{
				title: 'Server Connections',
				text: 'Connect to remote servers using SMB, FTP, SFTP, SSH, S3, or WebDAV. Browse and read comics stored on network drives or cloud services.',
				selector: null,
				position: 'center',
				icon: 'cloud',
			},
			// === READING CONTROLS (interactive) ===
			{
				id: 'reading-next',
				title: 'Next Page',
				text: 'Click Next to move forward in the story.',
				selector: '.reading-header .button-next',
				position: 'bottom',
				icon: 'navigate_next',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				title: 'Previous Page',
				text: 'Click Previous to go back one page.',
				selector: '.reading-header .button-prev',
				position: 'bottom',
				icon: 'navigate_before',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				title: 'Jump to Last Page',
				text: 'Click Last Page to jump to the end.',
				selector: '.reading-header .button-last-page',
				position: 'bottom',
				icon: 'last_page',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				title: 'Back to First Page',
				text: 'Click First Page to return to the start.',
				selector: '.reading-header .button-first-page',
				position: 'bottom',
				icon: 'first_page',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				title: 'Page Layout',
				text: 'Open Page Layout to switch between single, double-page, and other layout options.',
				selector: '.reading-header .button-page-layout',
				position: 'bottom',
				dialogCorner: 'bottom-right',
				icon: 'auto_stories',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				title: 'Reading Mode',
				text: 'Choose Slide or Scroll to change how pages move.',
				selector: '#reading-pages .tabs-page-layout .reading-view-slide',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'transition_slide',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				title: 'Double Page',
				text: 'Toggle Double Page to view two pages side-by-side.',
				selector: '#reading-pages .tabs-page-layout .reading-double-page',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'auto_stories',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				title: 'AI Tools',
				text: 'Open AI Tools for upscaling, descreening, and artifact removal.',
				selector: '.reading-header .button-ai',
				position: 'bottom',
				dialogCorner: 'bottom-right',
				icon: 'auto_awesome',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				title: 'Test Features',
				text: 'Open More Options to access experimental and extra controls.',
				selector: '.reading-header .button-more-options',
				position: 'bottom',
				dialogCorner: 'bottom-right',
				icon: 'science',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				title: 'Color Filters',
				text: 'Open Color Filters to adjust brightness, contrast, and more.',
				selector: '.reading-header .button-filters',
				position: 'bottom',
				dialogCorner: 'bottom-right',
				icon: 'invert_colors',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				title: 'Magnifying Glass',
				text: 'Open the Magnifying Glass menu to zoom into small details.',
				selector: '.reading-header .button-magnifying-glass',
				position: 'bottom',
				dialogCorner: 'bottom-right',
				icon: 'search',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				title: 'Add a Bookmark',
				text: 'Click the Bookmark button to save your place.',
				selector: '.reading-header .button-bookmark',
				position: 'bottom',
				icon: 'bookmark_border',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				title: 'View Bookmarks',
				text: 'Open Bookmarks to see and jump to saved pages.',
				selector: '.reading-header .button-collections-bookmark',
				position: 'bottom',
				dialogCorner: 'bottom-right',
				icon: 'collections_bookmark',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				title: 'Tracking',
				text: 'Open Tracking to sync your progress with AniList or MyAnimeList.',
				selector: '.reading-header .button-tracking-sites',
				position: 'bottom',
				dialogCorner: 'bottom-right',
				icon: 'sync',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				id: 'back-to-library',
				title: 'Back to Library',
				text: 'Click Library in the header path to return to your Library.',
				selector: null,
				getTarget: function() {
					return tutorial._findHeaderBreadcrumb('Library')
						|| document.querySelector('.reading-header .bar-title .bar-title-a')
						|| document.querySelector('.reading-header .bar-back');
				},
				position: 'right',
				icon: 'book',
				requireAction: true,
				advanceOn: { type: 'click', useTarget: true, selector: '.reading-header .bar-title .bar-title-a, .reading-header .bar-back' },
				requiresSampleReading: true,
			},

			// === FINISH ===
			{
				title: 'You\'re all set!',
				text: 'You\'ve opened the sample and practiced the core reading tools. Add your own library folders anytime, and restart this tutorial from Settings if you want a refresher.',
				selector: null,
				position: 'center',
				icon: 'celebration',
			},
		];
	},

	hasSample: function() {
		try {
			if (typeof fs === 'undefined' || typeof p === 'undefined')
				return false;

			if (typeof document !== 'undefined') {
				const cards = Array.from(document.querySelectorAll('.content-view-module .v-text'));
				const inLibrary = cards.some(el => (el.textContent || '').trim() === 'Pepper & Carrot');
				if (!inLibrary)
					return false;
			}

			if (typeof storage !== 'undefined' && typeof storage.get === 'function') {
				const comics = storage.get('comics') || [];
				for (let i = 0, len = comics.length; i < len; i++) {
					const comic = comics[i];
					if (!comic || comic.name !== 'Pepper & Carrot')
						continue;

					let samplePath = comic.path || '';
					if (typeof relative !== 'undefined' && typeof relative.resolve === 'function')
						samplePath = relative.resolve(samplePath);

					if (samplePath && fs.existsSync(samplePath))
						return true;
				}
			}

			if (typeof appDir !== 'undefined')
				return fs.existsSync(p.join(appDir, 'Pepper & Carrot'));

			return false;
		}
		catch (error) {
			return false;
		}
	},

	_notifyMissingSample: function() {
		if (typeof events === 'undefined' || typeof events.snackbar !== 'function')
			return;

		events.snackbar({
			key: 'tutorialMissingSample',
			text: 'Tutorial requires the Pepper & Carrot sample. Open Help > Guides instead.',
			duration: 8,
			update: true,
		});
	},

	start: function() {
		if (tutorial._active) return;
		if (!tutorial.hasSample()) {
			tutorial._notifyMissingSample();
			return;
		}

		tutorial._steps = tutorial.steps();
		tutorial._stepIndex = 0;
		tutorial._active = true;
		tutorial._createOverlay();
		tutorial._showStep();
	},

	skip: function() {
		tutorial._cleanup();
		tutorial._markCompleted();
	},

	_markCompleted: function() {
		storage.updateVar('config', 'tutorialCompleted', true);
		config.tutorialCompleted = true;
	},

	_createOverlay: function() {
		// Remove any existing tutorial elements
		tutorial._removeExisting();

		// Create overlay backdrop
		var overlay = document.createElement('div');
		overlay.className = 'tutorial-overlay';
		overlay.addEventListener('click', function(e) {
			if (e.target === overlay) {
				// Click on backdrop does nothing — must use buttons
			}
		});

		// Create highlight cutout element
		var highlight = document.createElement('div');
		highlight.className = 'tutorial-highlight';

		// Create dialog
		var dialog = document.createElement('div');
		dialog.className = 'tutorial-dialog elevation-3';

		overlay.appendChild(highlight);
		overlay.appendChild(dialog);
		document.querySelector('.app').appendChild(overlay);

		tutorial._overlay = overlay;
		tutorial._highlight = highlight;
		tutorial._dialog = dialog;
	},

	_removeExisting: function() {
		var existing = document.querySelector('.tutorial-overlay');
		if (existing) existing.remove();
	},

	_cleanup: function() {
		tutorial._clearStepAction();
		tutorial._active = false;
		tutorial._removeExisting();
		tutorial._overlay = null;
		tutorial._dialog = null;
		tutorial._highlight = null;
	},

	_showStep: function() {
		tutorial._clearStepAction();
		var step = tutorial._steps[tutorial._stepIndex];
		if (!step) {
			tutorial._cleanup();
			tutorial._markCompleted();
			return;
		}

		if (step.id === 'open-sample') {
			if (tutorial._isReadingSample()) {
				var readingIndex = tutorial._findStepIndexById('reading-next');
				if (readingIndex !== -1) {
					tutorial._stepIndex = readingIndex;
					return tutorial._showStep();
				}
			} else if (tutorial._isInSampleLibrary()) {
				var episodeIndex = tutorial._findStepIndexById('open-episode-1');
				if (episodeIndex !== -1) {
					tutorial._stepIndex = episodeIndex;
					return tutorial._showStep();
				}
			}
		}

		if (step.id === 'open-episode-1' && tutorial._isReadingSample()) {
			var nextIndex = tutorial._findStepIndexById('reading-next');
			if (nextIndex !== -1) {
				tutorial._stepIndex = nextIndex;
				return tutorial._showStep();
			}
		}

		if (step.requiresSampleReading && !tutorial._isReadingSample()) {
			var fallbackIndex = tutorial._findStepIndexById('open-episode-1');
			if (fallbackIndex !== -1) {
				tutorial._stepIndex = fallbackIndex;
				return tutorial._showStep();
			}
		}

		var targetEl = tutorial._resolveTarget(step);

		// Build dialog content
		var totalSteps = tutorial._steps.length;
		var currentStep = tutorial._stepIndex + 1;

		var html = '';
		html += '<div class="tutorial-dialog-header">';
		html += '<i class="material-icon tutorial-dialog-icon">' + (step.icon || 'info') + '</i>';
		html += '<span class="tutorial-dialog-title title-medium">' + tutorial._escapeHtml(step.title) + '</span>';
		html += '</div>';
		html += '<div class="tutorial-dialog-body body-medium">' + tutorial._formatText(step.text) + '</div>';
		html += '<div class="tutorial-dialog-footer">';
		html += '<span class="tutorial-dialog-progress body-small">' + currentStep + ' / ' + totalSteps + '</span>';
		html += '<div class="tutorial-dialog-buttons">';
		html += '<div class="tutorial-btn tutorial-btn-skip" onclick="tutorial.skip()">Skip Tour</div>';
		if (tutorial._stepIndex > 0) {
			html += '<div class="tutorial-btn tutorial-btn-prev" onclick="tutorial.prev()">Back</div>';
		}
		if (tutorial._stepIndex < totalSteps - 1) {
			var needsAction = step.requireAction === true;
			var nextClasses = 'tutorial-btn tutorial-btn-next';
			var nextStyle = '';
			if (needsAction) {
				nextClasses += ' tutorial-btn-disabled';
				nextStyle = ' style="pointer-events: none; opacity: 0.5;"';
			}
			html += '<div class="' + nextClasses + '" onclick="tutorial.next()"' + nextStyle + '>Next</div>';
		} else {
			html += '<div class="tutorial-btn tutorial-btn-next tutorial-btn-finish" onclick="tutorial.skip()">Finish</div>';
		}
		html += '</div>';
		if (step.requireAction === true) {
			html += '<div class="tutorial-dialog-hint body-small"></div>';
		}
		html += '</div>';

		tutorial._dialog.innerHTML = html;

		// Position highlight and dialog
		if (targetEl) {
			tutorial._positionOnElement(targetEl, step.position);
		} else {
			tutorial._positionCenter();
		}

		if (step.dialogCorner) {
			tutorial._positionDialogCorner(step.dialogCorner);
		}

		tutorial._bindStepAction(step, targetEl);
	},

	_findLibraryItemByName: function(name, ensureLibraryView, pathToken) {
		if (ensureLibraryView && !document.querySelector('.content-right')) return null;
		var targetName = tutorial._normalizeText(name);
		var token = tutorial._normalizeText(pathToken || name);
		var items = document.querySelectorAll('.content-right .gamepad-item');
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			var label = item.querySelector('.v-text');
			var labelText = tutorial._normalizeText(label ? label.textContent : '');
			var onclick = tutorial._normalizeText(item.getAttribute('onclick') || '');
			if (labelText === targetName || onclick.indexOf(token) !== -1) {
				return item;
			}
		}
		return null;
	},

	_normalizeText: function(value) {
		return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
	},

	_findHeaderBreadcrumb: function(label) {
		var crumbs = document.querySelectorAll('.reading-header .bar-title .bar-title-a');
		var target = tutorial._normalizeText(label);
		for (var i = 0; i < crumbs.length; i++) {
			var text = tutorial._normalizeText(crumbs[i].textContent || '');
			if (text === target) return crumbs[i];
		}
		return crumbs.length ? crumbs[0] : null;
	},

	_findStepIndexById: function(id) {
		for (var i = 0; i < tutorial._steps.length; i++) {
			if (tutorial._steps[i].id === id) return i;
		}
		return -1;
	},

	_isReadingSample: function() {
		if (typeof onReading === 'undefined' || !onReading) return false;
		if (typeof reading === 'undefined' || typeof reading.readingCurrentPath !== 'function') return false;
		var current = reading.readingCurrentPath();
		if (!current || typeof current !== 'string') return false;
		return /Pepper\s*&\s*Carrot/i.test(current);
	},

	_isInSampleLibrary: function() {
		if (typeof dom === 'undefined' || !dom.history || !dom.history.path) return false;
		return /Pepper\s*&\s*Carrot/i.test(dom.history.path);
	},

	_resolveTarget: function(step) {
		var targetEl = null;
		if (step.getTarget) {
			targetEl = step.getTarget();
		}
		if (!targetEl && step.selector) {
			targetEl = document.querySelector(step.selector);
			if (!targetEl && step.selectorFallback) {
				targetEl = document.querySelector(step.selectorFallback);
			}
		}
		if (!targetEl && step.id === 'back-to-library') {
			targetEl = document.querySelector('.reading-header .bar-title .bar-title-a')
				|| document.querySelector('.reading-header .bar-back')
				|| document.querySelector('.reading-header .bar-title');
		}
		if (targetEl) {
			var rect = targetEl.getBoundingClientRect();
			if (rect.width < 2 || rect.height < 2) {
				var fallback = document.querySelector('.reading-header .bar-title .bar-title-a')
					|| document.querySelector('.reading-header .bar-title');
				if (fallback) targetEl = fallback;
			}
		}
		if (targetEl && typeof targetEl.scrollIntoView === 'function') {
			targetEl.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
		}
		return targetEl;
	},

	_clearStepAction: function() {
		if (tutorial._actionCleanup) {
			tutorial._actionCleanup();
			tutorial._actionCleanup = null;
		}
		if (tutorial._actionTimer) {
			clearInterval(tutorial._actionTimer);
			tutorial._actionTimer = null;
		}
		if (tutorial._actionPoll) {
			clearInterval(tutorial._actionPoll);
			tutorial._actionPoll = null;
		}
	},

	_enableNextButton: function() {
		if (!tutorial._dialog) return;
		var nextBtn = tutorial._dialog.querySelector('.tutorial-btn-next');
		if (!nextBtn) return;
		nextBtn.style.pointerEvents = '';
		nextBtn.style.opacity = '';
		nextBtn.classList.remove('tutorial-btn-disabled');
	},

	_bindStepAction: function(step, targetEl) {
		if (!step.requireAction && !step.advanceOn) return;

		var action = step.advanceOn || { type: 'click', useTarget: true };
		var attempts = 0;

		var tryBind = function() {
			var el = null;
			if (action.selector) {
				el = document.querySelector(action.selector);
			}
			if (!el && action.useTarget !== false) {
				el = targetEl || tutorial._resolveTarget(step);
			}
			if (!el) return false;

			if (el && el !== targetEl) {
				tutorial._positionOnElement(el, step.position);
			}

			var handler = function() {
				tutorial.next();
			};
			el.addEventListener(action.type || 'click', handler, { once: true });
			tutorial._actionCleanup = function() {
				el.removeEventListener(action.type || 'click', handler);
			};
			return true;
		};

		if (!tryBind()) {
			tutorial._actionTimer = setInterval(function() {
				attempts++;
				if (tryBind()) {
					clearInterval(tutorial._actionTimer);
					tutorial._actionTimer = null;
					return;
				}
				if (attempts > 40) {
					clearInterval(tutorial._actionTimer);
					tutorial._actionTimer = null;
					tutorial._enableNextButton();
				}
			}, 250);
		}

		tutorial._actionPoll = setInterval(function() {
			var el = tutorial._resolveTarget(step);
			if (!el) return;
			tutorial._positionOnElement(el, step.position);
		}, 500);
	},

	_positionOnElement: function(el, position) {
		var rect = el.getBoundingClientRect();
		var padding = 8;

		// Show highlight
		tutorial._highlight.style.display = 'block';
		tutorial._highlight.style.left = (rect.left - padding) + 'px';
		tutorial._highlight.style.top = (rect.top - padding) + 'px';
		tutorial._highlight.style.width = (rect.width + padding * 2) + 'px';
		tutorial._highlight.style.height = (rect.height + padding * 2) + 'px';

		// Position dialog near the element, avoiding overlap
		var preferred = position || 'right';
		var positions = ['right', 'left', 'bottom', 'top'];
		positions = [preferred].concat(positions.filter(function(p) { return p !== preferred; }));
		for (var i = 0; i < positions.length; i++) {
			if (tutorial._placeDialog(el, rect, positions[i]) && !tutorial._dialogOverlaps(rect)) {
				break;
			}
		}

		// If the target is inside a menu, move dialog to a corner to avoid blocking controls
		if (el.closest && el.closest('.menu')) {
			tutorial._positionDialogCorner('bottom-right');
			return;
		}

		if (tutorial._dialogOverlaps(rect)) {
			tutorial._positionDialogCorner('bottom-right');
		}
	},

	_positionDialogCorner: function(corner) {
		var margin = 16;
		tutorial._dialog.style.position = 'fixed';
		tutorial._dialog.style.transform = 'none';
		tutorial._dialog.style.left = '';
		tutorial._dialog.style.top = '';
		tutorial._dialog.style.right = '';
		tutorial._dialog.style.bottom = '';

		switch (corner) {
			case 'top-left':
				tutorial._dialog.style.left = margin + 'px';
				tutorial._dialog.style.top = margin + 'px';
				break;
			case 'bottom-left':
				tutorial._dialog.style.left = margin + 'px';
				tutorial._dialog.style.bottom = margin + 'px';
				break;
			case 'bottom-right':
				tutorial._dialog.style.right = margin + 'px';
				tutorial._dialog.style.bottom = margin + 'px';
				break;
			case 'top-right':
			default:
				tutorial._dialog.style.right = margin + 'px';
				tutorial._dialog.style.top = margin + 'px';
				break;
		}
	},

	_placeDialog: function(el, rect, position) {
		// Position dialog near the element
		tutorial._dialog.style.position = 'fixed';
		tutorial._dialog.style.transform = 'none';

		var dialogWidth = 380;
		var dialogMargin = 16;

		// Reset
		tutorial._dialog.style.left = '';
		tutorial._dialog.style.top = '';
		tutorial._dialog.style.right = '';
		tutorial._dialog.style.bottom = '';
		tutorial._dialog.style.width = dialogWidth + 'px';
		tutorial._dialog.style.maxHeight = '';

		// Calculate position
		var winW = window.innerWidth;
		var winH = window.innerHeight;

		switch (position) {
			case 'right':
				tutorial._dialog.style.left = Math.min(rect.right + dialogMargin, winW - dialogWidth - dialogMargin) + 'px';
				tutorial._dialog.style.top = Math.max(dialogMargin, Math.min(rect.top - 20, winH - 300)) + 'px';
				return true;
			case 'left':
				tutorial._dialog.style.left = Math.max(dialogMargin, rect.left - dialogWidth - dialogMargin) + 'px';
				tutorial._dialog.style.top = Math.max(dialogMargin, Math.min(rect.top - 20, winH - 300)) + 'px';
				return true;
			case 'bottom':
				tutorial._dialog.style.left = Math.max(dialogMargin, Math.min(rect.left, winW - dialogWidth - dialogMargin)) + 'px';
				tutorial._dialog.style.top = Math.min(rect.bottom + dialogMargin, winH - 250) + 'px';
				return true;
			case 'top':
				tutorial._dialog.style.left = Math.max(dialogMargin, Math.min(rect.left, winW - dialogWidth - dialogMargin)) + 'px';
				tutorial._dialog.style.bottom = (winH - rect.top + dialogMargin) + 'px';
				return true;
			default:
				return false;
		}
	},

	_dialogOverlaps: function(targetRect) {
		if (!tutorial._dialog) return false;
		var dialogRect = tutorial._dialog.getBoundingClientRect();
		return !(dialogRect.right < targetRect.left || dialogRect.left > targetRect.right || dialogRect.bottom < targetRect.top || dialogRect.top > targetRect.bottom);
	},

	_positionCenter: function() {
		tutorial._highlight.style.display = 'none';
		tutorial._dialog.style.position = 'fixed';
		tutorial._dialog.style.left = '50%';
		tutorial._dialog.style.top = '50%';
		tutorial._dialog.style.transform = 'translate(-50%, -50%)';
		tutorial._dialog.style.width = '440px';
		tutorial._dialog.style.right = '';
		tutorial._dialog.style.bottom = '';
	},

	next: function() {
		if (tutorial._stepIndex < tutorial._steps.length - 1) {
			tutorial._stepIndex++;
			tutorial._showStep();
		}
	},

	prev: function() {
		if (tutorial._stepIndex > 0) {
			tutorial._stepIndex--;
			tutorial._showStep();
		}
	},

	_escapeHtml: function(text) {
		var div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	},

	_formatText: function(text) {
		// Escape HTML first, then convert newlines and bullet points
		var escaped = tutorial._escapeHtml(text);
		escaped = escaped.replace(/\n/g, '<br>');
		escaped = escaped.replace(/• /g, '<span class="tutorial-bullet">•</span> ');
		return escaped;
	},

	isCompleted: function() {
		return config.tutorialCompleted === true;
	},

	shouldShow: function() {
		return !tutorial.isCompleted() && tutorial.hasSample();
	},

	// Called from settings to restart the tutorial
	restart: function() {
		if (!tutorial.hasSample()) {
			tutorial._notifyMissingSample();
			return;
		}
		storage.updateVar('config', 'tutorialCompleted', false);
		config.tutorialCompleted = false;
		if (typeof dom !== 'undefined' && typeof dom.goStartPath === 'function') {
			dom.goStartPath();
		}
		setTimeout(function() {
			tutorial.start();
		}, 200);
	},
};

module.exports = tutorial;
