requirejs.config({
	baseUrl: '/static/js',
	waitSeconds: 30,
	urlArgs: function (id, url) {
		var args = 'cachebuster=' + (window.last_deployment || 20190301);

		if (url.indexOf('nls/') != -1 && window.translations_hash) {
			args = 'translationbuster=' + window.translations_hash;
		}
		// console.log(url+'   '+args)
		return (url.indexOf('?') === -1 ? '?' : '&') + args;
	},
	paths: {
		app: 'app',
		text: 'text',
		router: 'router',
		portal: 'libs/portal/portal',
		tourobjects: 'libs/portal/tourobjects',
		personalization: 'libs/portal/personalization',
		inspectlet: 'libs/portal/inspectlet',
		S3Upload: 'libs/portal/s3upload',
		codemirror: 'libs/codemirror/lib/codemirror',
		javascript: 'libs/codemirror/mode/javascript/javascript',
		python: 'libs/codemirror/mode/python/python',
		jquery: 'libs/jquery/jquery-3.4.1',
		jquerymigrate: 'libs/jquery/jquerymigrate',
		jquerymobile: 'libs/jquery/jquery.mobile.custom',
		jqueryprivate: 'libs/portal/jqueryprivate',
		jquerycookie: 'libs/jquery/jquery.cookie',
		jqueryuicore: 'libs/jquery/jquery-ui-1.11.2',
		jqueryui: 'libs/jquery/jquery-ui.custom',
		jqueryuirotatable: 'libs/jquery/jquery.ui.rotatable.min',
		jquerydatatables: 'libs/jquery/jquery.dataTables',
		jquerydatatablesbootstrap: 'libs/jquery/jquery.dataTables.bootstrap',
		jquerydatatablescolreorder: 'libs/jquery/jquery.dataTables.colreorder',
		jquerydatatablesfixedColumns: 'libs/jquery/jquery.dataTables.fixedColumns',
		jqueryuniform: 'libs/jquery/jquery.uniform',
		touchpunch: 'libs/jquery/jquery.ui.touch-punch',
		jqueryiframetransport: 'libs/jquery/jquery.iframe-transport',
		jqueryfileupload: 'libs/jquery/jquery.fileupload',
		jqueryuimultiselect: 'libs/jquery/jquery.uix.multiselect',
		jquerycollision: 'libs/jquery/jquery-collision',
		jquerygritter: 'libs/jquery/jquery.gritter.min',
		jqueryblockui: 'libs/jquery/jquery.blockUI',
		jqueryvalidate: 'libs/jquery/jquery.validate',
		jquerymaskedinput: 'libs/jquery/jquery.maskedinput.min',
		jqueryhotkeys: 'libs/jquery/jquery.hotkeys',
		jquerynestable: 'libs/jquery/jquery.nestable.min',
		jqueryeditableselect: 'libs/jquery/jquery-editable-select',
		jqueryclickout: 'libs/jquery/jquery.clickout.min',
		jsoneditor: 'libs/jsoneditor/jsoneditor',
		spectrum: 'libs/jquery/spectrum',
		tagmanager: 'libs/jquery/tagmanager',
		lottieLib: 'libs/lottie-file/lottie-player',
		typeahead: 'libs/jquery/typeahead',
		multisortable: 'libs/jquery/jquery.multisortable',
		easypiechart: 'libs/jquery/jquery.easy-pie-chart.min',
		flot: 'libs/jquery/jquery.flot',
		flotpie: 'libs/jquery/jquery.flot.pie',
		flotresize: 'libs/jquery/jquery.flot.resize',
		slimscroll: 'libs/jquery/jquery.slimscroll.min',
		colorbox: 'libs/jquery/jquery.colorbox',
		chosen: 'libs/jquery/chosen.jquery.min',
		underscore: 'libs/underscore/underscore', //add window._ = Zr before return
		backbone: 'libs/backbone/backbone-1.2.3',
		backbonetable: 'libs/backbone/backbone.table',
		backboneforms: 'libs/backbone/backbone-forms',
		backboneformslist: 'libs/backbone/list',
		backboneformscustomlist: 'libs/backbone/customlist',
		backboneformsbootstrap3: 'libs/backbone/backbone-forms-template-bootstrap3',
		backbonebootstrapmodal: 'libs/backbone/backbone.bootstrap-modal',
		backboneformscustomeditors: 'libs/backbone/backbone-forms-custom-editors',
		backboneformscustomvalidators: 'libs/backbone/backbone-forms-custom-validators',
		backbonedeepmodel: 'libs/backbone/backbone-deep-model',
		subroute: 'libs/backbone/backbone-subroute',
		bootstrap: 'libs/bootstrap/bootstrap',
		bootstraptimepicker: 'libs/bootstrap/bootstrap-timepicker.min',
		bootstrapdatepicker: 'libs/bootstrap/bootstrap-datepicker',
		bootstrapdatetime: 'libs/bootstrap/bootstrap-datetimepicker',
		bootbox: 'libs/bootstrap/bootbox',
		bootstrapwysiwyg: 'libs/bootstrap/bootstrap-wysiwyg',
		colorpicker: 'libs/bootstrap/bootstrap-colorpicker',
		ace: 'libs/ace/ace.min',
		aceextra: 'libs/ace/ace-extra.min',
		aceelements: 'libs/ace/ace-elements',
		fueluxspinner: 'libs/fuelux/fuelux.spinner',
		fueluxwizard: 'libs/fuelux/fuelux.wizard',
		fueluxtree: 'libs/fuelux/fuelux.tree',
		fullcalendar: 'libs/ace/fullcalendar',
		fullcalendarlangall: 'libs/ace/fullcalendar.lang.all', //must add 'fullcalendar' in its define
		iconpicker: 'libs/portal/fontawesome-iconpicker',
		yotooltip: 'libs/portal/yotooltip',
		qrcode: 'libs/portal/qrcode',
		moment: 'libs/ace/moment',
		momenttimezone: 'libs/ace/moment-timezone',
		select2: 'libs/ace/select2',
		select2dropdownposition: 'libs/ace/select2-dropdownPosition',
		typehead: 'libs/ace/typeahead-bs2.min',
		tmpl: 'libs/template/tmpl.min',
		stripecheckout: 'https://checkout.stripe.com/checkout',
		//stripecheckout: 'libs/portal/stripe',
		templates: '../templates',
		summerNote: 'libs/summernote/summernote.min',
		intlUtil: 'libs/intl-tel-input/utils',
		intlTelInput: 'libs/intl-tel-input/intlTelInput.min',
		glib: './libs/custom/glib',
		markerclustererplus: 'libs/markerclustererplus/markerclustererplus',
		masonry: 'libs/masonry/masonry',
		simplebar: 'libs/simplebar/simplebar',
		jsonp: 'libs/jsonp/jsonp',
		html2canvas: 'libs/html2canvas',
		msal: 'libs/msal',
		papaparse: 'libs/papaparse/papaparse.min',
		xlsx: 'libs/sheetjs/xlsx.full.min',
	},

	map: {
		// '*' means all modules will get 'jquery-private'
		// for their 'jquery' dependency.
		'*': { jquery: 'jqueryprivate' },

		// 'jquery-private' wants the real jQuery module
		// though. If this line was not here, there would
		// be an unresolvable cyclic dependency.
		jqueryprivate: { jquery: 'jquery' },
	},

	shim: {
		/*
				'facebook' : {
					exports: 'FB'
				},
				*/
		chosen: {
			deps: ['jquery'],
		},
		touchpunch: {
			deps: ['jqueryui'],
		},
		yotooltip: {
			deps: ['jqueryui'],
		},
		jqueryuimultiselect: {
			deps: ['jqueryui'],
		},
		jquerydatatablesbootstrap: {
			deps: ['jquerydatatables'],
		},
		jquerydatatablescolreorder: {
			deps: ['jquerydatatables'],
		},
		jquerydatatablesfixedColumns: {
			deps: ['jquerydatatables'],
		},
		jqueryuniform: {
			deps: ['jquery'],
		},
		jqueryvalidate: {
			deps: ['jquery'],
		},
		jquerymaskedinput: {
			deps: ['jquery'],
		},
		jquerycollision: {
			deps: ['jquery'],
		},
		jquerygritter: {
			deps: ['jquery'],
		},
		jqueryhotkeys: {
			deps: ['jquery'],
		},
		jquerynestable: {
			deps: ['jquery'],
		},
		jqueryeditableselect: {
			deps: ['jquery'],
		},
		tagmanager: {
			deps: ['jquery'],
		},
		multisortable: {
			deps: ['jquery', 'jqueryui'],
		},
		jqueryuirotatable: {
			deps: ['jquery', 'jqueryui'],
		},
		draggablecollision: {
			deps: ['jquerycollision'],
		},
		easypiechart: {
			deps: ['jquery'],
		},
		chart: {
			deps: ['moment'],
		},
		flot: {
			deps: ['jquery'],
		},
		flotpie: {
			deps: ['flot'],
		},
		flotresize: {
			deps: ['flot'],
		},
		colorbox: {
			deps: ['jquery'],
		},
		slimscroll: {
			deps: ['jquery'],
		},
		underscore: {
			exports: '_',
		},
		backbonedeepmodel: {
			deps: ['underscore', 'backbone'],
		},
		bootstrap: {
			deps: ['jquery', 'jqueryui'],
		},
		bootstraptimepicker: {
			deps: ['bootstrap'],
		},
		bootstrapdatepicker: {
			deps: ['bootstrap'],
		},
		bootbox: {
			deps: ['bootstrap'],
		},
		bootstrapwysiwyg: {
			deps: ['bootstrap', 'jqueryhotkeys'],
		},
		colorpicker: {
			deps: ['bootstrap'],
		},
		qrcode: {
			exports: 'QRCode',
		},
		typehead: {
			deps: ['jquery'],
		},
		ace: {
			deps: ['aceelements'],
		},
		aceextra: {
			deps: ['backbone'],
		},
		fueluxwizard: {
			deps: ['jqueryui'],
		},
		aceelements: {
			deps: ['aceextra', 'fueluxspinner', 'bootstrap', 'spectrum'],
		},
		tmpl: {
			exports: 'Tmpl',
		},
		stripecheckout: {
			exports: 'StripeCheckout',
		},
		// sheetjs: { exports: 'XLSX' },
		intlUtil: {
			deps: ['intlTelInput'],
		},
		select2dropdownposition: {
			deps: ['select2'],
		},
	},
});
