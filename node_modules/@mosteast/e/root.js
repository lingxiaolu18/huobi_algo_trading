/*
 |--------------------------------------------------------------------------
 | Functionality related to project base directory
 |--------------------------------------------------------------------------
 | !!! THIS FILE IS LOCATION RESTRICTED, DON'T MOVE IT !!!
 */
const { resolve } = require('path');
const { stat } = require('fs');
/**
 * App base path
 * @param segments
 *
 * @example Get app base dir
 */
function dir_root(...segments) {
    return resolve(__dirname, ...segments);
}
module.exports = { dir_root };
//# sourceMappingURL=root.js.map