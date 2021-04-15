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
      } catch (_err) {
        log("STORAGE ERROR! Error 37")
        log(_err)
        reject(_err)
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
        .catch((_err) => {
          log("STORAGE ERROR! Error 38")
          // TODO: Notify the user about this instead and give instructions to resolve manually?
          this.restoreBackupWaypointFile()
          this.clearBackupWaypointFile()
          resolve(_err)

          // let msg = "Error interacting with waypoint backup file - please review the .nova folder."
          // notify('backup_waypoint_file_error', msg)
          // reject(_err)
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
      } catch (_err) {
        log("STORAGE ERROR! Error 39")
        log(_err)
        reject(_err)
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
          .catch((_err) => {
            log("STORAGE ERROR! Error 40")
            log(_err)
            reject(_err)
          })
      } catch (_err) {
        log("STORAGE ERROR! Error 41")
        log(_err)
        reject(_err)
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
        if (nova.fs.access(this.waypointFilePath + ".bck", nova.fs.W_OK)) {
          let rem = nova.fs.remove(this.waypointFilePath + ".bck")
          resolve(true)
        } else {
          resolve(true)
        }
      } catch (_err) {
        log("STORAGE ERROR! Error 42")
        log(_err)
        reject(_err)
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
      } catch (_err) {
        log("STORAGE ERROR! Error 43")
        log(_err)
        reject(_err)
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
          log("STORAGE ERROR! Error 44")
          log("Unable to write json file.")
          reject("Unable to write json file.")
        }
      } catch (_err) {
        log("STORAGE ERROR! Error 45")
        log(_err)
        reject(_err)
      }
    })
  }
}

module.exports = StorageHandler
