const { remote } = require('electron');
const Store = require('electron-store');
const config = new Store();
const consts = require('./constants.js');
// const url = require('url');
// const rimraf = require('rimraf');
const fs = require("fs")
const path = require("path")

console.log(__filename)

// const CACHE_PATH = consts.joinPath(remote.app.getPath('appData'), remote.app.name, "Cache");

class Utilities {
	constructor() {
		this.consts = {};
		this.settings = null;
		this.onLoad();
	}

	createSettings() {
		this.settings = {
			unlimitedFrames: {
				name: "Unlimited FPS",
				pre: "<div class='setHed'>Performance</div>",
				val: true,
				html: _ => {
					return `<label class='switch'><input type='checkbox' onclick='window.utilities.setSetting("unlimitedFrames", this.checked);
						alert("This setting requires a client restart to take effect.");'
						${this.settings.unlimitedFrames.val ? 'checked' : ''}><span class='slider'></span></label>`;
				},
				set: (_, init) => {
					if (!init) {
						alert("App will now restart");
						remote.app.relaunch();
						remote.app.quit();
					}
				}
			},
			frameLimit: {
				name: "Hard FPS Limit",
				pre: "<div class='setHed customUtility'>More Performance</div>",
				val: 0,
				min: 0,
				max: 10000,
				step: 1,
				html: () => generateSetting("slider", "frameLimit", this)
			},
			 preventAFK: {
				name: "Prevent AFK Kick",
				pre: "<div class='setHed customUtility'>General Tweak</div>",
				val: false,
				html: () => generateSetting("checkbox", "preventAFK", this),
				resources: {
					intervalId: null
				},
				set: (value, init)=> {
					if (value) {
						if (!init) this.settings.preventAFK.resources.intervalId = setInterval(() => window.dispatchEvent(new KeyboardEvent("keydown")), 80000)
					}
					else if (!init) clearInterval(this.settings.preventAFK.resources.intervalId)
				}
			},
			rememberSearch: {
				name: "Remember Server Search Keywords",
				val: false,
				html: () => generateSetting("checkbox", "rememberSearch", this),
				resources: {
					menuObserver: new MutationObserver(() => {
						if (document.getElementById("serverSearch")) {
							serverSearch.addEventListener("input", () => localStorage.setItem("moc_serverSearch", serverSearch.value))
							serverSearch.value = localStorage.getItem("moc_serverSearch")
							serverSearch.oninput()
							this.settings.rememberSearch.resources.menuObserver.disconnect()
						}
					})
				},
				set: value => {
					if (value) {
						this.settings.rememberSearch.resources.menuObserver.observe(menuWindow, {
							childList: true
						})
					} else {
						this.settings.rememberSearch.resources.menuObserver.disconnect()
					}
				}
			},
				hidePopupScore: {
				name: "Hide Popup Score",
				val: false,
				html: () => generateSetting("checkbox", "hidePopupScore", this),
				set: (value, init) => {
					if (value) document.head.appendChild(this.consts.css.hidePopupScore)
					else if (!init) this.consts.css.hidePopupScore.remove()
				}
			},

			healthDisplayType: {
				name: "Health Display Type",
				val: "both",
				html: () => generateSetting("select", "healthDisplayType", this, {
					both: "Both",
					bar: "Bar",
					value: "Value",
					none: "None"
				}),
				set: value => {
					healthValueHolder.style.display = ["both", "value"].includes(value) ? "inherit" : "none"
					healthBar.style.display = ["both", "bar"].includes(value) ? "inherit" : "none"
				}
			},
			hideAds: {
				name: "Hide Ads",
				val: true,
				html: () => generateSetting("checkbox", "hideAds", this),
				set: (value, init) => {
					if (value) document.head.appendChild(this.consts.css.hideAds)
					else if (!init) this.consts.css.hideAds.remove()
				}
			},
			hideClaim: {
				name: "Hide Free KR",
				val: false,
				html: () => generateSetting("checkbox", "hideClaim", this),
				set: value => claimHolder.style.display = value ? "none" : "inherit"
			},
			hideMerch: {
				name: "Hide Merch",
				val: false,
				html: () => generateSetting("checkbox", "hideMerch", this),
				set: value => merchHolder.style.display = value ? "none" : "inherit"
			},
			hideSocials: {
				name: "Hide Social Buttons",
				val: false,
				html: () => generateSetting("checkbox", "hideSocials", this),
				set: (value, init) => {
					if (value) document.head.appendChild(this.consts.css.hideSocials)
					else if (!init) this.consts.css.hideSocials.remove()
				}
			},
			hideStreams: {
				name: "Hide Streams",
				val: false,
				html: () => generateSetting("checkbox", "hideStreams", this),
				set: value => streamContainer.style.display = value ? "none" : "inherit"
			},
			noTextShadows: {
				name: "Remove Text Shadows",
				val: false,
				html: () => generateSetting("checkbox", "noTextShadows", this),
				set: (value, init) => {
					if (value) document.head.appendChild(this.consts.css.noTextShadows)
					else if (!init) this.consts.css.noTextShadows.remove()
				}
			},
		};
		const inject = () => {
			window.windows[0].getCSettings = function () { // WILL ONLY WORK FOR 1.8.3+
				var tmpHTML = "";
				for (var key in window.utilities.settings) {
					if (window.utilities.settings[key].noShow) continue;
					if (window.utilities.settings[key].pre) tmpHTML += window.utilities.settings[key].pre;
					tmpHTML += "<div class='settName' id='" + key + "_div' style='display:" + (window.utilities.settings[key].hide ? 'none' : 'block') + "'>" + window.utilities.settings[key].name +
						" " + window.utilities.settings[key].html() + "</div>";
				}
				tmpHTML += `
	              <br>
	              <a onclick='window.utilities.clearCache()' class='menuLink'>Clear Cache</a>
	              |
				  <a onclick='window.utilities.resetSettings()' class='menuLink'>Reset Addons</a>
				  |
				  <a onclick='window.utilities.relaunchClient()' class='menuLink'>Relaunch Client</a>
				  |
				  <a onclick='remote.shell.openItem(path.join(remote.app.getPath("appData"), remote.app.name))' class='menuLink'>Open appData</a>
				  |
				  <a onclick='remote.shell.openItem(path.join(remote.app.getPath("documents"), "/KrunkerResourceSwapper"), true)' class='menuLink'>Open Resource Swapper<\a>
	           `;
				return tmpHTML;
			};
		}
		function generateSetting(type, name, object, extra, autoSave = true) {
			switch (type) {
				case 'checkbox': return `<label class="switch"><input type="checkbox" ${autoSave ? `onclick="window.utilities.setSetting('${name}', this.checked)"` : ""} ${object.settings[name]['val'] ? 'checked' : ''}><span class="slider"></span></label>`;
				case 'slider': return `<input type="number" class="sliderVal" id="slid_input_utilities_${name}"\nmin="${object.settings[name]['min']}" max="${object.settings[name]['max']}" value="${object.settings[name]['val']}" ${autoSave ? `onkeypress="window.delayExecuteClient(\x27${name}\x27, this)"` : ""} style="border-width:0px"/>\n<div class="slidecontainer">\n<input type="range" id="slid_utilities_${name}" min="${object.settings[name]['min']}" max="${object.settings[name]['max']}" step="${object.settings[name]['step']}"\nvalue="${object.settings[name]['val']}" class="sliderM" ${autoSave ? `oninput="window.utilities.setSetting(\x27${name}\x27, this.value)"` : ""}></div>`;
				case 'select':
					let temp = `<select ${autoSave ? `onchange="window.utilities.setSetting(\x27${name}\x27, this.value)"` : ""} class="inputGrey2">`;
					for (let option in extra) temp += '<option value="' + option + '" ' + (option == object.settings[name]['val'] ? 'selected' : '') + '>' + extra[option] + '</option>';
					return temp += '</select>';
				default: return `<input type="${type}" name="${type}" id="slid_utilities_${name}"\n${'color' == type ? 'style="float:right;margin-top:5px"' : `class="inputGrey2" placeholder="${extra}"`}\nvalue="${object.settings[name]['val']}" ${autoSave ? `oninput="window.utilities.setSetting(\x27${name}\x27, this.value)"` : ""}/>`;
			}
		}
		let waitForWindows = setInterval(_ => {
			if (window.windows) {
				inject();
				clearInterval(waitForWindows);
			}
		}, 100);
		this.setupSettings();
	}

	setupSettings() {
		for (const key in this.settings) {
			if (!this.settings[key].disabled) {
				var tmpVal = config.get(`utilities_${key}`, null);
				this.settings[key].val = tmpVal !== null ? tmpVal : this.settings[key].val;
				if (this.settings[key].val == "false") this.settings[key].val = false;
				if (this.settings[key].set) this.settings[key].set(this.settings[key].val, true);
			}
		}
	}

	createWatermark() {
		const el = document.createElement("div");
		el.id = "watermark";
		el.style.position = "absolute";
		el.style.color = "rgba(0,0,0, 0.3)";
		el.style.bottom = "0";
		el.style.left = "20px";
		el.style.fontSize = "6pt";
		el.innerHTML = "Official Dyna Client v" + remote.app.getVersion();
		gameUI.appendChild(el);
	}

	resetSettings() {
		if (confirm("Are you sure you want to reset all your client addons? This will also refresh the page")) {
			Object.keys(config.store).filter(x => x.includes("utilities_")).forEach(x => config.delete(x));
			location.reload();
		}
	}

	clearCache() {
		if (confirm("Are you sure you want to clear your cache? This will also refresh the page")) {
			// rimraf(CACHE_PATH, () => {
			// 	alert("Cache cleared");
			// 	remote.app.relaunch();
			// 	remote.app.exit();
			// })

			// Clear cache fix
			remote.getCurrentWindow().webContents.session.clearCache().then(() => {
				alert("Cache cleared");
				remote.app.relaunch();
				remote.app.exit();
			})
		}
	}

	// Newer function
	setSetting(t, e) {
		this.settings[t].val = e;
		config.set(`utilities_${t}`, e);
		if (document.getElementById(`slid_utilities_${t}`)) document.getElementById(`slid_utilities_${t}`).value = e;
		if (document.getElementById(`slid_input_utilities_${t}`)) document.getElementById(`slid_input_utilities_${t}`).value = e;

		if (this.settings[t].set) this.settings[t].set(e);
	}

	fixMenuSettings() {
		[...document.querySelectorAll(".menuItemIcon")].forEach(el => el.style.height = "60px");
	}

	relaunchClient(options = {}) {
		remote.app.relaunch(options)
		remote.app.exit(0)
	}

	openItem(fullpath, dir = false, allowMake = true) {
		if (allowMake && !fs.existsSync(fullpath)) {
			!fs.existsSync(path.dirname(fullpath)) && fs.mkdirSync(path.dirname(fullpath), { recursive: true })
			dir ? fs.mkdirSync(fullpath) : fs.writeFileSync(fullpath, "")
		}
		remote.shell.showItemInFolder(path.resolve(fullpath))
	}

	generateStyle(text, id) {
		let newElement = document.createElement("style")
		newElement.id = id
		newElement.innerHTML = text
		return newElement
	}

	flattenObject(obj, prefix = '') {
		return Object.keys(obj).reduce((acc, cur) => {
			const pre = prefix.length ? prefix + '.' : ''
			if (obj[cur] && obj[cur].constructor.name == "Object") Object.assign(acc, this.flattenObject(obj[cur], pre + cur))
			else acc[pre + cur] = obj[cur]
			return acc
		}, {})
	}

	initConsts() {
		// CSS stuff used by utilities
		Object.entries(consts.css).forEach(entry => consts.css[entry[0]] = this.generateStyle(entry[1]))
		this.consts.css = consts.css
	}

	waitGameInit() {
		if (window.hasOwnProperty("windows")) {
			// FPS Limit
			const requestAnimFrameOrig = requestAnimFrame
			let lastTime = 0
			requestAnimFrame = function () {
				if (utilities && utilities.settings.frameLimit.val > 0) {
					for (let i = 0; i < Number.MAX_SAFE_INTEGER && performance.now() - lastTime < 1000 / utilities.settings.frameLimit.val; i++) { }
					lastTime = performance.now()
				}
				requestAnimFrameOrig(...arguments)
			}
		} else setTimeout(() => this.waitGameInit(), 400)
	}

	onLoad() {
		this.initConsts()
		this.fixMenuSettings();
		this.createWatermark();
		this.createSettings();

		window.remote = remote
		window.path = require("path")
		window.timeouts = {}
		window.delayExecuteClient = function (name, object, delay = 600) {
			return clearTimeout(timeouts[name]), timeouts[name] = setTimeout(function () {
				window.utilities.setSetting(name, object['value']);
			}, delay), true;
		};
		this.waitGameInit()


	}
}

module.exports = Utilities;
