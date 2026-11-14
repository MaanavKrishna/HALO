/** Theme storage key and the pre-paint script. Kept out of the client module so the server layout gets the real string. */
export const THEME_KEY = "halo-theme";

/**
 * Runs in <head> before first paint (see layout.tsx), so a stored choice
 * never flashes the other theme. Static string; no user data.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
