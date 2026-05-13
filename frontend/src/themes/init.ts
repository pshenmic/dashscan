import { DEFAULT_THEME, THEME_COOKIE_NAME, THEME_NAMES } from "./registry";

const VALID_THEMES_JSON = JSON.stringify(THEME_NAMES);
const DEFAULT_THEME_JSON = JSON.stringify(DEFAULT_THEME);

export const THEME_INIT_SCRIPT = `(function(){var r=document.documentElement;try{var v=${VALID_THEMES_JSON};var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE_NAME}=([^;]+)/);var t=m?decodeURIComponent(m[1]):null;t=(t&&v.indexOf(t)!==-1)?t:${DEFAULT_THEME_JSON};r.setAttribute('data-theme',t);}catch(e){r.setAttribute('data-theme',${DEFAULT_THEME_JSON});}r.classList.add('light');r.style.colorScheme='light';})();`;
