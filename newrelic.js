'use strict'
 
const { app_name, license_key } = require("./config")
 
/**
* New Relic agent configuration.
*
* See lib/config/default.js in the agent distribution for a more complete
* description of configuration variables and their potential values.
*/
exports.config = {
  app_name: [app_name],
  license_key: license_key,
  /* ... rest of configuration .. */
<<<<<<< HEAD
}
'use strict'

const { app_name, license_key } = require("./config")

/**
 * New Relic agent configuration.
 *
 * See lib/config/default.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  app_name: [app_name],
  license_key: license_key,
  /* ... rest of configuration .. */
=======
>>>>>>> 7f4067260012b59e8fe4a67f094ad6bb1836675d
}