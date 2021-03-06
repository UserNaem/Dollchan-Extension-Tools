/*==[ ThreadUpdater.js ]======================================================================================
                                                THREAD UPDATER
============================================================================================================*/

function initThreadUpdater(title, enableUpdate) {
	var focusLoadTime, paused = false,
		enabled = false,
		disabledByUser = true,
		lastECode = 200,
		sendError = false,
		newPosts = 0,
		hasYouRefs = false,
		storageName = 'de-lastpcount-' + aib.b + '-' + aib.t;

	var audio = {
		enabled: false,
		repeatMS: 0,
		disable() {
			this.stop();
			this.enabled = false;
			const btn = $id('de-panel-audio-on');
			if(btn) {
				btn.id = 'de-panel-audio-off';
			}
		},
		play() {
			this.stop();
			if(this.repeatMS === 0) {
				this._el.play();
				return;
			}
			this._playInterval = setInterval(() => this._el.play(), this.repeatMS);
		},
		stop() {
			if(this._playInterval) {
				clearInterval(this._playInterval);
				this._playInterval = null;
			}
		},

		get _el() {
			const val = doc.createElement('audio');
			val.setAttribute('preload', 'auto');
			val.src = gitRaw + 'signal.ogg';
			Object.defineProperty(this, '_el', { val });
			return val;
		}
	};

	var counter = {
		enable() {
			this._enabled = true;
			$show(this._el);
		},
		disable() {
			this._enabled = false;
			this._stop();
			$hide(this._el);
		},
		count(delayMS, useCounter, callback) {
			if(this._enabled && useCounter) {
				var seconds = delayMS / 1000;
				this._set(seconds);
				this._countingIV = setInterval(() => {
					seconds--;
					if(seconds === 0) {
						this._stop();
						callback();
					} else {
						this._set(seconds);
					}
				}, 1000);
			} else {
				this._countingTO = setTimeout(() => {
					this._countingTO = null;
					callback();
				}, delayMS);
			}
		},
		setWait() {
			this._stop();
			if(this._enabled) {
				this._el.innerHTML = '<svg class="de-wait"><use xlink:href="#de-symbol-wait"/></svg>';
			}
		},

		_countingIV: null,
		_countingTO: null,
		_enabled: false,
		get _el() {
			var value = $id('de-updater-count');
			Object.defineProperty(this, '_el', { value });
			return value;
		},

		_set(seconds) {
			this._el.innerHTML = seconds;
		},
		_stop() {
			if(this._countingIV) {
				clearInterval(this._countingIV);
				this._countingIV = null;
			}
			if(this._countingTO) {
				clearTimeout(this._countingTO);
				this._countingTO = null;
			}
		}
	};

	var favicon = {
		get canBlink() {
			return Cfg.favIcoBlink && !!this.originalIcon;
		},
		get originalIcon() {
			return this._iconEl ? this._iconEl.href : null;
		},
		initIcons() {
			if(this._isInited) {
				return;
			}
			this._isInited = true;
			var icon = new Image();
			icon.onload = e => {
				try {
					this._initIconsHelper(e.target);
				} catch(err) {
					console.warn('Icon error:', err);
				}
			};
			if(aib.fch) {
				// Due to CORS we cannot apply href to icon.src directly
				$ajax(this._iconEl.href, { responseType: 'blob' }, false).then(xhr => {
					icon.src = 'response' in xhr ?
						window.URL.createObjectURL(xhr.response) : '/favicon.ico';
				}, emptyFn);
				return;
			}
			icon.src = this._iconEl.href;
		},
		updateIcon(isError) {
			if(!isError && !newPosts) {
				this._setIcon(this.originalIcon);
			} else if(this._hasIcons) {
				this._setIcon(isError ? this._iconError : hasYouRefs ? this._iconYou : this._iconNew);
			}
		},
		startBlinkNew() {
			if(this._hasIcons) {
				this._startBlink(hasYouRefs ? this._iconYou : this._iconNew);
			} else {
				this._startBlink(this._emptyIcon);
			}
		},
		startBlinkError() {
			this._startBlink(this._hasIcons ? this._iconError : this._emptyIcon);
		},
		stopBlink() {
			if(this._blinkInterval) {
				clearInterval(this._blinkInterval);
				this._blinkInterval = null;
			}
			if(!this._isOriginalIcon) {
				this._setIcon(this.originalIcon);
				this._isOriginalIcon = true;
			}
		},

		_blinkInterval: null,
		_blinkMS: 800,
		_currentIcon: null,
		_emptyIcon: 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
		_hasIcons: false,
		_iconError: null,
		_iconNew: null,
		_iconYou: null,
		_isInited: false,
		_isOriginalIcon: true,
		get _iconEl() {
			var el = $q('link[rel="shortcut icon"]', doc.head) ||
				$bEnd(doc.head, '<link href="/favicon.ico" rel="shortcut icon"/>');
			Object.defineProperties(this, {
				'_iconEl': { value: el, writable: true },
				'originalIcon': { value: el.href }
			});
			return el;
		},
		_initIconsHelper(icon) {
			function drawLines(ctx, line1, line2, color, width, scaleFactor) {
				ctx.beginPath();
				ctx.strokeStyle = color;
				ctx.lineWidth = width * scaleFactor;
				ctx.moveTo(line1[0] * scaleFactor, line1[1] * scaleFactor);
				ctx.lineTo(line1[2] * scaleFactor, line1[3] * scaleFactor);
				ctx.moveTo(line2[0] * scaleFactor, line2[1] * scaleFactor);
				ctx.lineTo(line2[2] * scaleFactor, line2[3] * scaleFactor);
				ctx.stroke();
			}
			var canvas = doc.createElement('canvas'),
				ctx = canvas.getContext('2d'),
				wh = Math.max(icon.naturalHeight, 16 * (window.devicePixelRatio || 1)),
				scale = wh / 16;
			canvas.width = canvas.height = wh;
			ctx.drawImage(icon, 0, 0, wh, wh);
			var original = ctx.getImageData(0, 0, wh, wh);
			drawLines(ctx, [15, 15, 7, 7], [7, 15, 15, 7], '#780000', 3, scale);
			drawLines(ctx, [14.5, 14.5, 7.5, 7.5], [7.5, 14.5, 14.5, 7.5], '#fa2020', 1.5, scale);
			this._iconError = canvas.toDataURL('image/png');
			ctx.putImageData(original, 0, 0);
			drawLines(ctx, [6, 11, 16, 11], [11, 6, 11, 16], '#1c5f23', 4, scale);
			drawLines(ctx, [7, 11, 15, 11], [11, 7, 11, 15], '#00f51b', 2, scale);
			this._iconNew = canvas.toDataURL('image/png');
			ctx.putImageData(original, 0, 0);
			drawLines(ctx, [6, 11, 16, 11], [11, 6, 11, 16], '#122091', 4, scale);
			drawLines(ctx, [7, 11, 15, 11], [11, 7, 11, 15], '#1b6df5', 2, scale);
			this._iconYou = canvas.toDataURL('image/png');
			this._hasIcons = true;
		},
		_setIcon(iconUrl) {
			$del(this._iconEl);
			this._iconEl = $aBegin(doc.head, '<link rel="shortcut icon" href="' + iconUrl + '">');
		},
		_startBlink(iconUrl) {
			if(this._blinkInterval) {
				if(this._currentIcon === iconUrl) {
					return;
				}
				clearInterval(this._blinkInterval);
			}
			this._currentIcon = iconUrl;
			this._blinkInterval = setInterval(() => {
				this._setIcon(this._isOriginalIcon ? this._currentIcon : this.originalIcon);
				this._isOriginalIcon = !this._isOriginalIcon;
			}, this._blinkMS);
		}
	};

	var notification = {
		get canShow() {
			return Cfg.desktNotif && this._granted;
		},
		checkPermission() {
			if(Cfg.desktNotif && ('permission' in Notification)) {
				switch(Notification.permission.toLowerCase()) {
				case 'default': this._requestPermission(); break;
				case 'denied': saveCfg('desktNotif', 0);
				}
			}
		},

		show() {
			var post = Thread.first.last,
				notif = new Notification(aib.dm + '/' + aib.b + '/' + aib.t + ': ' + newPosts +
					Lng.newPost[lang][lang !== 0 ? +(newPosts !== 1) : (newPosts % 10) > 4 ||
					(newPosts % 10) === 0 || (((newPosts % 100) / 10) | 0) === 1 ? 2 :
					(newPosts % 10) === 1 ? 0 : 1] + Lng.newPost[lang][3],
				{
					'body': post.text.substring(0, 250).replace(/\s+/g, ' '),
					'tag': aib.dm + aib.b + aib.t,
					'icon': post.images.firstAttach ? post.images.firstAttach.src : favicon.originalIcon
				});
			notif.onshow = () => setTimeout(() => {
				if(notif === this._notifEl) {
					this.close();
				}
			}, 12e3);
			notif.onclick = () => window.focus();
			notif.onerror = () => {
				window.focus();
				this._requestPermission();
			};
			this._notifEl = notif;
		},
		close() {
			if(this._notifEl) {
				this._notifEl.close();
				this._notifEl = null;
			}
		},

		_granted: true,
		_closeTO: null,
		_notifEl: null,

		_requestPermission() {
			this._granted = false;
			Notification.requestPermission(state => {
				if(state.toLowerCase() === 'denied') {
					saveCfg('desktNotif', 0);
				} else {
					this._granted = true;
				}
			});
		}
	};

	var updMachine = {
		start(needSleep = false, loadOnce = false) {
			if(this._state !== -1) {
				this.stop(false);
			}
			this._state = 0;
			this._loadOnce = loadOnce;
			this._delay = this._initDelay = Cfg.updThrDelay * 1e3;
			if(!loadOnce) {
				this._setUpdateStatus('on');
			}
			this._makeStep(needSleep);
		},
		stop(updateStatus = true) {
			if(this._state !== -1) {
				this._state = -1;
				if(this._loadPromise) {
					this._loadPromise.cancel();
					this._loadPromise = null;
				}
				counter.setWait();
				if(updateStatus) {
					this._setUpdateStatus('off');
				}
			}
		},

		_delay: 0,
		_initDelay: 0,
		_loadPromise: null,
		_loadOnce: false,
		_seconds: 0,
		_state: -1,
		get _panelButton() {
			var value = $q('a[id^="de-panel-upd"]');
			if(value) {
				Object.defineProperty(this, '_panelButton', { value });
			}
			return value;
		},

		_handleNewPosts(lPosts, error) {
			if(error instanceof CancelError) {
				return;
			}
			infoLoadErrors(error, false);
			var eCode = (error instanceof AjaxError) ? error.code : 0;
			if(eCode !== 200 && eCode !== 304) {
				if(doc.hidden && favicon.canBlink) {
					favicon.startBlinkError();
				}
				if(eCode === -1 || (eCode === 404 && lastECode === 404)) {
					Thread.removeSavedData(aib.b, aib.t);
					updateTitle(eCode);
					disableUpdater();
				} else {
					this._setUpdateStatus('warn');
					if(!Cfg.noErrInTitle) {
						updateTitle(eCode);
					}
					this._makeStep();
				}
				lastECode = eCode;
				return;
			}
			if(lastECode !== 200) {
				favicon.stopBlink();
				this._setUpdateStatus('on');
				if(!Cfg.noErrInTitle) {
					updateTitle(eCode);
				}
			}
			lastECode = eCode;
			if(doc.hidden) {
				if(lPosts !== 0) {
					newPosts += lPosts;
					updateTitle();
					if(favicon.canBlink) {
						favicon.startBlinkNew();
					}
					if(notification.canShow) {
						notification.show();
					}
					if(audio.enabled) {
						audio.play();
					}
					sesStorage[storageName] = Thread.first.pcount;
					this._delay = this._initDelay;
				} else if(this._delay !== 12e4) {
					this._delay = Math.min(this._delay + this._initDelay, 12e4);
				}
			}
			this._makeStep();
		},
		_makeStep(needSleep = true) {
			while(true) switch(this._state) {
			case 0:
				if(needSleep) {
					this._state = 1;
					counter.count(this._delay, !doc.hidden, () => this._makeStep());
					return;
				}
				/* falls through */
			case 1:
				counter.setWait();
				this._state = 2;
				this._loadPromise = Thread.first.loadNewPosts().then(
					({ newCount, locked }) =>
						this._handleNewPosts(newCount, locked ? AjaxError.Locked : AjaxError.Success),
					e => this._handleNewPosts(0, e));
				return;
			case 2:
				this._loadPromise = null;
				if(this._loadOnce) {
					this._state = -1;
					return;
				}
				this._state = 0;
				break;
			default:
				console.error('Invalid thread updater state:', this._state, new Error().stack);
				return;
			}
		},
		_setUpdateStatus(status) {
			if(this._panelButton) {
				this._panelButton.id = 'de-panel-upd-' + status;
				this._panelButton.title = Lng.panelBtn['upd-' + (status === 'off' ? 'off' : 'on')][lang];
				if(nav.Presto) {
					this._panelButton.innerHTML = '<svg class="de-panel-svg"><use xlink:href="#de-symbol-panel-upd"/></svg>';
				}
			}
		}
	};

	function enableUpdater() {
		enabled = true;
		disabledByUser = paused = hasYouRefs = false;
		newPosts = 0;
		focusLoadTime = -1e4;
		notification.checkPermission();
		if(Cfg.updCount) {
			counter.enable();
		}
		favicon.initIcons();
	}

	function disableUpdater() {
		if(enabled) {
			audio.disable();
			counter.disable();
			updMachine.stop();
			enabled = false;
		}
	}

	function forceLoadPosts() {
		if(enabled && paused) {
			return;
		}
		if(!enabled && !disabledByUser) {
			enableUpdater();
		}
		updMachine.start(false, !enabled);
	}

	function updateTitle(eCode = lastECode) {
		doc.title = (sendError === true ? '{' + Lng.error[lang] + '} ' : '') +
			(eCode <= 0 || eCode === 200 ? '' : '{' + eCode + '} ') +
			(newPosts === 0 ? '' : '[' + newPosts + '] ') + title;
		favicon.updateIcon(eCode !== 200 && eCode !== 304);
	}

	doc.addEventListener('visibilitychange', e => {
		if(!doc.hidden) {
			var focusTime = e.timeStamp;
			favicon.stopBlink();
			audio.stop();
			notification.close();
			newPosts = 0;
			hasYouRefs = false;
			sendError = false;
			setTimeout(function() {
				updateTitle();
				if(enabled && focusTime - focusLoadTime > 1e4) {
					focusLoadTime = focusTime;
					forceLoadPosts();
				}
			}, 200);
		} else if(Thread.first) {
			Post.clearMarks();
		}
	});
	if(enableUpdate) {
		enableUpdater();
		updMachine.start(true);
	}

	return {
		enable() {
			if(!enabled) {
				enableUpdater();
				updMachine.start();
			}
		},
		disable() {
			disabledByUser = true;
			disableUpdater();
		},
		toggle() {
			if(enabled) {
				this.disable();
			} else {
				this.enable();
			}
		},
		forceLoad(e) {
			if(e) {
				$pd(e);
			}
			Post.clearMarks();
			if(enabled && paused) {
				return;
			}
			$popup('newposts', Lng.loading[lang], true);
			forceLoadPosts();
		},
		pause() {
			if(enabled && !paused) {
				updMachine.stop();
				paused = true;
			}
		},
		continue(needSleep = false) {
			if(enabled && paused) {
				updMachine.start(needSleep);
				paused = false;
			}
		},
		toggleAudio(repeatMS) {
			if(audio.enabled) {
				audio.stop();
				return (audio.enabled = false);
			}
			audio.repeatMS = repeatMS;
			return (audio.enabled = true);
		},
		toggleCounter(enableCnt) {
			if(enableCnt) {
				counter.enable();
				counter.setWait();
			} else {
				counter.disable();
			}
			forceLoadPosts();
		},
		sendErrNotif() {
			if(Cfg.sendErrNotif && doc.hidden) {
				sendError = true;
				updateTitle();
			}
		},
		refToYou() {
			if(doc.hidden) {
				hasYouRefs = true;
			}
		}
	};
}
