const EXT = require("../lib/extension")

exports.log = function (msg) {
  if (nova.inDevMode()) {
    console.log(msg)
  }
}

/**
 * Get the locally valid configuration setting (workspace if set, else global).
 * @returns {?*} The configuration value (if any).
 * @param {string} key - The configuration key to look up.
 * @param {string} [type] - The type to coerce the configuration value to.
 * @see {@link https://docs.nova.app/api-reference/configuration/}
 */
exports.getLocalConfig = function (key, type) {
  return nova.workspace.config.get(key) != null
    ? nova.workspace.config.get(key, type)
    : nova.config.get(key, type)
}

/**
 * Simple event notification.
 * @param {string} id - NotificationRequest.id.
 * @param {string} message - NotificationRequest.message.
 */
exports.notify = function (id, message) {
  const request = new NotificationRequest(id + exports.getId())
  request.title = nova.extension.name
  request.body = message

  exports.log(message)
  nova.notifications.add(request)
}

/*
Sorts an array of file paths by file name alphabetically.
Called in conjunction with the JS sort function.
Eg: filePathArray.sort(this.sortByFileName);
*/
exports.sortByFileName = function sortByFileName(a, b) {
  a = nova.path.basename(a.path).toLowerCase()
  b = nova.path.basename(b.path).toLowerCase()
  return a > b ? 1 : b > a ? -1 : 0
}

//
exports.sortByName = function sortByName(a, b) {
  a = a.name.toLowerCase()
  b = b.name.toLowerCase()
  return a > b ? 1 : b > a ? -1 : 0
}

//
exports.sortByLine = function sortByLine(a, b) {
  a = a.line
  b = b.line
  return a > b ? 1 : b > a ? -1 : 0
}

exports.sortByUpdated = function sortByLine(a, b) {
  return b.updatedAt - a.updatedAt
}

/*
Returns a boolean representing whether or not the current
environment is a workspace or Nova window without a 
workspace.
*/
exports.isWorkspace = function isWorkspace() {
  if (nova.workspace.path == undefined || nova.workspace.path == null) {
    return false
  } else {
    return true
  }
}

/**
 * Check for Nova Workspace
 */
exports.ensureWorkspace = function ensureWorkspace() {
  return new Promise((resolve, reject) => {
    /**
     * If not a project workspace, prevent further execution
     */
    if (!exports.isWorkspace()) {
      const msg = nova.localize(`${EXT.prefixMessage()}.not-workspace-error`)
      reject(msg)
    } else {
      resolve(true)
    }
  })
}

/*
Returns a boolean representing whether or not a .nova folder is present.
*/
exports.isProject = function isProject() {
  let novaFolder = nova.path.join(nova.workspace.path, ".nova")
  if (!nova.fs.access(novaFolder, nova.fs.W_OK)) {
    return false
  }

  if (!nova.fs.stat(novaFolder).isDirectory()) {
    return false
  }

  return true
}

/*
Returns a boolean representing whether or not a .nova folder is present.
*/
exports.ensureNovaFolderExists = function ensureNovaFolderExists() {
  return new Promise((resolve, reject) => {
    try {
      let novaFolder = nova.path.join(nova.workspace.path, ".nova")

      if (!nova.fs.access(novaFolder, nova.fs.F_OK)) {
        // TODO - make a config setting to auto-create or ask user when this happens.
        nova.fs.mkdir(novaFolder)
      }

      if (
        nova.fs.stat(novaFolder).isDirectory() &&
        nova.fs.access(novaFolder, nova.fs.W_OK)
      ) {
        resolve(novaFolder)
      } else {
        reject(false)
      }
    } catch (_err) {
      reject(false)
      console.log(_err)
    }
  })

  return true
}

exports.getRndInteger = function getRndInteger(min = 0, max = 50) {
  return Math.floor(Math.random() * (max - min)) + min
}

exports.getTimedUid = function getId() {
  return Date.now()
}

exports.getId = function getId() {
  return [exports.getTimedUid(), exports.getRndInteger()].join("_")
}

exports.capitaliseString = function capitaliseString(s) {
  if (typeof s !== "string") return ""
  return s.charAt(0).toUpperCase() + s.slice(1)
}

exports.filterDuplicates = (itemArr) =>
  itemArr.filter((v, i) => itemArr.indexOf(v) === i)

/*
 * Returns an array that has been stripped of null, blank, and undefined elements.
 */
exports.cleanArray = function cleanArray(arr) {
  arr = arr.filter(function (element) {
    element = element.trim()
    if (element !== null && element !== "" && element !== undefined) {
      return element
    }
  })
  arr = arr.map((element) => element.trim())
  return arr
}

/**
 *
 */
exports.findByAttributeRecursive = function findByAttributeRecursive(
  tree,
  nodeId,
  prop = "",
  attribute = "identifier",
  byIndex = false,
  arr = []
) {
  for (let [index, node] of tree.entries()) {
    if (node && node[attribute] && node[attribute] === nodeId) {
      return byIndex ? [...arr, index] : node
    }

    if (node && prop && prop.length && node[prop] && node[prop].length) {
      let found = exports.findByAttributeRecursive(
        node[prop],
        nodeId,
        prop,
        attribute,
        byIndex,
        [...arr, index]
      )

      if (found) {
        return found
      }
    }
  }
  return false
}

/**
 * Recursive convert to json
 * @param {node} node - tree item
 */
exports.getOpenDocumentsRootItems = function getOpenDocumentsRootItems(node) {
  return new Promise((resolve, reject) => {
    try {
      let openDocuments = nova.workspace.textDocuments.map((doc) => {
        if (doc.path) {
          return nova.workspace.relativizePath(doc.path.toString())
        }
      })
      resolve(openDocuments)
    } catch (_err) {
      reject(_err)
    }
  })
}

exports.debounce = function debounce(fn, delay) {
  var timeoutID = null
  return function () {
    clearTimeout(timeoutID)
    var args = arguments
    var that = this
    timeoutID = setTimeout(function () {
      fn.apply(that, args)
    }, delay)
  }
}
