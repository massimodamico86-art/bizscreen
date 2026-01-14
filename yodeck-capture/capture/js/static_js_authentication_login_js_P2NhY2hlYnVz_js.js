const templateData = document.currentScript.dataset;

requirejs.config({ locale: window.requireLocale });

requirejs([`/static/js/common.js?cachebuster=${templateData.timestamp}`], function (common) {
	require(['underscore', 'i18n!nls/main', 'msal', 'bootbox', 'jquerycookie', 'jqueryui', 'jqueryblockui'], function (_, tokens, msal) {
		window.tokens = tokens;
		const redirect_to = templateData.redirectTo != 'None' ? templateData.redirectTo : '';

		const showBox = function (id) {
			hideAllErrors();

			if (id.length < 1) {
				id = 'intro';
			} else if (id.indexOf('main') !== -1) {
				window.next = id;
				id = 'intro';
			}
			$('.widget-box.visible').removeClass('visible');
			$(`#${id}-box`).addClass('visible').find('.main-input').focus();
		};

		const getNavigationType = function () {
			if (window.performance.getEntriesByType('navigation')) {
				const navType = window.performance.getEntriesByType('navigation')[0].type;
				switch (navType) {
					case 'navigate':
						return 0;
					case 'reload':
						return 1;
					case 'back_forward':
						return 2;
					case 'prerender':
						return 3;
				}
			}
		};

		const prelogin = function (event) {
			const redirect = !!event;
			if (event) {
				$('button[type="submit"]', event.target).prop('disabled', true);
			}
			const username = $('#prelogin_form #email').val();
			const data = { username: username };

			hideAllErrors();

			$.ajax({
				url: '/api/v1/user/prelogin/',
				type: 'post',
				contentType: 'application/json',
				data: JSON.stringify(data),
				success: function (data) {
					window.use_saml = false;

					if (data['success']) {
						$('#login-box #password').parent().parent().addClass('block').removeClass('hidden');
						$('#login-box .forgot-password-link').parent().removeClass('hidden');

						$('#id_email').val($('#email').val());
						if (data['use_saml'] && data['action'] && data['action'] == 'redirect') {
							window.use_saml = true;
							window.saml_redirect = data['domain'];
							$('#login-box #password').parent().parent().addClass('hidden').removeClass('block');
							if (redirect) {
								window.location.replace(data['domain']);
							} else {
								$('#login-box .forgot-password-link').parent().addClass('hidden');
							}
						}

						if ('need_captcha' in data && data['need_captcha']) {
							window.use_recaptcha_login = true;
							addCaptcha('login');
						}

						let usernameText = '';

						let userEmail = $.cookie('last_user') || 'hello';

						const offset = userEmail.indexOf('\t');
						if (offset >= 0) {
							const userFullname = userEmail.substring(offset + 1);
							userEmail = userEmail.substring(0, offset);
							if (userEmail === username) {
								usernameText = $('<s>').text(userFullname).html();
							}
						}

						$('#login-box #username').val(username);
						$('#login-box .user_email').html(_.escape(username));

						if (!usernameText) {
							$('#login-box .user_name').hide();
						} else {
							$('#login-box .user_name').html(usernameText);
							$('#login-box .user_email').parent().show();
						}

						$('#login-box .otp-container').toggle(data['use_otp'] && !data['use_saml']);

						const el = $('#login_form').detach();
						$('#login-box .widget-main').append(el);

						showBox(!!templateData.is_initial_password ? 'initial-set-password' : 'login');
					} else {
						checkLoginResponse(data, username);
					}
				},
				complete: function () {
					if (event) {
						$('button[type="submit"]', event.target).prop('disabled', false);
					}
				},
				error: function () {
					$('.email_error ').html(tokens.login_invalid_username);
					$('.error-message').addClass('error');
					$('#login-box .otp-container').hide();
				},
			});
		};

		const initialPasswordSetup = function () {
			$('#login-box').remove();
			$('#intro-box .login_form_title').text(tokens.join_your_team);
			$('#email').val(templateData.email).prop('disabled', true);
			$('#signup_email').val(templateData.email).prop('disabled', true);

			if (!window.hide_signup) $('.user-signup-link').remove();

			if (window.partnership == 'whitelabel') {
				$('.register_newsletter_consent_container, .privacy_policy').remove();
			}

			$('#prelogin_form').on('submit', function () {
				$('.signup-back-button').removeClass('hidden');

				const newsletterConsent = window.partnership != 'whitelabel' && $('#prelogin_form [name="newsletter_consent"]').is(':checked');
				$('#initial-password-set_form [name="newsletter_consent"]').prop('checked', newsletterConsent);
			});

			$('.signup-back-button').on('click', () => {
				showBox('intro');
				$('.signup-back-button').addClass('hidden');

				const newsletterConsent = window.partnership != 'whitelabel' && $('#initial-password-set_form [name="newsletter_consent"]').is(':checked');
				$('#prelogin_form [name="newsletter_consent"]').prop('checked', newsletterConsent);
			});

			$('#initial-password-set_form')
				.on('submit', function (event) {
					event.preventDefault();
					setInitialPassword();
				})
				.on('input', 'input[name="full_name"]', function () {
					const text = $(this).val();
					if (text.length > 60) {
						showFieldError('#signup_full_name', tokens.error_name_length_exceeded);
					} else {
						hideFieldError('#signup_full_name');
					}
				});
		};

		const changeLocation = function () {
			if (window.location.hash === '#logout' || window.location.hash === '#login') {
				window.location.hash = '';
			}
		};

		window.onpopstate = function () {
			changeLocation();
		};

		window.onhashchange = function () {
			const id = window.location.hash.replace('#', '');
			showBox(id);
		};

		window.signinWithGoogleCallback = function (data) {
			if ('credential' in data) {
				hideAllErrors();
				$('.show_pass_container').removeClass('error_placeholder');

				login({
					provider: 'google',
					token: data.credential,
					redirect_to,
				});
			} else {
				authenticationError('google');
			}
		};

		$(document).ready(function () {
			window.dsdata.redirect_to = redirect_to;
			window.dsdata.ask_for_email = templateData.askForEmail == 'True';

			const id = window.location.hash.replace('#', '');
			changeLocation();

			const template = _.template($('#template').html())(tokens);
			const $el = $($.trim(template));
			$('body').append($el);

			showBox(id);
			$('html').addClass('login_html');
			const theme = $.cookie('theme') || 'light';
			$('html').removeClass('dark light system').addClass(theme);

			setupPasswordEvents();

			if ($('#forgot-box').hasClass('visible') && getNavigationType() == 0) {
				showFieldError('#id_email', tokens.login_invalid_username);
			}

			$('#fake_submit').on('click', function () {
				const email = $('#id_email').val();

				if (!validateEmail(email)) {
					showFieldError('#id_email', tokens.error_invalid_mail);
				} else {
					$('#reset_form').submit();
					if (typeof dataLayer !== 'undefined') {
						dataLayer.push({ event: 'resetPassword' });
					}
				}
			});

			$('#login_form').on('submit', function (event) {
				event.preventDefault();

				if (window.use_saml) {
					window.location.replace(window.saml_redirect);
					return;
				}

				const username = $('#login_form #username').val();
				const password = $('#login_form #password').val();
				const otp = $('#login_form #otp').val();
				const data = {
					username: username,
					password: password,
					otp_token: otp,
					redirect_to: window.dsdata.redirect_to,
				};

				if (window.use_recaptcha_login) {
					if (window.login_recaptcha != null) {
						data['g-recaptcha-response'] = grecaptcha.getResponse(window.login_recaptcha);
						if (!data['g-recaptcha-response']) {
							$('.recaptcha_error').addClass('error').html(tokens.login_captcha_required_message);
							return;
						}
					} else {
						$('.error-message').addClass('error').html(tokens.login_captcha_required_message);
						window.use_recaptcha_login = true;
						addCaptcha('login');
						return;
					}
				}

				if (event) {
					$('button[type="submit"]', event.target).prop('disabled', true);
				}

				hideAllErrors();
				$('.show_pass_container').removeClass('error_placeholder');

				login(data, event, redirect_to);
			});

			if (window.dsdata.hide_reset_link) {
				$('.forgot-password-link, #forgot-box').remove();
			} else if (window.dsdata.reset_link) {
				$('.forgot-password-link').attr('href', window.dsdata.reset_link);
			}

			if (window.hide_signup) {
				$('.user-signup-link').remove();
			} else if (window.signup_suffix) {
				$('.user-signup-link').attr('href', `/signup${window.signup_suffix}`);
			}

			if (!!templateData.is_initial_password) {
				initialPasswordSetup();
			} else {
				$('#initial-set-password-box').remove();
			}

			setLanguage(this, $el);

			addCaptcha('login');

			$('#login-box .change-email-link, #login-box .profile-activity').on('click', function (e) {
				e.preventDefault();
				showBox('intro');
			});

			$('#prelogin_form').on('submit', function (e) {
				e.preventDefault();
				prelogin(e);
			});

			$('.user-signup-link').on('click', function (e) {
				e.preventDefault();
				holdUrlParams('.user-signup-link');
				window.location.href = $(this).attr('href');
			});

			let lastEmail = $.cookie('last_user');

			if (!window.dsdata.ask_for_email && lastEmail) {
				const offset = lastEmail.indexOf('\t'); // look for separator between email and username;
				if (offset >= 0) {
					lastEmail = lastEmail.substring(0, offset);
				}

				$('#prelogin_form #email').val(lastEmail);
			}

			loadGoogleScript();
			initializeMicrosoft(msal, true, null, templateData);
		});
	});
});
