import {
  DEFAULT_THEME,
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_COOKIE_NAME,
  THEME_MIGRATION_COOKIE_NAME,
  THEME_NAMES,
} from "./registry";

const VALID_THEMES_JSON = JSON.stringify(THEME_NAMES);
const DEFAULT_THEME_JSON = JSON.stringify(DEFAULT_THEME);

export const THEME_INIT_SCRIPT = `(function(){var r=document.documentElement;try{var v=${VALID_THEMES_JSON};var c=document.cookie;var migrated=/(?:^|;\\s*)${THEME_MIGRATION_COOKIE_NAME}=1/.test(c);var m=c.match(/(?:^|;\\s*)${THEME_COOKIE_NAME}=([^;]+)/);var t=m?decodeURIComponent(m[1]):null;if(!migrated){t=${DEFAULT_THEME_JSON};document.cookie='${THEME_COOKIE_NAME}='+t+'; path=/; max-age=${THEME_COOKIE_MAX_AGE_SECONDS}; samesite=lax';document.cookie='${THEME_MIGRATION_COOKIE_NAME}=1; path=/; max-age=${THEME_COOKIE_MAX_AGE_SECONDS}; samesite=lax';}else{t=(t&&v.indexOf(t)!==-1)?t:${DEFAULT_THEME_JSON};}r.setAttribute('data-theme',t);}catch(e){r.setAttribute('data-theme',${DEFAULT_THEME_JSON});}r.classList.add('light');r.style.colorScheme='light';})();`;
