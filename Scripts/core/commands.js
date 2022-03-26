const { log, getLocalConfig, notify } = require("../lib/utils")

/**
 *
 *
 *
 */
exports.testFunction = async function (argz) {
  try {
    console.log("testFunction")
    console.log(argz)
  } catch (_err) {
    console.log(_err)
  }
}

/**
 */
exports.anotherTestFunction = async function () {
  try {
    console.log("anotherTestFunction")
  } catch (_err) {
    console.log(_err)
  }
}

/**
 * When the 'enabled' status is changed, initialise or deactivate the extension.
 */
exports.updateEnabled = function (newEnabledStatus) {
  if (newEnabledStatus) {
    exports.initialise()
  } else {
    exports.deactivate()
  }
}

/**
 * Register configuration listeners.
 */
exports.registerConfigListeners = function (configKeys) {
  return new Promise((resolve, reject) => {
    try {
      nova.config.onDidChange(
        configKeys.enabled,
        exports.updateEnabled,
        "enabled"
      )

      nova.workspace.config.onDidChange(
        configKeys.enabled,
        exports.updateEnabled,
        "enabled"
      )
      resolve(true)
    } catch (_err) {
      console.log("Error 2")
      console.log(_err)
      reject(_err)
    }
  })
}

/**
 * Update the extension configuration.
 */
exports.updateConfig = function (prefix) {
  return new Promise((resolve, reject) => {
    try {
      if (!nova.config.get(`${prefix}.updated.v1.0.5`)) {
        nova.config.set(`${prefix}.updated.v1.0.5`, true)
      }

      resolve(true)
    } catch (_err) {
      console.log("Error 1")
      console.log(_err)
      reject(_err)
    }
  })
}
