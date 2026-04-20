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
		return []
			.concat(tutorial._introSteps())
			.concat(tutorial._libraryToolSteps())
			.concat(tutorial._settingsMissionSteps())
			.concat(tutorial._sampleEntrySteps())
			.concat(tutorial._readingNavigationSteps())
			.concat(tutorial._readingLayoutSteps())
			.concat(tutorial._readingEnhancementSteps())
			.concat(tutorial._readingWrapUpSteps());
	},

	_introSteps: function() {
		return [
			{
				id: 'welcome',
				chapter: 'Home Base',
				title: 'Welcome to OpenComic!',
				text: 'This walkthrough is fully interactive. You will click real controls and see each feature in context.\n\nWe will finish in the Pepper & Carrot sample so every reading tool is explained on a real comic.',
				mission: 'Mission: Learn every major area of the app, then complete a full reading lab.',
				selector: null,
				position: 'center',
				icon: 'auto_stories',
			},
			{
				chapter: 'Home Base',
				title: 'How This Tour Works',
				text: '• Steps with a highlighted action auto-advance when you click the requested control.\n• Use Back anytime to review a step.\n• Skip Tour exits immediately and marks this tutorial as completed.',
				selector: null,
				position: 'center',
				icon: 'school',
			},
			{
				chapter: 'Home Base',
				title: 'Library',
				text: 'Your Library is the main hub. Added comics, manga, archives, PDFs, and ebooks appear here as cards or lists.',
				selector: '.content-left .menu-item-library',
				position: 'right',
				icon: 'book',
			},
			{
				chapter: 'Home Base',
				title: 'Recents',
				text: 'Recents tracks what you opened recently so you can resume in one click.',
				selector: '.content-left .menu-item-recently-opened',
				position: 'right',
				icon: 'history',
			},
			{
				chapter: 'Home Base',
				title: 'Favorites',
				text: 'Mark titles as favorites from the context menu. They show up here for fast access.',
				selector: '.content-left .menu-item-favorites',
				position: 'right',
				icon: 'favorite',
			},
			{
				chapter: 'Home Base',
				title: 'OPDS Catalogs',
				text: 'Browse online OPDS catalogs directly in OpenComic and download titles from remote libraries.',
				selector: '.content-left .menu-item-opds',
				position: 'right',
				icon: 'local_library',
			},
			{
				chapter: 'Home Base',
				title: 'Language And Theme',
				text: 'OpenComic supports many languages and configurable themes. You can switch both from the left menu.',
				selector: '.content-left .menu-item-language',
				position: 'right',
				icon: 'language',
			},
			{
				chapter: 'Home Base',
				title: 'Theme Controls',
				text: 'Use theme options to customize accent colors and light/dark appearance.',
				selector: '.content-left .menu-item-theme',
				position: 'right',
				icon: 'palette',
			},
			{
				chapter: 'Home Base',
				title: 'Settings Entry Point',
				text: 'Settings is where global behavior, navigation, image processing, shortcuts, and tap zones are configured.',
				selector: '.content-left .menu-item-settings',
				position: 'right',
				icon: 'settings',
			},
		];
	},

	_libraryToolSteps: function() {
		return [
			{
				chapter: 'Library Power Tools',
				title: 'Open Sort Menu',
				text: 'Click Sort to open library sorting controls.',
				mission: 'Mission: Practice sorting, viewing, filtering, searching, and labels.',
				selector: '.bar-right-buttons .button-sort',
				position: 'bottom',
				icon: 'sort',
				requireAction: true,
				actionHint: 'Click the highlighted Sort button.',
				advanceOn: { type: 'click', useTarget: true },
			},
			{
				chapter: 'Library Power Tools',
				title: 'Sort Options',
				text: 'Choose name, number, or hybrid name-number sorting. You can also invert order and prioritize folders/compressed files.',
				selector: '#index-sort .sort-name-numeric',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'sort_by_alpha',
				onShow: function() {
					tutorial._openMenu('#index-sort', '.bar-right-buttons .button-sort');
				},
			},
			{
				chapter: 'Library Power Tools',
				title: 'Open View Menu',
				text: 'Click View to switch between module and list layouts.',
				selector: '.bar-right-buttons .button-view',
				position: 'bottom',
				icon: 'view_module',
				requireAction: true,
				actionHint: 'Click the highlighted View button.',
				advanceOn: { type: 'click', useTarget: true },
			},
			{
				chapter: 'Library Power Tools',
				title: 'View Details',
				text: 'Inside View, switch module/list and adjust thumbnail card size. You can also toggle progress overlays and completion fade.',
				selector: '#index-view .view-module-size',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'tune',
				onShow: function() {
					tutorial._openMenu('#index-view', '.bar-right-buttons .button-view');
				},
			},
			{
				chapter: 'Library Power Tools',
				title: 'Reload Current Folder',
				text: 'Use Reload when files changed on disk and you want an immediate refresh.',
				selector: '.bar-right-buttons [onclick*="dom.reload"]',
				selectorFallback: '.bar-right-buttons div[onclick*="dom.reload"]',
				position: 'bottom',
				icon: 'refresh',
			},
			{
				chapter: 'Library Power Tools',
				title: 'Open Genre Filter',
				text: 'Click Genre Filter to focus the current page by metadata genres.',
				selector: '.bar-right-buttons .button-genre-filter',
				position: 'bottom',
				icon: 'filter_list',
				requireAction: true,
				actionHint: 'Click Genre Filter once to continue.',
				advanceOn: { type: 'click', useTarget: true },
			},
			{
				chapter: 'Library Power Tools',
				title: 'Open Search',
				text: 'Click Search to use quick lookup and advanced saved search workflows.',
				selector: '.bar-right-buttons .button-search',
				position: 'bottom',
				icon: 'search',
				requireAction: true,
				actionHint: 'Click the Search button to continue.',
				advanceOn: { type: 'click', useTarget: true },
			},
			{
				chapter: 'Library Power Tools',
				title: 'Open Labels',
				text: 'Click Labels to organize titles into custom groups such as To Read, Completed, or any workflow labels you prefer.',
				selector: '.bar-right-buttons .button-labels',
				position: 'bottom',
				icon: 'label',
				requireAction: true,
				actionHint: 'Click Labels once.',
				advanceOn: { type: 'click', useTarget: true },
			},
			{
				chapter: 'Library Power Tools',
				title: 'Pick At Random',
				text: 'Random instantly opens an unpredictable title from the current scope when you want discovery mode.',
				selector: '.bar-right-buttons .button-random',
				position: 'bottom',
				icon: 'shuffle',
			},
			{
				chapter: 'Library Power Tools',
				title: 'Add Files And Folders',
				text: 'Use the floating + button to import comics, manga archives, PDFs, EPUBs, and folders.',
				selector: '.floating-action-button-add',
				position: 'top',
				icon: 'add',
			},
			{
				chapter: 'Library Power Tools',
				title: 'Right-Click Context Menu',
				text: 'Right-click any title card for actions like mark read/unread, favorite, labels, poster tools, open location, cache cleanup, file info, and remove/delete options.',
				selector: null,
				position: 'center',
				icon: 'ads_click',
			},
		];
	},

	_settingsMissionSteps: function() {
		return [
			{
				chapter: 'Global Settings',
				title: 'Open Settings',
				text: 'Click Settings in the sidebar. We will walk both General and Shortcuts sections.',
				mission: 'Mission: Cover global app behavior, file/navigation options, and control customization.',
				selector: '.content-left .menu-item-settings',
				position: 'right',
				icon: 'settings',
				requireAction: true,
				actionHint: 'Click Settings to continue.',
				advanceOn: { type: 'click', useTarget: true },
			},
			{
				chapter: 'Global Settings',
				title: 'General Tab',
				text: 'The General tab groups tutorial reset, master folders, servers, reading defaults, navigation policies, startup behavior, and cache controls.',
				selector: '.settings-body .tabs [data-name="general"]',
				position: 'bottom',
				icon: 'tune',
				onShow: function() {
					tutorial._openSettingsTab('general');
				},
			},
			{
				chapter: 'Global Settings',
				title: 'Tutorial Restart Card',
				text: 'You can restart this full walkthrough any time from here.',
				selector: '.settings-body .tabs-general .menu-simple-text .simple-button[onclick*="tutorial.restart"]',
				position: 'left',
				icon: 'school',
				onShow: function() {
					tutorial._openSettingsTab('general');
				},
			},
			{
				chapter: 'Global Settings',
				title: 'Master Folders',
				text: 'Add top-level library roots from this button. OpenComic scans and organizes content from these roots.',
				selector: '.settings-body .settings-master-folders .simple-button[onclick*="settings.addMasterFolder"]',
				position: 'left',
				icon: 'folder_special',
				onShow: function() {
					tutorial._openSettingsTab('general');
				},
			},
			{
				chapter: 'Global Settings',
				title: 'Remote Servers',
				text: 'Add SMB, FTP, SFTP, SSH, S3, and WebDAV server connections here.',
				selector: '.settings-body .settings-servers .simple-button[onclick*="settings.addServer"]',
				position: 'left',
				icon: 'dns',
				onShow: function() {
					tutorial._openSettingsTab('general');
				},
			},
			{
				chapter: 'Global Settings',
				title: 'Image Interpolation',
				text: 'Choose different interpolation methods for downscaling and upscaling quality.',
				selector: '.settings-body .settings-image-interpolation-method-downscaling',
				position: 'left',
				icon: 'image',
				onShow: function() {
					tutorial._openSettingsTab('general');
				},
			},
			{
				chapter: 'Global Settings',
				title: 'Color Profile',
				text: 'Force a display color profile if your workflow needs consistent rendering.',
				selector: '.settings-body .settings-color-profile',
				position: 'left',
				icon: 'palette',
				onShow: function() {
					tutorial._openSettingsTab('general');
				},
			},
			{
				chapter: 'Global Settings',
				title: 'Folder Opening Behavior',
				text: 'Control how folder clicks behave and whether first images are used as posters.',
				selector: '.settings-body .settings-opening-behavior-folder',
				position: 'left',
				icon: 'folder_open',
				onShow: function() {
					tutorial._openSettingsTab('general');
				},
			},
			{
				chapter: 'Global Settings',
				title: 'File Opening Behavior',
				text: 'Choose what happens when opening files, including tab/window behavior and app startup continuation options.',
				selector: '.settings-body .settings-opening-behavior-file',
				position: 'left',
				icon: 'description',
				onShow: function() {
					tutorial._openSettingsTab('general');
				},
			},
			{
				chapter: 'Global Settings',
				title: 'Open Shortcuts Tab',
				text: 'Click Shortcuts. This area configures keyboard/gamepad mappings and tap zones.',
				selector: '.settings-body .tabs [data-name="shortcuts"]',
				position: 'bottom',
				icon: 'keyboard',
				requireAction: true,
				actionHint: 'Click the Shortcuts tab.',
				advanceOn: { type: 'click', useTarget: true },
				onShow: function() {
					tutorial._openSettingsTab('general');
				},
			},
			{
				chapter: 'Global Settings',
				title: 'Keyboard And Gamepad Map',
				text: 'Edit per-action keyboard/gamepad bindings directly in this table.',
				selector: '.settings-body .settings-shortcuts-table',
				position: 'top',
				icon: 'sports_esports',
				onShow: function() {
					tutorial._openSettingsTab('shortcuts');
				},
			},
			{
				chapter: 'Global Settings',
				title: 'Tap Zones',
				text: 'Tap zones let touch readers map screen regions to actions (next/prev/menu/etc.).',
				selector: '.settings-body .settings-tap-zones-table',
				position: 'top',
				icon: 'touch_app',
				onShow: function() {
					tutorial._openSettingsTab('shortcuts');
				},
			},
			{
				chapter: 'Global Settings',
				title: 'Restore Defaults',
				text: 'Restore defaults quickly for shortcuts or tap zones if you want to reset your controls.',
				selector: '.settings-body .settings-shortcuts-table .simple-button[onclick*="settings.restoreShortcuts"]',
				position: 'left',
				icon: 'undo',
				onShow: function() {
					tutorial._openSettingsTab('shortcuts');
				},
			},
			{
				chapter: 'Global Settings',
				title: 'Return To Library',
				text: 'Click Library in the sidebar so we can open Pepper & Carrot for the reading lab.',
				selector: '.content-left .menu-item-library',
				position: 'right',
				icon: 'book',
				requireAction: true,
				actionHint: 'Click Library to continue.',
				advanceOn: { type: 'click', useTarget: true },
			},
		];
	},

	_sampleEntrySteps: function() {
		return [
			{
				id: 'open-sample',
				chapter: 'Open Pepper & Carrot',
				title: 'Open The Sample Collection',
				text: 'Click Pepper & Carrot to enter the sample library.',
				mission: 'Mission: Use this sample to practice all reading features in a safe sandbox.',
				getTarget: function() {
					return tutorial._findLibraryItemByName('Pepper & Carrot', true, 'Pepper & Carrot');
				},
				position: 'right',
				icon: 'menu_book',
				requireAction: true,
				actionHint: 'Click Pepper & Carrot.',
				advanceOn: { type: 'click', useTarget: true },
			},
			{
				id: 'open-episode-1',
				chapter: 'Open Pepper & Carrot',
				title: 'Open Episode 1',
				text: 'Click Episode 1, Potion of Flight to start reading.',
				getTarget: function() {
					return tutorial._findLibraryItemByName('Episode 1, Potion of Flight', true, 'Episode 1, Potion of Flight');
				},
				position: 'right',
				icon: 'auto_stories',
				requireAction: true,
				actionHint: 'Open Episode 1 to begin the reading walkthrough.',
				advanceOn: { type: 'click', useTarget: true },
			},
			{
				id: 'reading-lab-start',
				chapter: 'Open Pepper & Carrot',
				title: 'Reading Lab Starting',
				text: 'From here on, we will cover navigation, layouts, filters, AI, zoom tools, tracking, bookmarks, and advanced reading options.',
				selector: null,
				position: 'center',
				icon: 'play_circle',
				requiresSampleReading: true,
			},
			{
				id: 'reveal-top-bar',
				chapter: 'Open Pepper & Carrot',
				title: 'Reveal The Top Bar',
				text: 'When the chapter opens, the top bar may be hidden. Click the highlighted center square once to reveal it.\n\nIf the top bar is already visible, click Next.',
				selector: '.reading-header-toggle-zone',
				position: 'top',
				icon: 'touch_app',
				requireAction: false,
				actionHint: 'Click the highlighted center square to show the top bar.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
		];
	},

	_readingNavigationSteps: function() {
		return [
			{
				id: 'reading-next',
				chapter: 'Reading Navigation',
				title: 'Next Page',
				text: 'Click Next to move forward in the chapter.',
				mission: 'Mission: Learn all reading header controls before deep layout customization.',
				selector: '.reading-header .button-next',
				position: 'bottom',
				icon: 'navigate_next',
				requireAction: true,
				actionHint: 'Click Next.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Navigation',
				title: 'Previous Page',
				text: 'Click Previous to go back one page.',
				selector: '.reading-header .button-prev',
				position: 'bottom',
				icon: 'navigate_before',
				requireAction: true,
				actionHint: 'Click Previous.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Navigation',
				title: 'Jump To Last Page',
				text: 'Use Last Page for instant jumps to chapter end.',
				selector: '.reading-header .button-last-page',
				position: 'bottom',
				icon: 'last_page',
				requireAction: true,
				actionHint: 'Click Last Page once.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Navigation',
				title: 'Jump To First Page',
				text: 'Use First Page to quickly reset to chapter start.',
				selector: '.reading-header .button-first-page',
				position: 'bottom',
				icon: 'first_page',
				requireAction: true,
				actionHint: 'Click First Page once.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Navigation',
				title: 'Sidebar Toggle',
				text: 'Toggle the left panel visibility while reading.',
				selector: '.reading-header .button-sidebar-toggle',
				position: 'bottom',
				icon: 'menu',
				requireAction: true,
				actionHint: 'Click Sidebar Toggle.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Navigation',
				title: 'Open Reading Sort',
				text: 'Open the reading sort menu for in-chapter item ordering controls.',
				selector: '.reading-header .button-sort',
				position: 'bottom',
				icon: 'sort',
				requireAction: true,
				actionHint: 'Click Reading Sort.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Navigation',
				title: 'Reading Sort Options',
				text: 'Switch sort mode or invert order for chapter entries from this menu.',
				selector: '#reading-sort .sort-name',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'swap_vert',
				onShow: function() {
					tutorial._openMenu('#reading-sort', '.reading-header .button-sort');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Navigation',
				title: 'Open Page Layout',
				text: 'Click Page Layout. Next chapter covers every reading layout control in detail.',
				selector: '.reading-header .button-page-layout',
				position: 'bottom',
				dialogCorner: 'bottom-right',
				icon: 'auto_stories',
				requireAction: true,
				actionHint: 'Click Page Layout.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Navigation',
				title: 'Night Mode Toggle',
				text: 'Switch between light/dark app themes without leaving the reader.',
				selector: '.reading-header .button-night-mode',
				position: 'bottom',
				icon: 'dark_mode',
				requireAction: true,
				actionHint: 'Click Night Mode once.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
		];
	},

	_readingLayoutSteps: function() {
		return [
			{
				chapter: 'Reading Layout Lab',
				title: 'Open Page Layout Tab',
				text: 'Click the Page Layout tab to configure page flow and display mechanics.',
				mission: 'Mission: Cover slide/scroll modes, double-page variants, webtoon behavior, margins, rotation, and ebook formatting.',
				selector: '#reading-pages .tabs [data-name="page-layout"]',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'tab',
				requireAction: true,
				actionHint: 'Click the Page Layout tab.',
				advanceOn: { type: 'click', useTarget: true },
				onShow: function() {
					tutorial._openReadingPagesTab('page-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Scroll Mode',
				text: 'Switch to Scroll mode for continuous vertical reading.',
				selector: '#reading-pages .tabs-page-layout .reading-view-scroll',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'unfold_more',
				requireAction: true,
				actionHint: 'Click Scroll mode.',
				advanceOn: { type: 'click', useTarget: true },
				onShow: function() {
					tutorial._openReadingPagesTab('page-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Slide Mode',
				text: 'Switch back to Slide mode for classic page-by-page transitions.',
				selector: '#reading-pages .tabs-page-layout .reading-view-slide',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'transition_slide',
				requireAction: true,
				actionHint: 'Click Slide mode.',
				advanceOn: { type: 'click', useTarget: true },
				onShow: function() {
					tutorial._openReadingPagesTab('page-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Double Page',
				text: 'Enable side-by-side double-page rendering for spreads.',
				selector: '#reading-pages .tabs-page-layout .reading-double-page',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'auto_stories',
				requireAction: true,
				actionHint: 'Toggle Double Page.',
				advanceOn: { type: 'click', useTarget: true },
				onShow: function() {
					tutorial._openReadingPagesTab('page-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Double Page Shadow',
				text: 'Configure page-separation shadow and visual depth for two-page spreads.',
				selector: '#reading-pages .tabs-page-layout .reading-double-page-shadow',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'filter_none',
				onShow: function() {
					tutorial._openReadingPagesTab('page-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Horizontal Exceptions',
				text: 'Use horizontal-page exceptions and alignment options to handle panorama pages correctly.',
				selector: '#reading-pages .tabs-page-layout .reading-do-not-apply-to-horizontals',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'panorama_wide_angle',
				onShow: function() {
					tutorial._openReadingPagesTab('page-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Align Next Horizontal',
				text: 'Fine-tune alignment when a horizontal page needs pairing logic.',
				selector: '#reading-pages .tabs-page-layout .reading-align-with-next-horizontal',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'align_horizontal_left',
				onShow: function() {
					tutorial._openReadingPagesTab('page-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Blank Page Insertion',
				text: 'Insert blank pages to preserve intended left/right spread pacing.',
				selector: '#reading-pages .tabs-page-layout .reading-blank-page',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'crop_portrait',
				onShow: function() {
					tutorial._openReadingPagesTab('page-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Manga Direction And Webtoon Mode',
				text: 'Reading direction and webtoon mode are separate toggles so you can adapt to manga and long-scroll comics.',
				selector: '#reading-pages .tabs-page-layout .reading-reading-manga',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'menu_book',
				onShow: function() {
					tutorial._openReadingPagesTab('page-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Webtoon Toggle',
				text: 'Webtoon mode enables long vertical behavior and disables incompatible spread controls.',
				selector: '#reading-pages .tabs-page-layout .reading-reading-webtoon',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'vertical_split',
				onShow: function() {
					tutorial._openReadingPagesTab('page-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Fit Controls',
				text: 'Adjust-to-width, force-single-page, and not-enlarge-more-than-original-size help keep image readability predictable.',
				selector: '#reading-pages .tabs-page-layout .reading-ajust-to-width',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'fit_screen',
				onShow: function() {
					tutorial._openReadingPagesTab('page-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Rotation',
				text: 'Rotate standard pages or horizontals separately for scans that need correction.',
				selector: '#reading-pages .tabs-page-layout .reading-rotate .reading-rotate-right',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'screen_rotation',
				onShow: function() {
					tutorial._openReadingPagesTab('page-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Margins, Clips, Delays, And Speed',
				text: 'The page-layout panel also contains margin sliders, clipping controls, page-skip delay, and transition speed tuning.',
				selector: '#reading-pages .tabs-page-layout',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'speed',
				onShow: function() {
					tutorial._openReadingPagesTab('page-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Open Ebook Layout Tab',
				text: 'Click Ebook Layout tab. These controls apply when reading EPUB or text-heavy content.',
				selector: '#reading-pages .tabs [data-name="ebook-layout"]',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'format_size',
				requireAction: true,
				actionHint: 'Click Ebook Layout tab.',
				advanceOn: { type: 'click', useTarget: true },
				onShow: function() {
					tutorial._openReadingPagesTab('ebook-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Ebook Theme And Font Family',
				text: 'Select ebook themes and font families for readability and style preferences.',
				selector: '#reading-pages .tabs-ebook-layout .reading-ebook-theme',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'font_download',
				onShow: function() {
					tutorial._openReadingPagesTab('ebook-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Ebook Typography',
				text: 'Text alignment, bold/italic toggles, and font sizing controls are all available in this tab.',
				selector: '#reading-pages .tabs-ebook-layout .reading-text-align',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'format_align_left',
				onShow: function() {
					tutorial._openReadingPagesTab('ebook-layout');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Reading Layout Lab',
				title: 'Ebook Spacing And Width',
				text: 'Advanced sliders tune line-height, paragraph spacing, margins, and max text width for long-form reading comfort.',
				selector: '#reading-pages .tabs-ebook-layout .simple-slider',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'space_bar',
				onShow: function() {
					tutorial._openReadingPagesTab('ebook-layout');
				},
				requiresSampleReading: true,
			},
		];
	},

	_readingEnhancementSteps: function() {
		return [
			{
				chapter: 'Filters, AI, And Zoom',
				title: 'Open Color Filters',
				text: 'Click Filters to access image color and tone correction tools.',
				mission: 'Mission: Cover brightness/contrast filters, AI enhancement, magnifier controls, and zoom helpers.',
				selector: '.reading-header .button-filters',
				position: 'bottom',
				dialogCorner: 'bottom-right',
				icon: 'invert_colors',
				requireAction: true,
				actionHint: 'Click Filters.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				chapter: 'Filters, AI, And Zoom',
				title: 'Filters Tab',
				text: 'Click the Filters tab to tune brightness, saturation, contrast, sepia, hue, invert, and negative.',
				selector: '#reading-pages .tabs [data-name="filters"]',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'tune',
				requireAction: true,
				actionHint: 'Click Filters tab in the reading menu.',
				advanceOn: { type: 'click', useTarget: true },
				onShow: function() {
					tutorial._openReadingPagesTab('filters');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Filters, AI, And Zoom',
				title: 'Tone Sliders',
				text: 'Use these sliders to correct washed-out scans or dark pages instantly.',
				selector: '#reading-pages .tabs-filters .simple-slider',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'contrast',
				onShow: function() {
					tutorial._openReadingPagesTab('filters');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Filters, AI, And Zoom',
				title: 'Invert And Negative',
				text: 'Invert and Negative give instant dark-paper/light-ink alternatives for comfort reading.',
				selector: '#reading-pages .tabs-filters .reading-invert',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'invert_colors_off',
				onShow: function() {
					tutorial._openReadingPagesTab('filters');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Filters, AI, And Zoom',
				title: 'Colorize Pipeline',
				text: 'Colorize can remap tones using custom color stacks, presets, and add/from-image/save preset workflows.',
				selector: '#reading-pages .tabs-filters .reading-colorize',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'colorize',
				onShow: function() {
					tutorial._openReadingPagesTab('filters');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Filters, AI, And Zoom',
				title: 'Open AI Tools',
				text: 'Click AI to access artifact removal, descreen, and upscale pipelines.',
				selector: '.reading-header .button-ai',
				position: 'bottom',
				dialogCorner: 'bottom-right',
				icon: 'auto_awesome',
				requireAction: true,
				actionHint: 'Click AI tools.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				chapter: 'Filters, AI, And Zoom',
				title: 'AI Tab',
				text: 'Click AI tab to configure each AI enhancement module.',
				selector: '#reading-pages .tabs [data-name="ai"]',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'psychology',
				requireAction: true,
				actionHint: 'Click AI tab.',
				advanceOn: { type: 'click', useTarget: true },
				onShow: function() {
					tutorial._openReadingPagesTab('ai');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Filters, AI, And Zoom',
				title: 'Artifact Removal',
				text: 'Artifact removal cleans compression artifacts before display.',
				selector: '#reading-pages .tabs-ai .reading-ai-artifact-removal-active',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'cleaning_services',
				onShow: function() {
					tutorial._openReadingPagesTab('ai');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Filters, AI, And Zoom',
				title: 'Descreen',
				text: 'Descreen reduces moire patterns from scanned print sources.',
				selector: '#reading-pages .tabs-ai .reading-ai-descreen-active',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'texture',
				onShow: function() {
					tutorial._openReadingPagesTab('ai');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Filters, AI, And Zoom',
				title: 'Upscale',
				text: 'Upscale improves resolution and lets you tune megapixels, autoscale, manual scale, and noise reduction.',
				selector: '#reading-pages .tabs-ai .reading-ai-upscale-active',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'high_quality',
				onShow: function() {
					tutorial._openReadingPagesTab('ai');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Filters, AI, And Zoom',
				title: 'Open Magnifying Glass',
				text: 'Click Magnifying Glass for localized zoom and lens tuning.',
				selector: '.reading-header .button-magnifying-glass',
				position: 'bottom',
				dialogCorner: 'bottom-right',
				icon: 'search',
				requireAction: true,
				actionHint: 'Click Magnifying Glass.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				chapter: 'Filters, AI, And Zoom',
				title: 'Magnifier Activation',
				text: 'Enable/disable magnifier quickly from this switch.',
				selector: '#reading-magnifying-glass .menu-simple-text .switch',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'visibility',
				onShow: function() {
					tutorial._openMenu('#reading-magnifying-glass', '.reading-header .button-magnifying-glass');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Filters, AI, And Zoom',
				title: 'Lens Controls',
				text: 'Tune lens zoom, size, ratio, and radius for detailed panel inspection.',
				selector: '#reading-magnifying-glass .simple-slider',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'zoom_in',
				onShow: function() {
					tutorial._openMenu('#reading-magnifying-glass', '.reading-header .button-magnifying-glass');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Filters, AI, And Zoom',
				title: 'Header Zoom Buttons',
				text: 'Use zoom in/out and reset zoom from the header for immediate scaling control.',
				selector: '.reading-header .button-reset-zoom',
				position: 'bottom',
				icon: 'aspect_ratio',
				requiresSampleReading: true,
			},
		];
	},

	_readingWrapUpSteps: function() {
		return [
			{
				chapter: 'Bookmarks, Tracking, And Finish',
				title: 'Bookmark Current Page',
				text: 'Click Bookmark to save your current reading position as a named marker.',
				mission: 'Mission: Finish utility workflows and return to library with complete feature coverage.',
				selector: '.reading-header .button-bookmark',
				position: 'bottom',
				icon: 'bookmark_border',
				requireAction: true,
				actionHint: 'Click Bookmark.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				chapter: 'Bookmarks, Tracking, And Finish',
				title: 'Open Bookmark Collection',
				text: 'Click Bookmark Collection to browse and jump to saved marks.',
				selector: '.reading-header .button-collections-bookmark',
				position: 'bottom',
				dialogCorner: 'bottom-right',
				icon: 'collections_bookmark',
				requireAction: true,
				actionHint: 'Click Bookmark Collection.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				chapter: 'Bookmarks, Tracking, And Finish',
				title: 'Bookmark Menu Features',
				text: 'Bookmark menus support navigation across saved points and batch bookmark image operations.',
				selector: '#collections-bookmark .menu-simple',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'bookmark',
				onShow: function() {
					tutorial._openMenu('#collections-bookmark', '.reading-header .button-collections-bookmark');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Bookmarks, Tracking, And Finish',
				title: 'Open Tracking',
				text: 'Click Tracking to connect or update progress with tracking services such as AniList/MyAnimeList integrations.',
				selector: '.reading-header .button-tracking-sites',
				position: 'bottom',
				dialogCorner: 'bottom-right',
				icon: 'sync',
				requireAction: true,
				actionHint: 'Click Tracking.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				chapter: 'Bookmarks, Tracking, And Finish',
				title: 'Tracking Menu',
				text: 'Tracking menu content adapts to your connected services and lets you sync reading progress.',
				selector: '#tracking-sites .menu-simple',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'link',
				onShow: function() {
					tutorial._openMenu('#tracking-sites', '.reading-header .button-tracking-sites');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Bookmarks, Tracking, And Finish',
				title: 'Open More Options',
				text: 'Click More Options for UI visibility toggles, page number visibility, fullscreen toggle, and quick app close action.',
				selector: '.reading-header .button-more-options',
				position: 'bottom',
				dialogCorner: 'bottom-right',
				icon: 'more_vert',
				requireAction: true,
				actionHint: 'Click More Options.',
				advanceOn: { type: 'click', useTarget: true },
				requiresSampleReading: true,
			},
			{
				chapter: 'Bookmarks, Tracking, And Finish',
				title: 'More Options Toggles',
				text: 'Hide header/sidebar, show page numbers, and toggle fullscreen from this panel.',
				selector: '#reading-more-options .menu-simple-text .switch',
				position: 'left',
				dialogCorner: 'bottom-right',
				icon: 'tune',
				onShow: function() {
					tutorial._openMenu('#reading-more-options', '.reading-header .button-more-options');
				},
				requiresSampleReading: true,
			},
			{
				chapter: 'Bookmarks, Tracking, And Finish',
				title: 'Reading Music (If Available)',
				text: 'If music packs are available, this button opens soundtrack controls for reading sessions.',
				getTarget: function() {
					return document.querySelector('.reading-header .button-reading-music') || null;
				},
				position: 'bottom',
				icon: 'queue_music',
				requiresSampleReading: true,
			},
			{
				chapter: 'Bookmarks, Tracking, And Finish',
				title: 'Reading Context Menu',
				text: 'Right-click while reading for context actions: set poster, save/copy image, export bookmark images, open file location, and file info.',
				selector: null,
				position: 'center',
				icon: 'mouse',
				requiresSampleReading: true,
			},
			{
				id: 'back-to-library',
				chapter: 'Bookmarks, Tracking, And Finish',
				title: 'Back To Library',
				text: 'Click Library in the breadcrumb (or back arrow) to return to your library home.',
				getTarget: function() {
					return tutorial._findHeaderBreadcrumb('Library')
						|| document.querySelector('.reading-header .bar-title .bar-title-a')
						|| document.querySelector('.reading-header .bar-back');
				},
				position: 'right',
				icon: 'arrow_back',
				requireAction: true,
				actionHint: 'Click Library breadcrumb or back arrow.',
				advanceOn: { type: 'click', useTarget: true, selector: '.reading-header .bar-title .bar-title-a, .reading-header .bar-back' },
				requiresSampleReading: true,
			},
			{
				chapter: 'Bookmarks, Tracking, And Finish',
				title: 'You Finished The Full Interactive Tour',
				text: 'You just walked through every major OpenComic feature surface: library tools, settings, shortcuts/tap zones, and complete reading workflows (layout, filters, AI, magnifier, bookmarks, tracking, and utility menus).\n\nYou can restart this tour anytime from Settings.',
				selector: null,
				position: 'center',
				icon: 'celebration',
			},
		];
	},

	_tryClick: function(selector) {
		var el = document.querySelector(selector);
		if (!el || typeof el.click !== 'function') return false;
		el.click();
		return true;
	},

	_openMenu: function(menuSelector, buttonSelector) {
		var menuSimple = document.querySelector(menuSelector + ' .menu-simple');
		var isOpen = !!(menuSimple && menuSimple.classList.contains('a'));
		if (!isOpen && buttonSelector) tutorial._tryClick(buttonSelector);
	},

	_openSettingsTab: function(tabName) {
		if (!document.querySelector('.settings-body')) {
			tutorial._tryClick('.content-left .menu-item-settings');
		}

		var tab = document.querySelector('.settings-body .tabs [data-name="' + tabName + '"]');
		if (tab && !tab.classList.contains('active')) {
			tab.click();
		}
	},

	_openReadingPagesTab: function(tabName) {
		var buttonMap = {
			'page-layout': '.reading-header .button-page-layout',
			'ebook-layout': '.reading-header .button-ebook-layout',
			'filters': '.reading-header .button-filters',
			'ai': '.reading-header .button-ai',
		};

		tutorial._openMenu('#reading-pages', buttonMap[tabName] || '.reading-header .button-page-layout');

		var tab = document.querySelector('#reading-pages .tabs [data-name="' + tabName + '"]');
		if (tab && !tab.classList.contains('active')) {
			tab.click();
		}
	},

	_getChapterMeta: function(stepIndex) {
		var chapters = [];
		var chapterIndex = {};

		for (var i = 0; i < tutorial._steps.length; i++) {
			var chapter = tutorial._steps[i].chapter;
			if (!chapter || chapterIndex[chapter]) continue;
			chapterIndex[chapter] = chapters.length + 1;
			chapters.push(chapter);
		}

		var currentStep = tutorial._steps[stepIndex] || {};
		var currentChapter = currentStep.chapter || '';

		return {
			title: currentChapter,
			number: chapterIndex[currentChapter] || 1,
			total: chapters.length || 1,
		};
	},

	hasSample: function() {
		try {
			if (typeof fs === 'undefined' || typeof p === 'undefined')
				return false;

			let sampleExists = false;
			let sampleDeleted = false;

			if (typeof storage !== 'undefined' && typeof storage.get === 'function') {
				const config = storage.get('config') || {};
				sampleDeleted = config.pepperCarrotDeleted === true;

				const comics = storage.get('comics') || [];

				for (let i = 0, len = comics.length; i < len; i++) {
					const comic = comics[i];
					if (!comic)
						continue;

					const isSample = (typeof storage.isPepperCarrotPath === 'function' && storage.isPepperCarrotPath(comic.path)) || comic.name === 'Pepper & Carrot';
					if (!isSample)
						continue;

					let samplePath = comic.path || '';
					if (typeof relative !== 'undefined' && typeof relative.resolve === 'function')
						samplePath = relative.resolve(samplePath);

					if (samplePath && fs.existsSync(samplePath)) {
						sampleExists = true;
						break;
					}
				}
			}

			if (sampleDeleted && !sampleExists)
				return false;

			if (!sampleExists && typeof appDir !== 'undefined') {
				let fallbackPath = p.join(appDir, 'Pepper & Carrot');
				if (typeof asarToAsarUnpacked === 'function')
					fallbackPath = asarToAsarUnpacked(fallbackPath);

				sampleExists = fs.existsSync(fallbackPath);
			}

			if (sampleExists && typeof storage !== 'undefined' && typeof storage.ensurePepperCarrotInComics === 'function')
				storage.ensurePepperCarrotInComics(false, true);

			return sampleExists;
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
				// Click on backdrop does nothing - must use buttons
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

		try {

		if (step.id === 'open-sample') {
			if (tutorial._isReadingSample()) {
				var readingIndex = tutorial._findStepIndexById('reading-lab-start');
				if (readingIndex === -1)
					readingIndex = tutorial._findStepIndexById('reveal-top-bar');
				if (readingIndex === -1)
					readingIndex = tutorial._findStepIndexById('reading-next');
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
			var nextIndex = tutorial._findStepIndexById('reading-lab-start');
			if (nextIndex === -1)
				nextIndex = tutorial._findStepIndexById('reveal-top-bar');
			if (nextIndex === -1)
				nextIndex = tutorial._findStepIndexById('reading-next');
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

		if (typeof step.onShow === 'function') {
			try {
				step.onShow();
			}
			catch (error) {
				// Ignore non-critical tutorial prep errors
			}
		}

		var targetEl = tutorial._resolveTarget(step);

		// Build dialog content
		var totalSteps = tutorial._steps.length;
		var currentStep = tutorial._stepIndex + 1;
		var chapterMeta = tutorial._getChapterMeta(tutorial._stepIndex);

		var html = '';
		if (step.chapter) {
			html += '<div class="tutorial-dialog-kicker label-small">Chapter ' + chapterMeta.number + ' of ' + chapterMeta.total + ' - ' + tutorial._escapeHtml(step.chapter) + '</div>';
		}
		html += '<div class="tutorial-dialog-header">';
		html += '<i class="material-icon tutorial-dialog-icon">' + (step.icon || 'info') + '</i>';
		html += '<span class="tutorial-dialog-title title-medium">' + tutorial._escapeHtml(step.title) + '</span>';
		html += '</div>';
		if (step.mission) {
			html += '<div class="tutorial-dialog-mission body-small">' + tutorial._formatText(step.mission) + '</div>';
		}
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
			var hint = step.actionHint || 'Complete the highlighted action to continue automatically.';
			html += '<div class="tutorial-dialog-hint body-small">' + tutorial._escapeHtml(hint) + '</div>';
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

		if (!targetEl && (step.selector || step.getTarget) && !step.requireAction && !step.advanceOn) {
			var retries = 0;
			tutorial._actionPoll = setInterval(function() {
				retries++;
				var lateTarget = tutorial._resolveTarget(step);
				if (lateTarget) {
					tutorial._positionOnElement(lateTarget, step.position);
					if (step.dialogCorner) tutorial._positionDialogCorner(step.dialogCorner);
					clearInterval(tutorial._actionPoll);
					tutorial._actionPoll = null;
					return;
				}

				if (retries > 40) {
					clearInterval(tutorial._actionPoll);
					tutorial._actionPoll = null;
				}
			}, 250);
		}

		tutorial._bindStepAction(step, targetEl);
		}
		catch (error) {
			if (typeof console !== 'undefined' && typeof console.error === 'function')
				console.error('Tutorial step render failed', step && step.id ? step.id : 'unknown-step', error);

			tutorial._cleanup();

			if (typeof events !== 'undefined' && typeof events.snackbar === 'function') {
				events.snackbar({
					key: 'tutorialRenderError',
					text: 'Tutorial had a display issue and was closed. Start it again from Settings.',
					duration: 8,
					update: true,
				});
			}
		}
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
		var isReading = false;

		if (typeof reading !== 'undefined' && reading && typeof reading.onReading === 'function')
			isReading = !!reading.onReading();
		else if (typeof onReading !== 'undefined')
			isReading = !!onReading;

		if (!isReading && !document.querySelector('.reading-body, .reading-header, .reading-lens'))
			return false;

		var candidates = [];

		if (typeof reading !== 'undefined' && reading) {
			if (typeof reading.readingCurrentPath === 'function') {
				var currentPath = reading.readingCurrentPath();
				if (currentPath && typeof currentPath === 'string')
					candidates.push(currentPath);
			}

			if (typeof reading.readingFile === 'function') {
				var currentFile = reading.readingFile();
				if (currentFile && typeof currentFile === 'string')
					candidates.push(currentFile);
			}
		}

		if (typeof dom !== 'undefined' && dom.history && typeof dom.history.path === 'string')
			candidates.push(dom.history.path);

		var crumbs = document.querySelectorAll('.reading-header .bar-title .bar-title-a');
		for (var i = 0; i < crumbs.length; i++) {
			var crumbText = (crumbs[i].textContent || '').trim();
			if (crumbText)
				candidates.push(crumbText);
		}

		if (!candidates.length)
			return isReading;

		var samplePattern = /pepper\s*&\s*carrot|episode\s*1,\s*potion\s*of\s*flight/i;

		for (var j = 0; j < candidates.length; j++) {
			if (samplePattern.test(String(candidates[j] || '')))
				return true;
		}

		return false;
	},

	_isInSampleLibrary: function() {
		if (typeof dom === 'undefined' || !dom.history || !dom.history.path) return false;
		return /Pepper\s*&\s*Carrot/i.test(dom.history.path);
	},

	_isReadingHeaderVisible: function() {
		var nextButton = document.querySelector('.reading-header .button-next');
		if (!nextButton)
			return false;

		var rect = nextButton.getBoundingClientRect();
		if (rect.width < 2 || rect.height < 2)
			return false;

		var style = window.getComputedStyle(nextButton);
		return !!style && style.display !== 'none' && style.visibility !== 'hidden';
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
		if (targetEl && typeof targetEl.scrollIntoView === 'function') {
			targetEl.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
		}
		if (targetEl) {
			var rect = targetEl.getBoundingClientRect();
			if (rect.width < 2 || rect.height < 2)
				targetEl = null;
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
			if (step.id === 'open-sample' && tutorial._isInSampleLibrary()) {
				tutorial.next();
				return;
			}

			if (step.id === 'open-episode-1' && tutorial._isReadingSample()) {
				tutorial.next();
				return;
			}

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
		var dialogHeight = tutorial._dialog.getBoundingClientRect().height || 280;
		dialogHeight = Math.min(dialogHeight, Math.max(200, winH - dialogMargin * 2));
		var maxTop = Math.max(dialogMargin, winH - dialogHeight - dialogMargin);

		switch (position) {
			case 'right':
				tutorial._dialog.style.left = Math.min(rect.right + dialogMargin, winW - dialogWidth - dialogMargin) + 'px';
				tutorial._dialog.style.top = Math.max(dialogMargin, Math.min(rect.top - 20, maxTop)) + 'px';
				return true;
			case 'left':
				tutorial._dialog.style.left = Math.max(dialogMargin, rect.left - dialogWidth - dialogMargin) + 'px';
				tutorial._dialog.style.top = Math.max(dialogMargin, Math.min(rect.top - 20, maxTop)) + 'px';
				return true;
			case 'bottom':
				tutorial._dialog.style.left = Math.max(dialogMargin, Math.min(rect.left, winW - dialogWidth - dialogMargin)) + 'px';
				tutorial._dialog.style.top = Math.max(dialogMargin, Math.min(rect.bottom + dialogMargin, maxTop)) + 'px';
				return true;
			case 'top':
				tutorial._dialog.style.left = Math.max(dialogMargin, Math.min(rect.left, winW - dialogWidth - dialogMargin)) + 'px';
				tutorial._dialog.style.top = Math.max(dialogMargin, Math.min(rect.top - dialogHeight - dialogMargin, maxTop)) + 'px';
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
