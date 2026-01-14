// General functions
window.blockUIIndex = 0;

const unblockUI = function () {
	window.blockUIIndex -= 1;

	if (window.blockUIIndex <= 0) {
		$.unblockUI();
		window.blockUIIndex = 0;
	}
};

const blockUI = function (message = 'Please Wait...') {
	if (window.blockUIIndex == 0) {
		$.blockUI({
			message: `<h2>${message}</h2>`,
			overlayCSS: { opacity: 0.3 },
			fadeIn: 1000,
			fadeOut: 200,
		});
	}
	window.blockUIIndex += 1;
	window.unblockTimeout = window.setTimeout(unblockUI, 30000);
};

const addCaptcha = function (source) {
	if (source === 'signup' && window.use_recaptcha_signup) {
		if (window.signup_recaptcha != null) {
			grecaptcha.reset(window.signup_recaptcha);
		} else {
			window.signup_recaptcha = grecaptcha.render('signup-recaptcha', {
				sitekey: '6Lf__zgUAAAAAFxtLIcECpqtalxQ2Ht6IiNqWuHH',
			});
		}
	}

	if (source === 'login' && window.use_recaptcha_login) {
		if (window.login_recaptcha != null) {
			grecaptcha.reset(window.login_recaptcha);
		} else {
			window.login_recaptcha = grecaptcha.render('login-recaptcha', {
				sitekey: '6Lf__zgUAAAAAFxtLIcECpqtalxQ2Ht6IiNqWuHH',
			});
		}
	}

	if (window.use_recaptcha_reset) {
		if (window.reset_recaptcha != null) {
			grecaptcha.reset(window.reset_recaptcha);
		} else {
			window.reset_recaptcha = grecaptcha.render('reset-recaptcha', {
				sitekey: '6Lf__zgUAAAAAFxtLIcECpqtalxQ2Ht6IiNqWuHH',
			});

			$('#reset_form').submit(function (event) {
				const recaptcha = grecaptcha.getResponse(window.reset_recaptcha);
				if (recaptcha === '') {
					event.preventDefault();
					$('.recaptcha_error').addClass('error').html(tokens.login_captcha_required_message);
				}
			});
		}
	}
};

const languageSelect = function (event) {
	event.preventDefault();
	window.currentLocale = event.target.id;
	localStorage.setItem('locale', event.target.id);
	localStorage.setItem('forcelocale', true);
	location.reload();
};

const setLanguage = function (self, $el) {
	if (Object.keys(window.app_locales).length <= 1) {
		$('.menu-languages', self.el).hide();
	} else {
		$('.menu-languages', $el).html(`${_.escape(window.app_locales[window.currentLocale].label)} <i class="ds-angle-down"></i>`);

		for (let j = 0; j < window.app_locales_keys.length; ++j) {
			let i = window.app_locales_keys[j];
			let o = window.app_locales[i];

			if (!o) {
				continue;
			}

			if (window.currentLocale != i) {
				const text = `<li><a class="locale" id="${_.escape(o.val)}" title="">${_.escape(o.label)}${o.label_en ? ' • ' + _.escape(o.label_en) : ''}</a></li>${i == 'en' ? '<li class="divider"/>' : ''}`;
				if (i == 'en') $('.otherLangs', $el).prepend(text);
				else $('.otherLangs', $el).append(text);
			}
		}

		const showLocale = window.default_locale === 'en' && window.detectedLocale != 'en' && window.detectedLocale === window.currentLocale;
		$('.language-warning').toggle(showLocale);
		$('.locale', $el).on('click', (e) => languageSelect(e));
	}

	$('.menu-languages')
		.on('click', function () {
			const isLanguageDropdownVisible = $('.otherLangs', self).is(':visible');
			$('.otherLangs', self).toggle(!isLanguageDropdownVisible);
			$('i', self).toggleClass('ds-angle-down', isLanguageDropdownVisible).toggleClass('ds-angle-up', !isLanguageDropdownVisible);
		})
		.on('blur', function (e) {
			setTimeout(() => {
				$('.otherLangs', self).hide();
				$('i', self).addClass('ds-angle-down').removeClass('ds-angle-up');
			}, 100);
		});
};

const holdUrlParams = function (selector) {
	const currentUrl = new URL(window.location);
	const queryString = currentUrl.search;
	const hashString = currentUrl.hash.includes('?') ? currentUrl.hash.split('?')[0] : currentUrl.hash;
	const queryParams = currentUrl.hash.includes('?') ? '?' + currentUrl.hash.split('?')[1] : '';

	$(selector).each(function () {
		const $this = $(this);
		if ($this.attr('href')) {
			const originalHref = new URL($this.attr('href'), window.location.origin);
			originalHref.search = queryString || originalHref.search;

			const originalHash = originalHref.hash.includes('?') ? originalHref.hash.split('?')[0] : originalHref.hash;
			originalHref.hash = hashString + queryParams || originalHash;

			$this.attr('href', originalHref.toString());
		}
	});
};

// Input related functions
const hideAllErrors = function () {
	$('.error-message').html('').removeClass('error');
	$('input').removeClass('error_placeholder');
};

const hideFieldError = function (inputElement) {
	$(inputElement).removeClass('error_placeholder').parent().parent().find('.error-message').hide().removeClass('error');
};

const showFieldError = function (inputElement, errorToken, newValue = '') {
	$(inputElement).val(newValue).attr('placeholder', errorToken).addClass('error_placeholder').focus().parent().parent().find('.error-message').addClass('error').removeClass('hidden').text(errorToken).show();
};

const showPasswordError = function (passwordElement, token = tokens.error_generic_invalid_password, clearPassword = false) {
	$('#password_requirements').fadeIn(200);
	$(`.show_pass_container, ${passwordElement}`).addClass('error_placeholder').focus();
	$('.password-data-error, .password_error').addClass('error').html(token).show();
	if (clearPassword) $(passwordElement).val('');
};

const getNames = function (fullName) {
	const nameParts = fullName.split(' ');
	const sliceIndex = Math.max(nameParts.length - 1, 1);
	const firstName = nameParts.slice(0, sliceIndex).join(' ');
	const lastName = nameParts[sliceIndex] || '';

	return [firstName, lastName];
};

const validateEmail = function (email) {
	const re = /^[\w!#$%&’*+/=?`{|}~^-]+(?:\.[\w!#$%&’*+/=?`{|}~^-]+)*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,20}$/i;
	return re.test(email);
};

const validatePassword = function (password) {
	const passwordValidator = new RegExp(/^(?=.*?[a-z])(?=.*?[A-Z])(?=.*?\d)(?=.*?[!"#$%&'()*+,.\/:;<=>?@^_`{|}~\\ \[\]-])[\w\d!"#$%&'()*+,.\/:;<=>?@^_`{|}~\\ \]\[-]{8,128}$/, 'g');
	return passwordValidator.test(password);
};

const passwordChecks = [
	{ el: '#password-check-length', re: /^.{8,}$/ },
	{ el: '#password-check-upper', re: /[A-Z]/ },
	{ el: '#password-check-lower', re: /[a-z]/ },
	{ el: '#password-check-digit', re: /\d/ },
	{ el: '#password-check-symbol', re: /[!"#$%&'()*+,.\/:;<=>?@^_`{|}~\\ \[\]-]/ },
];

const checkPasswordRequirements = function (password) {
	for (const passwordCheck of passwordChecks) {
		const $el = $(passwordCheck.el);
		$el.removeClass();
		if (!password) continue;
		$el.addClass(passwordCheck.re.test(password) ? 'valid' : 'invalid');
	}
};

const setupPasswordEvents = function () {
	$('.show_pass_container').on('click', function () {
		const $eye = $(this).find('.show_pass');
		const passwordInput = $eye.parent().siblings('input');
		const isVisible = passwordInput.attr('type') == 'text';
		passwordInput.attr('type', isVisible ? 'password' : 'text');
		$eye.replaceWith(`<i class="notranslate material-symbols-outlined-16 show_pass">${isVisible ? 'visibility_off' : 'visibility'}</i>`);
	});

	$('#initial_password, #signup_password, #id_new_password1')
		.on('focus', () => $('#password_requirements').fadeIn(200))
		.on('blur', () => $('#password_requirements').fadeOut(200))
		.on('input', function () {
			checkPasswordRequirements(this.value);
			$(this).removeClass('error_placeholder');
			$('.show_pass_container').removeClass('error_placeholder');
		});
};

// Social Login functions
const loadGoogleScript = function () {
	const script = document.createElement('script');
	script.src = `https://accounts.google.com/gsi/client?hl=${window.currentLocale || 'en'}`;
	document.body.appendChild(script);
};

const initializeMicrosoft = function (msal, isLogin = true, signupFunction = null, templateData) {
	const msButton = document.getElementById('ms-button');
	if (!!msButton) {
		const msalConfig = {
			auth: {
				clientId: window.microsoft_authentication_client_id,
				authority: 'https://login.microsoftonline.com/common',
			},
		};
		// YDK-18418 See dummy view
		if (!!templateData.isCanvaLogin) {
			msalConfig.auth.redirectUri = '/dummy';
		}
		const msalInstance = new msal.PublicClientApplication(msalConfig);
		msButton.addEventListener('click', () => {
			const loginRequest = {
				scopes: ['openid', 'profile', 'user.read'],
			};
			msalInstance
				.loginPopup(loginRequest)
				.then((response) => {
					const token = response.idToken;
					const provider = 'microsoft';
					if (isLogin)
						login({
							provider,
							token,
							redirect_to: window.dsdata.redirect_to || '',
						});
					else {
						const payload = {
							provider,
							token,
							fb_id: $.cookie('_fbp') ? $.cookie('_fbp') : '',
							language: window.currentLocale,
							plan: templateData.plan,
							referrer: window.referrer,
							accepted_terms: true,
							newsletter_consent: window.partnership != 'whitelabel' && $('[name="newsletter_consent"]').is(':checked'),
							hs_info: {
								hutk: $.cookie('hubspotutk') || '',
								pageUri: window.location.href || '',
								pageName: document.title || '',
							},
						};
						signupFunction(payload);
					}
				})
				.catch((error) => {
					console.error('Error during login', error);
				});
		});
	}
};

// Login related functions
const authenticationError = function (provider, message = tokens.authentication_failed_message) {
	bootbox.dialog({
		message: _.template(message)(),
		title: tokens[`${provider}_authentication_failed_title`],
		buttons: {
			success: {
				label: tokens.ok,
				className: 'primary-button',
			},
		},
	});
};

const handleLoginError = function (xhr, provider) {
	let html = `<p>${tokens.wrong_credentials}</p>`;

	if (xhr.status == 401) {
		if (!('responseJSON' in xhr)) {
			if ('responseText' in xhr) {
				if (xhr.responseText.indexOf('2FA') > -1) {
					$('.recaptcha_error').html(tokens.login_2fa_authentication_failed);
					$('.recaptcha_error').addClass('error');
					$('#otp').addClass('error_placeholder');
				}
			}
			return;
		}

		if (xhr.responseJSON.error.message == 'Recaptcha Validation Failed') {
			if (!window.use_recaptcha_login) {
				window.use_recaptcha_login = true;
				addCaptcha('login');
				html = tokens.login_captcha_required_message;
				$('.recaptcha_error').html(html).addClass('error');
			} else {
				html = tokens.login_captcha_fail_message;
				$('.recaptcha_error').html(html).addClass('error');
				grecaptcha.reset();
			}
		} else if (xhr.responseJSON.error.code == 'restricted_networks') {
			html = '';
			bootbox.alert({
				message: `<h5 class="red text-center">${tokens.login_access_denied_from_network}</h5>`,
				buttons: {
					ok: {
						label: tokens.ok,
						className: 'btn-success',
						callback: function () {},
					},
				},
			});
		} else {
			showPasswordError('#password', tokens.wrong_credentials);

			if (window.login_recaptcha != null) {
				grecaptcha.reset();
			}
		}
	} else if (xhr.status == 422) {
		html = tokens.two_factor_required;
		$('.recaptcha_error').html(html).addClass('error');
		$('#otp').addClass('error_placeholder');
		showFieldError('#otp');
	} else if (xhr.status == 0) {
		html = 'request failed';
		$('.recaptcha_error').html(html).addClass('error');
	} else if (xhr.status == 404) {
		html = tokens.login_invalid_username;
		if (!!provider) {
			bootbox.alert({
				message: `<h5 class="red text-center">${tokens.login_invalid_username}</h5>`,
				buttons: {
					ok: {
						label: tokens.ok,
						className: 'btn-success',
						callback: function () {},
					},
				},
			});
			return;
		}
		$('.email_error').html(html).addClass('error');
		$('#email').addClass('error_placeholder');
	} else if (xhr.status == 400) {
		if (xhr?.responseJSON?.error?.code == 'invalid_token') {
			authenticationError(provider);
		} else if (xhr?.responseJSON?.error?.code == 'user_does_not_exist') {
			authenticationError(provider, xhr.responseJSON.error.message);
		} else if ((provider, xhr?.responseJSON?.error?.code == 'social_login_not_allowed')) {
			authenticationError(provider, tokens.social_login_not_allowed);
		} else if (xhr?.responseJSON?.error?.code == 'staff_2fa_enforced') {
			authenticationError(provider, xhr.responseJSON.error.message);
		}
	}
};

const setUserCookies = function (data) {
	$.cookie('user', data, { secure: true });

	const domain = document.location.hostname;
	const options = { secure: true };
	if (!window.partnership) {
		// empty for our domain
		const offset = domain.indexOf('.'); // could be -1, so…
		options.domain = domain.substr(offset + 1); // …either after the dot, or at the start of the string
		options.path = '/';
		options.expires = 14; // two weeks is a good duration for this cookie
	}
	// if domain is specified in options, then it applies for subdomains too
	$.cookie('logged_user', JSON.stringify(data), options);

	const lastUserData = `${data.username}\t${data['first_name'] ? data['first_name'] : ''}${data['first_name'] && data['last_name'] ? ' ' : ''}${data['last_name'] ? data['last_name'] : ''}`;
	$.cookie('last_user', lastUserData, { expires: 7, secure: true });
};

const checkLoginResponse = function (data, username) {
	if (data['action'] && data['action'] == 'redirect') {
		let message = tokens.login_redirect_partner_message;
		let title = tokens.login_redirect_partner_title;

		if (data['error'] == 'is_beta_account') {
			message = tokens.login_redirect_beta_message;
			title = tokens.login_redirect_beta_title;
		}

		if (data['error'] == 'is_partner_account' || data['error'] == 'is_beta_account') {
			bootbox.dialog({
				message: message,
				title: title,
				buttons: {
					success: {
						label: tokens.ok,
						className: 'secondary-button',
						callback: function () {
							window.location.replace(`https://${data.domain}/login?redirect=true&email=${username}`);
						},
					},
				},
			});
		} else if (data['error'] === 'is_subsite_account') {
			// YDK-11493
			const target = new URL('', window.location);
			target.protocol = 'https';
			target.hostname = data.domain;
			target.pathname = 'login';
			target.search = new URLSearchParams({ redirect: 'true', email: username });
			window.location.replace(target.href);
		} else {
			window.location.replace(data.domain);
		}
	}
};

const issueCanvaAuthCode = function () {
	$.ajax({
		url: '/api/v1/canva/issue_auth_code/',
		type: 'post',
		contentType: 'application/json',
		success: (data) => {
			const urlParams = new URLSearchParams(window.location.search);
			const redirectURL = new URL(urlParams.get('redirect_uri'));
			redirectURL.searchParams.append('code', data.auth_code);
			redirectURL.searchParams.append('state', urlParams.get('state'));
			window.location.href = redirectURL;
		},
	});
};

const login = function (data, event = null, redirect_to = '') {
	const provider = data.provider;
	$.ajax({
		url: '/api/v1/user/login/',
		type: 'post',
		contentType: 'application/json',
		data: JSON.stringify(data),
		success: function (data) {
			if (!!templateData.isCanvaLogin) {
				issueCanvaAuthCode();
				return;
			}

			if (typeof dataLayer !== 'undefined') {
				dataLayer.push({ event: 'login', referrerPage: document.referrer });
			}

			if (data['success']) {
				setUserCookies(data);

				if (!!templateData.is_initial_password) {
					if (data.email === templateData.email) {
						setInitialPassword(true, provider);
					} else {
						bootbox.alert({
							message: `<h5 class="red text-center">${tokens.different_email_associated}</h5>`,
							buttons: {
								ok: {
									label: tokens.ok,
									className: 'btn-success',
									callback: function () {},
								},
							},
						});
					}

					return;
				}

				if (redirect_to) {
					window.location = redirect_to;
				} else if (data['action'] == 'redirect') {
					if ('use_saml' in data && data.use_saml) window.location.replace(data.domain);
					else window.location.replace(`//${data.domain}`);
				} else {
					window.location = `index.html${window.location.search}${window.location.hash}`;
				}
			} else {
				checkLoginResponse(data, data.username);
			}
		},
		complete: function () {
			if (event) {
				$('button[type="submit"]', event.target).prop('disabled', false);
			}
		},
		error: function (xhr) {
			handleLoginError(xhr, data.provider);
		},
	});
};

const setInitialPassword = function (isSocialLogin = false, provider = '') {
	const fullName = $('#initial-password-set_form #signup_full_name').val().trim();
	const [firstName, lastName] = getNames(fullName);
	const password = $('#initial-password-set_form #initial_password').val();

	if (!isSocialLogin) {
		if (fullName.length < 1 || firstName.length > 30 || lastName.length > 30) {
			const errorMessage = fullName.length < 1 ? tokens.error_name_required : tokens.error_name_length_exceeded;
			showFieldError('#signup_full_name', errorMessage);
		}

		if (!validatePassword(password)) {
			return showPasswordError('#initial_password', '');
		}
	}

	const pathArray = window.location.pathname.split('/');
	const data = {
		uidb64: pathArray[2],
		token: pathArray[3],
		password: password,
		first_name: firstName,
		last_name: lastName,
		newsletter_consent: window.partnership != 'whitelabel' && $('[name="newsletter_consent"]').is(':checked'),
		is_social_login: isSocialLogin,
		provider: provider,
	};

	blockUI(tokens.creating_account);

	$.ajax({
		url: '/api/v1/user/initial_set_password/',
		type: 'post',
		contentType: 'application/json',
		data: JSON.stringify(data),
		success: function (response) {
			window.location = window.location.origin + '/index.html';
		},
		complete: function () {
			unblockUI();
		},
		error: function (response) {
			const code = response?.responseJSON.error.code;
			if (code == 'name_required') {
				showFieldError('#signup_full_name', tokens.error_name_required);
			} else if (code.endsWith('_password')) {
				let errorMessage = tokens.error_generic_invalid_password;
				if (code == 'lengthy_password') errorMessage = tokens.error_password_length_exceeded;
				else if (code == 'custom_invalid_password') errorMessage = response.responseJSON.error.message;

				return showPasswordError('#initial_password', errorMessage);
			}
		},
	});
};
