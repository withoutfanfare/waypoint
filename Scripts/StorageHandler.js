/**
 * Nova: Waypoint - StorageHandler.js
 * @author DannyHarding
 */

/**
 * Command Handler
 */
const EXT = require("./lib/extension")

const {
  log,
  getLocalConfig,
  notify,
  ensureNovaFolderExists,
} = require("./lib/utils")

const { getFormattedTime } = require("./lib/helper")

class StorageHandler {
  constructor(config = {}) {
    this.config = config
    this.waypointFilePath =
      nova.workspace.path + "/.nova/" + this.config.filename
    this.waypointTempFilePath = EXT.tmpDir() + "/" + this.config.filename
    this.fileInitialised = false
    // this.backup()
  }

  // IDEA.
  //   backup() {
  //     return new Promise((resolve, reject) => {
  //       try {
  //         if (!nova.fs.access(this.waypointFilePath, nova.fs.F_OK)) {
  //           resolve(false)
  //         }
  //
  //         const maxRetainedBackups = 5
  //         const nowTime = getFormattedTime()
  //         const supportPathNow = nova.path.join(EXT.backupDir(), `${nowTime}`)
  //         const backupFile = nova.path.join(supportPathNow, "waypoints.json")
  //
  //         if (!nova.fs.access(supportPathNow, nova.fs.F_OK)) {
  //           nova.fs.mkdir(supportPathNow)
  //         }
  //
  //         let copied = nova.fs.copy(this.waypointFilePath, backupFile)
  //
  //         let listing = nova.fs.listdir(EXT.backupDir())
  //         listing = listing
  //           .filter((item) => {
  //             return item && item !== ".DS_Store"
  //           })
  //           .sort()
  //
  //         const curRetainedBackups = listing.length
  //
  //         log(curRetainedBackups)
  //         log(listing)
  //
  //         if (!curRetainedBackups || curRetainedBackups < maxRetainedBackups) {
  //           resolve(backupFile)
  //         }
  //
  //         // TODO: Delete excess folders...
  //
  //         resolve(backupFile)
  //       } catch (_err) {
  //         reject(_err)
  //       }
  //     })
  //   }

  save(jsonString) {
    return new Promise((resolve, reject) => {
      if (!jsonString) {
        log("STORAGE ERROR! save has no json string")
        reject("STORAGE ERROR! save has no json string")
      }

      this.write(jsonString)
      if (nova.fs.open(this.waypointTempFilePath, "r")) {
        this.fileInitialised = true
        this.swapTmpJsonToActual().then((res) => {
          resolve(true)
        })
      } else {
        reject(false)
      }
    })
  }

  write(dataString) {
    // log(`write to temp ${this.waypointTempFilePath}`)
    const storageFile = nova.fs.open(this.waypointTempFilePath, "w+")
    if (storageFile) {
      storageFile.write(dataString)
      return true
    } else {
      return false
    }
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
        this.fileInitialised = true
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
      this.initWaypointFile()
        .then((res) => {
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
              // this.restoreBackupWaypointFile()
              // this.clearBackupWaypointFile()
              // resolve(_err)
              let msg =
                "Error interacting with waypoint backup file - please review the .nova folder."
              notify("backup_waypoint_file_error", msg)
              reject(_err)
            })
        })
        .catch((_err) => {
          log("STORAGE ERROR! Error 48")
          log(_err)
          reject(_err)
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
    return new Promise((resolve, reject) => {})
  }

  /**
   * summary
   * @param string - file path
   */
  writeJsonSafe(dataString) {
    return new Promise((resolve, reject) => {
      try {
        if (
          !dataString ||
          dataString.trim() == "" ||
          dataString.trim() == "{}"
        ) {
          resolve(false)
        }

        ensureNovaFolderExists().then((res) => {
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
        })
      } catch (_err) {
        log("STORAGE ERROR! Error 45")
        log(_err)
        reject(_err)
      }
    })
  }
}

module.exports = StorageHandler
