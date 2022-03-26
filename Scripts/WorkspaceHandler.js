/**
 * Nova: Waypoint - StorageHandler.js
 * @author DannyHarding
 */

/**
 * Command Handler
 */
const ext = require("./lib/extension")
const { getLocalConfig, notify } = require("./lib/utils")

class WorkspaceHandler {
  constructor(config = {}) {
    this.config = config
  }

  /**
   *
   * Open the marked file at the correct line position.
   *
   *
   */
  openWaypointFile(selection) {
    selection.map((obj, key) => {
      if (obj.path) {
        let path = nova.workspace.path + "/" + obj.path
        let line = parseInt(obj.line || 1)
        let column = 1

        let fileStatus = nova.workspace.openFile(path, {
          line: line,
          column: column,
        })

        fileStatus.then(function () {
          let editor = nova.workspace.activeTextEditor
        })
      }
      return obj
    })

    return true
  }
}

module.exports = WorkspaceHandler
