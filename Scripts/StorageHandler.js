/**
 * Nova: Waypoint - StorageHandler.js
 * @author DannyHarding
 */

/**
 * Command Handler
 */
const ext = require("./lib/extension")
const { log, getLocalConfig, notify } = require("./lib/utils")

class StorageHandler {
  constructor(config = {}) {
    this.config = config
    this.waypointFilePath =
      nova.workspace.path + "/.nova/" + this.config.filename
    this.waypointTempFilePath = ext.tmpDir() + "/" + this.config.filename
  }

  getWorkspaceFile() {
    return this.waypointFilePath
  }

  canAccessWaypointFile() {
    return nova.fs.access(this.waypointFilePath, nova.fs.W_OK)
  }

  initWaypointFile(mode = "r+t") {
    return new Promise((resolve, reject) => {
      try {
        this.storageFile = nova.fs.open(this.waypointFilePath, mode)
        resolve(this.storageFile)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Swap the new temporary file into place of the actual data file.
   * Create a backup first, that we can use to restore from if something goes wrong,
   */
  swapTmpJsonToActual() {
    return new Promise((resolve, reject) => {
      this.backupWaypointFile()
        .then((message) => {
          let removed = nova.fs.remove(this.waypointFilePath)
          nova.fs.copy(this.waypointTempFilePath, this.waypointFilePath)
          this.clearBackupWaypointFile()
          resolve(true)
        })
        .catch((message) => {
          this.restoreBackupWaypointFile()
          this.clearBackupWaypointFile()
          resolve(message)
        })
    })
  }

  /**
   * Restore backup waypoint data file to actual data file.
   */
  restoreBackupWaypointFile() {
    return new Promise((resolve, reject) => {
      try {
        // TODO - copied is always undefined?
        let copied = nova.fs.copy(
          this.waypointFilePath + ".bck",
          this.waypointFilePath
        )
        resolve(true)
      } catch (error) {
        reject(false)
      }
    })
  }

  /**
   * Backup waypoint data file.
   */
  backupWaypointFile() {
    return new Promise((resolve, reject) => {
      try {
        this.clearBackupWaypointFile()
          .then((message) => {
            // TODO - copied is always undefined?
            let copied = nova.fs.copy(
              this.waypointFilePath,
              this.waypointFilePath + ".bck"
            )
            resolve(true)
          })
          .catch((message) => {
            throw message
          })
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Clear the backup waypoint data file.
   */
  clearBackupWaypointFile() {
    return new Promise((resolve, reject) => {
      try {
        // TODO - rem is always undefined?
        let rem = nova.fs.remove(this.waypointFilePath + ".bck")
        resolve(true)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Get the raw json from file.
   */
  getJson() {
    return new Promise((resolve, reject) => {
      try {
        if (!nova.fs.access(this.waypointFilePath, nova.fs.R_OK)) {
          throw "Unable to access Waypoint file"
        }
        const lines = nova.fs.open(this.waypointFilePath).readlines()
        let ret = lines.length > 0 ? JSON.parse(lines.join("\n")) : null
        resolve(ret)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * summary
   * @param string - file path
   */
  writeJson(dataString) {
    return new Promise((resolve, reject) => {
      try {
        if (
          !dataString ||
          dataString.trim() == "" ||
          dataString.trim() == "{}"
        ) {
          resolve(false)
        }
        // Open tmp file and truncate first.
        const storageFile = nova.fs.open(this.waypointTempFilePath, "w+")
        if (storageFile) {
          storageFile.write(dataString)
          resolve(dataString)
        } else {
          reject("Unable to write json file.")
        }
      } catch (error) {
        reject(error)
      }
    })
  }
}

module.exports = StorageHandler
