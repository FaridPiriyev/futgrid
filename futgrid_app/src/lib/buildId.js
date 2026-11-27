/* global __BUILD_ID__ */
// Set by vite.config.js on every build. Busts the browser cache of /data/*.json and is shown in the footer.
export const BUILD_ID = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "dev";
