/**
 * Nova: Waypoint - WaypointDataProvider.js
 * @author DannyHarding
 */

const ext = require("./lib/extension")
const {
  log,
  notify,
  sortByFileName,
  sortByUpdated,
  sortByLine,
  capitaliseString,
  filterDuplicates,
  getOpenDocumentsRootItems,
  findByAttributeRecursive,
  ensureNovaFolderExists,
} = require("./lib/utils")

const { itemToJson } = require("./lib/helper")

const {
  getDocumentText,
  getLineFromRange,
  getLineFromEditorSelected,
} = require("./lib/document")

const { defaultJson } = require("./lib/defaults")
const { WaypointItem } = require("./WaypointItem.js")

module.exports.TreeDataProvider = class TreeDataProvider {
  constructor(storageProvider, myEventHandler, config = {}) {
    this.config = config
    this.storage = storageProvider
    this.eventHandler = myEventHandler

    this.storedFiles = []
    this.waypointIds = []
    this.openStoredFiles = []

    this.defaultJson = defaultJson

    // TODO - decorate on activation
    // this.eventHandler.on("journey-activated", function (payload) {
    //   if (payload && payload.journey && payload.journey.name) {
    //     log(`journey-activated`)
    //     log(payload.journey.name)
    //   }
    // })

    // TODO - decorate on deletion
    // this.eventHandler.on("node-deleted", function (payload) {
    //   log(`node-deleted`)
    //   log(payload)
    // })

    // TODO - decorate on creation
    // this.eventHandler.on("waypoint-created", function (payload) {
    //   if (payload && payload.waypoint && payload.waypoint.name) {
    //     log(`waypoint-created`)
    //     log(payload.waypoint.name)
    //   }
    // })
  }

  /**
   * Return the json from file, or template json.
   * @param {string} sortBy - sortby - TODO
   */
  loadData(sortBy) {
    return new Promise((resolve, reject) => {
      this.sortBy = sortBy
      this.storage
        .getJson()
        .catch((_err) => {
          return defaultJson
        })
        .then((json) => {
          resolve(json)
        })
    })
  }

  initData(json) {
    return new Promise((resolve, reject) => {
      try {
        this.setJson(json)
        this.setRootItems(this.jsonToTreeStructure(json))
        let aJName = json && json.activeJourney ? json.activeJourney : null
        this.setActiveJourney(aJName)
          .then((journey) => {
            if (journey) {
            }
            resolve(json)
          })
          .catch((_err) => {
            log("TreeDataProvider ERROR! Error 50")
            log(_err)
            reject(_err)
          })
      } catch (_err) {
        log("TreeDataProvider ERROR! Error 49")
        log(_err)
        reject(_err)
      }
    })
  }

  refreshJson() {
    return new Promise((resolve, reject) => {
      try {
        resolve(this.getJson())
      } catch (_err) {
        log("TreeDataProvider ERROR! Error 51")
        log(_err)
        reject(_err)
      }
    })
  }

  getJson() {
    return this.json
  }

  setJson(json) {
    this.json = json
  }

  getWaypointIds() {
    return this.waypointIds
  }

  setWaypointIds(arr) {
    this.waypointIds = arr
  }

  getRootItems() {
    return this.rootItems
  }

  setRootItems(json) {
    this.rootItems = json
  }

  getStoredFiles() {
    return this.storedFiles
  }

  setStoredFiles(pathArray) {
    this.storedFiles = pathArray
  }

  getOpenStoredFiles() {
    return this.openStoredFiles
  }

  setOpenStoredFiles(pathArray) {
    this.openStoredFiles = pathArray
  }

  // Get file paths implicated in file.
  extractStoredFiles(json) {
    return new Promise((resolve, reject) => {
      try {
        if (!json) {
          json = this.getJson()
        }

        if (!json) {
          return []
        }

        let files = json.journeys
          .map((journey) => {
            return journey.children
              .map((file) => {
                return file.path
              })
              .flat()
          })
          .flat()
          .filter((val) => val != "")

        files = filterDuplicates(files)
        resolve(files)
      } catch (_err) {
        log("TreeDataProvider ERROR! Error 52")
        log(_err)
        reject(_err)
      }
    })
  }

  getOpenEditorFiles() {
    return new Promise((resolve, reject) => {
      try {
        getOpenDocumentsRootItems()
          .then((items) => {
            const storedFiles = this.getStoredFiles()
            if (storedFiles && storedFiles.length && items && items.length) {
              let files = items.filter((el) => {
                return storedFiles.includes(el)
              })
              resolve(files)
            } else {
              resolve([])
            }
          })
          .catch((_err) => {
            log("TreeDataProvider ERROR! Error 54")
            log(_err)
            reject(_err)
          })
      } catch (_err) {
        log("TreeDataProvider ERROR! Error 53")
        log(_err)
        reject(_err)
      }
    })
  }

  /**
   * Requests the children of an element
   * @param {journeyItem} element
   */
  getChildren(element) {
    if (!element) {
      return this.rootItems || []
    } else {
      return element.children || []
    }
  }

  /**
   * For use with the reveal() method
   * @param {journeyItem} element
   */
  getParent(element) {
    if (!element || !element.parent) {
      return false
    }
    try {
      return element.parent
    } catch (_err) {
      log("TreeDataProvider ERROR! Error 53")
      log(_err)
      return false
    }
  }

  /**
   * Adds TreeItem
   * @param {element} element - data item
   */
  getTreeItem(element) {
    let currentActiveJourneyName = this.getActiveJourneyName()

    if (!element || !element.identifier || !element.name) {
      return false
    }

    let item = new TreeItem(element.name)
    if (!item) {
      return false
    }

    item.identifier = element.identifier

    let lineNumber = element.line ? parseInt(element.line) : false
    let elementFilepath =
      element.path && element.path !== "" ? element.path : false
    let elementName = element.name && element.name !== "" ? element.name : false
    let isJourney = !lineNumber && !elementFilepath ? true : false
    let isWaypoint = lineNumber > -1 && elementFilepath ? true : false
    let isFile = !lineNumber && elementFilepath ? true : false
    let hasParent = element.parent ? element.parent : false
    let hasChildren =
      element.children && element.children.length > 0 ? element.children : false
    let isActive = elementName == currentActiveJourneyName ? true : false
    let parentActive =
      hasParent && hasParent.name == currentActiveJourneyName ? true : false

    if (hasChildren) {
      if (isActive) {
        item.collapsibleState = TreeItemCollapsibleState.Expanded
      } else {
        if (
          hasParent &&
          hasParent.name &&
          hasParent.name == currentActiveJourneyName
        ) {
          item.collapsibleState = TreeItemCollapsibleState.Expanded
          // IDEA - instead of expending all, only expand files that are open? // TODO:
        } else {
          item.collapsibleState = TreeItemCollapsibleState.Collapsed
        }
      }
      item.descriptiveText = `(${element.children.length})`
    }

    if (isJourney) {
      return this.initJourneyTreeItem(element, item, isActive)
    }

    if (isFile) {
      return this.initFileTreeItem(element, item, parentActive)
    }

    if (isWaypoint) {
      return this.initWaypointTreeItem(element, item, isActive)
    }

    return false
  }

  /**
   * Adds Journey TreeItem element attributes
   * @param {element} element - data item
   * @param {item} item - tree item
   */
  initJourneyTreeItem(element, item, isActive = false) {
    item.contextValue = "journey"
    let hasChildren =
      element.children && element.children.length > 0 ? element.children : false

    if (isActive) {
      if (hasChildren) {
        item.collapsibleState = TreeItemCollapsibleState.Expanded
      }
      item.color = new Color(ColorFormat.rgb, [0.2, 0.6, 0.2, 1]) // green
    } else {
      item.color = new Color(ColorFormat.rgb, [0, 0, 0, 1]) // black
    }

    const msg = nova.localize(`${ext.prefixMessage()}.add-waypoint-tooltip`)
    item.command = `${ext.prefixCommand()}.activateJourney`
    item.image = "__filetype.md" // fallback for Nova < 3?
    item.tooltip = msg
    return item
  }

  /**
   * Adds File TreeItem element attributes
   * @param {element} element - data item
   * @param {item} item - tree item
   */
  initFileTreeItem(element, item, isActive = false) {
    item.contextValue = "file"
    item.command = `${ext.prefixCommand()}.doubleClick`
    item.color = new Color(ColorFormat.rgb, [0.2, 0.2, 0.2, 1]) // grey

    // If the file is open, set as cyan
    let openFiles = this.getOpenStoredFiles()
    if (openFiles && openFiles.length) {
      if (openFiles.includes(element.path)) {
        item.color = new Color(ColorFormat.rgb, [0.3, 0.6, 0.9, 1])
      }
    }

    item.image = "__filetype.json"
    item.path = element.path
    return item
  }

  /**
   * Adds Waypoint TreeItem element attributes
   * @param {element} element - data item
   * @param {item} item - tree item
   */
  initWaypointTreeItem(element, item, isActive = false) {
    // REVIEW - sanitise for storing in json?
    // But... We need it to be exactly searchable in the documents... Hmmm.
    let substring = element.name.substr(0, 35)

    const msg = nova.localize(`${ext.prefixMessage()}.double-click-prompt`)
    item.contextValue = "waypoint"
    item.command = `${ext.prefixCommand()}.doubleClick`
    item.name = `${substring}`
    item.tooltip = msg + " " + element.line
    item.color = new Color(ColorFormat.rgb, [0.4, 0.4, 0.4, 1]) // grey
    item.image = "__filetype.txt" // fallback for Nova < 3?
    item.collapsibleState = TreeItemCollapsibleState.None
    item.descriptiveText = `@ ${element.line}`
    return item
  }

  /**
   * Return currently active journey
   */
  getActiveJourney() {
    return this.activeJourney
  }

  /**
   * Return currently active name
   */
  getActiveJourneyName() {
    let active = this.getActiveJourney()
    if (active && active.name) {
      return active.name
    }
    return false
  }

  /**
   * Set Active journey based on name string.
   * @param {string} journeyName
   */
  setActiveJourney(journeyName) {
    return new Promise((resolve, reject) => {
      try {
        let index = false
        if (this.rootItems && this.rootItems.length) {
          if (journeyName && journeyName !== "") {
            index = this.rootItems.findIndex((i) => i.name === journeyName)
          }

          if (
            index > -1 &&
            this.rootItems &&
            this.rootItems.length &&
            this.rootItems[index]
          ) {
            this.activeJourney = this.rootItems[index]
            this.activeFile = this.rootItems[index].children[0]
              ? this.rootItems[index].children[0]
              : false
            this.activeWaypoint =
              this.activeFile && this.rootItems[index].children[0].children[0]
                ? this.rootItems[index].children[0].children[0]
                : false
          }
        } else {
          this.activeJourney = false
        }

        this.eventHandler.emit("journey-activated", {
          journey: this.activeJourney,
        })

        resolve(this.activeJourney)
      } catch (_err) {
        this.activeJourney = false
        log("TreeDataProvider ERROR! Error 56")
        log(_err)
        reject(_err)
      }
    })
  }

  /**
   * Convert loaded object to treeview format.
   * @param {object} - tree object
   */
  jsonToTreeStructure(waypointJson) {
    this.waypointIds = []

    if (!waypointJson) {
      waypointJson = this.getJson()
    }

    if (
      !waypointJson ||
      !waypointJson.journeys ||
      !waypointJson.journeys.length
    ) {
      return []
    }

    const jarr = waypointJson.journeys.sort(sortByUpdated)
    return jarr
      .map((journey) => {
        if (journey && journey.children && journey.children.length) {
          let element = new WaypointItem(journey)
          let jc = journey.children.sort(sortByUpdated)
          jc.map((waypoint, key) => {
            waypoint.name = waypoint.name || waypoint.path
            let fileWaypoint = new WaypointItem(waypoint)
            if (waypoint.children) {
              let wpc = waypoint.children.sort(sortByFileName)
              wpc.map((mark, k) => {
                let lineWaypoint = new WaypointItem({
                  name: mark.name,
                  line: mark.line,
                })
                fileWaypoint.addChild(lineWaypoint)
                this.waypointIds.push(lineWaypoint.identifier)
              })
            }
            element.addChild(fileWaypoint)
          })
          return element
        } else {
          return journey
        }
      })
      .filter(Boolean)
  }

  /**
   * Save current data to json file
   */
  save(jsonObj) {
    return new Promise((resolve, reject) => {
      if (!jsonObj) {
        jsonObj = this.toJson()
      }

      if (!jsonObj) {
        const msg = nova.localize(`${ext.prefixMessage()}.empty-json-error`)
        log("TreeDataProvider ERROR! Error 57")
        log(msg)
        reject(msg)
      }

      let jsonString = JSON.stringify(jsonObj)
      if (!jsonString) {
        const msg = nova.localize(`${ext.prefixMessage()}.convert-json-error`)
        log("TreeDataProvider ERROR! Error 58")
        log(msg)
        reject(msg)
      }

      jsonString = jsonString
        // .replace(/\\n/g, "\\n")
        .replace(/\\'/g, "\\'")
        .replace(/\\"/g, '\\"')
        .replace(/\\&/g, "\\&")
        .replace(/\\r/g, "\\r")
        .replace(/\\t/g, "\\t")
        .replace(/\\b/g, "\\b")
        .replace(/\\f/g, "\\f")

      this.storage
        .save(jsonString)
        .then((res) => {
          this.eventHandler.emit("data-saved")
          resolve(res)
        })
        .catch((_err) => {
          reject(false)
        })
    })
  }

  /**
   * TreeView to json
   */
  toJson() {
    let myJSON = {
      activeJourney: this.getActiveJourneyName(),
      journeys: [],
    }

    if (this.rootItems && this.rootItems.length) {
      myJSON.journeys = this.rootItems
        .map((v) => {
          return itemToJson(v)
        })
        .filter(Boolean)
    }
    return myJSON
  }

  /**
   * Add waypoint to the tree
   */
  addJourney(journeyName) {
    let index = false
    if (!this.rootItems) {
      this.rootItems = []
    }
    if (journeyName && journeyName !== "") {
      journeyName = journeyName.trim()
      index = this.rootItems.findIndex((i) => i.name === journeyName)
    }

    if (!index || index < 0) {
      let newWaypoint = new WaypointItem({
        name: capitaliseString(journeyName),
        updated_at: Date.now(),
        children: [],
      })
      // TODO - this messes up the sorting in the sidepanel - make it more graceful.
      this.rootItems.unshift(newWaypoint)
      this.setActiveJourney(newWaypoint.name)
    } else {
      this.setActiveJourney(journeyName)
    }
    return this.getActiveJourney()
  }

  /**
   * Rename Journey
   */
  renameJourney(newName, oldName) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.rootItems || !this.rootItems.length) {
          log("TreeDataProvider ERROR! Error 61")
          reject(false)
        }

        let index = false
        if (oldName && oldName !== "") {
          oldName = oldName.trim()
          index = this.rootItems.findIndex((i) => i.name === oldName)
        } else {
          log("TreeDataProvider ERROR! Error 62")
          reject(false)
        }

        // TODO - validate name doesn't exist already

        if (index > -1 && this.rootItems[index]) {
          let item = this.rootItems[index]
          item.name = newName.trim()
          resolve(newName)
        } else {
          log("TreeDataProvider ERROR! Error 63")
          reject(false)
        }
      } catch (_err) {
        log("TreeDataProvider ERROR! Error 64")
        reject(false)
      }
    })
  }

  validateRemoveWaypoint(waypointObj) {
    return new Promise((resolve, reject) => {
      try {
        if (!waypointObj || !waypointObj.identifier) {
          log("TreeDataProvider ERROR! Error 66")
          reject("Waypoint was missing 'identifier'.")
        }
        resolve(waypointObj)
      } catch (_err) {
        log("TreeDataProvider ERROR! Error 65")
        log(_err)
        reject(_err)
      }
    })
  }

  deleteWaypoint(waypointObj) {
    return new Promise((resolve, reject) => {
      try {
        let hasDeleted = false
        let journeyIdentifier =
          waypointObj && waypointObj.identifier ? waypointObj.identifier : false
        let journeyName =
          waypointObj && waypointObj.name ? waypointObj.name : false

        try {
          if (journeyIdentifier && journeyIdentifier !== "") {
            hasDeleted = false

            if (this.rootItems) {
              let item = findByAttributeRecursive(
                this.rootItems,
                journeyIdentifier,
                "children",
                "identifier",
                true,
                []
              )

              if (item && item.length && item[0] > -1) {
                if (item.length == 1 && this.rootItems[item[0]]) {
                  hasDeleted = journeyName
                  delete this.rootItems[item[0]]
                }

                if (
                  item.length == 2 &&
                  this.rootItems[item[0]] &&
                  this.rootItems[item[0]].children[item[1]]
                ) {
                  hasDeleted = journeyName
                  delete this.rootItems[item[0]].children[item[1]]
                }

                if (
                  item.length == 3 &&
                  this.rootItems[item[0]] &&
                  this.rootItems[item[0]].children[item[1]] &&
                  this.rootItems[item[0]].children[item[1]].children[item[2]]
                ) {
                  hasDeleted = journeyName
                  delete this.rootItems[item[0]].children[item[1]].children[
                    item[2]
                  ]
                }
              }
            }
          }

          this.eventHandler.emit("node-deleted", journeyName)

          resolve(journeyName)
        } catch (_err) {
          // TODO - simplify
          log("TreeDataProvider ERROR! Error 67")
          log(_err)
          reject(_err)
        }
      } catch (_err) {
        log("TreeDataProvider ERROR! Error 68")
        log(_err)
        reject(_err)
      }
    })
  }

  async removeWaypoints(deletables) {
    let promises = []
    deletables.map((waypoint) => {
      promises.push(this.removeWaypoint(waypoint))
    })

    return Promise.all(promises)
      .catch(function (err) {
        log("TreeDataProvider ERROR! Error 69")
        log(err)
        return promises
      })
      .then(function (promises) {
        return promises
      })
  }

  // Used to check things are working in development - not used by the app.
  testPromise(inp) {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(inp), 4000)
    })
  }

  /**
   * Remove tree waypoint
   */
  removeWaypoint(waypointObj) {
    return new Promise((resolve, reject) => {
      try {
        this.validateRemoveWaypoint(waypointObj)
          .then((validWaypointObj) => {
            this.deleteWaypoint(waypointObj)
              .then((deleteResult) => {
                resolve(deleteResult)
              })
              .catch((_err) => {
                log("TreeDataProvider ERROR! Error 72")
                log(_err)
                reject(_err)
              })
          })
          .catch((_err) => {
            log("TreeDataProvider ERROR! Error 70")
            log(_err)
            reject(_err)
          })
      } catch (_err) {
        log("TreeDataProvider ERROR! Error 71")
        log(_err)
        reject(_err)
      }
    })
  }

  /**
   * TODO - if user changes filename, update json.
   */
  updateFilename(newURI, oldURI) {
    return new Promise((resolve, reject) => {
      try {
        let index = false
        if (newURI && newURI !== "") {
          newURI = newURI.trim()
          // index = this.rootItems.findIndex((i) => i.name === nameString)
          // if (index > -1 && this.rootItems[index]) {
          //   return this.rootItems[index]
          // }
        }

        resolve(true)
      } catch (_err) {
        log("TreeDataProvider ERROR! Error 73")
        log(_err)
        reject(_err)
      }
    })
  }

  /**
   * Create and return a dated journey
   */
  getDefaultJourney() {
    return this.addJourney()
  }

  ensureActiveJourney() {
    return new Promise((resolve, reject) => {
      try {
        let activeJourney = this.getActiveJourney()
        if (!activeJourney) {
          activeJourney = this.getDefaultJourney()
          this.setActiveJourney(activeJourney).then((response) => {
            resolve(response)
          })
        } else {
          resolve(activeJourney)
        }
      } catch (_err) {
        log("TreeDataProvider ERROR! Error 74")
        log(_err)
        reject(_err)
      }
    })
  }

  /**
   * Create a new file waypoint using the current file and line
   */
  createWaypoint(EditorOrWorkspace) {
    return new Promise((resolve, reject) => {
      const myEditor = TextEditor.isTextEditor(EditorOrWorkspace)
        ? EditorOrWorkspace
        : EditorOrWorkspace.activeTextEditor

      if (!myEditor || !myEditor.document || !myEditor.document.path) {
        log("TreeDataProvider ERROR! Error 75")
        reject("Please open a document to create a waypoint.")
      }

      this.ensureActiveJourney()
        .then((active) => {
          if (!active || !active.name) {
            log("TreeDataProvider ERROR! Error 76")
            log("Unable to assert active journey.")
            reject("Unable to assert active journey.")
          }

          getLineFromEditorSelected(myEditor)
            .then((payload) => {
              // console.log(JSON.stringify(payload))
              if (!payload || !payload.text || payload.number < 0) {
                const msg = nova.localize(
                  `${ext.prefixMessage()}.empty-line-error`
                )
                reject(msg)
              }

              const currentLine = payload.text
              const lineNumber = payload.number
              let currentFile = false

              const filename = nova.path.basename(myEditor.document.path)
              const filenameRelative = nova.workspace.relativizePath(
                myEditor.document.path
              )

              if (!filenameRelative || filenameRelative == "") {
                log("Unable to assert relative document path")
                reject("Unable to assert relative document path")
              }

              if (!active.children || !active.children.length) {
                active.children = []
              }

              let index = active.children.findIndex((i) => {
                return i && i.name && i.name === filenameRelative
              })

              if (index < 0) {
                currentFile = new WaypointItem({
                  name: filenameRelative,
                  path: filenameRelative,
                  uri: myEditor.document.uri,
                  line: false,
                  comment: "TODO",
                  children: [],
                })

                active.children.push(currentFile)
              } else {
                currentFile = active.children[index]
              }

              if (!currentFile || !currentFile.name) {
                const msg = nova.localize(
                  `${ext.prefixMessage()}.empty-file-name`
                )
                notify("save_file_waypoint_err", msg)
                reject("Unable to assert active file.")
              }

              let index2 = -1
              if (currentFile.children && currentFile.children.length) {
                try {
                  index2 = currentFile.children.findIndex(
                    (i) => i.line && i.line == lineNumber
                  )
                } catch (_err) {
                  reject(_err)
                }
              }

              if (index2 < 0) {
                let currentWaypoint = new WaypointItem({
                  name: `${currentLine}`,
                  path: filenameRelative,
                  uri: false,
                  line: lineNumber,
                  waypoint: true,
                  comment: "TODO2",
                })

                currentFile.addChild(currentWaypoint)

                this.eventHandler.emit("waypoint-created", {
                  waypoint: currentWaypoint,
                })

                resolve(currentWaypoint)
              } else {
                let del = currentFile
                let n = del.children[index2]

                delete del.children[index2] // Delete it for the toggle effect.

                this.eventHandler.emit("node-deleted", {
                  waypoint: n,
                })

                resolve(del)
              }
            })
            .catch((_err) => {
              log("TreeDataProvider ERROR! Error 77")
              log(_err)
              reject(_err)
            })
        })
        .catch((_err) => {
          log("TreeDataProvider ERROR! Error 78")
          log(_err)
          reject(_err)
        })
    })
  }
}
