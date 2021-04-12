/**
 *
 * Nova: Waypoint - main.js
 * @author DannyHarding
 *
 * Big Acknowledgements to:
 * Martin Kopischke: <martin@kopischke.net>
 * Jason Platts:
 *
 */

const ext = require("./lib/extension")
const {
  log,
  getLocalConfig,
  notify,
  isWorkspace,
  isProject,
  findByAttributeRecursive,
} = require("./lib/utils")
const { findValues } = require("./lib/helper")

const {
  documentIsClosed,
  documentIsOpenInEditors,
  findDocumentByURI,
  getDocumentText,
  getLineFromRange,
} = require("./lib/document")

const StorageHandler = require("./StorageHandler.js")
const WorkspaceHandler = require("./WorkspaceHandler.js")
const { TreeDataProvider } = require("./TreeDataProvider.js")
const { defaultJson } = require("./lib/defaults")
const cmds = require("./core/commands")

const MARKER_FILENAME = "waypoints.json"

var treeView,
  dataProvider,
  myWorkspaceHandler,
  myStorageHandler,
  myEventHandler,
  activeJourney,
  stashedName = null

var isInitialised = false

var focusedWaypointIndex = 0
var sortBy = "file" // TODO - there is no sorting yet.

/**
 * Configuration keys.
 * @property {boolean} enabled - The Enable/Disable workspace option.
 */
const configKeys = {
  enabled: `${ext.prefixConfig()}.enabled`,
}

/**
 * Extension state.
 * @property {boolean} activationErrorHandled - Has an activation error been handled already?
 */
const state = {
  activationErrorHandled: false,
  initialisationErrorHandled: false,
  launchErrorHandled: false,
  loadErrorHandled: false,
  subscribeErrorHandled: false,
}

/**
 * Check for Nova Workspace
 */
ensureWorkspace = async function () {
  return new Promise((resolve, reject) => {
    /**
     * If not a project workspace, prevent further execution
     */
    // log("isWorkspace")
    // log(isWorkspace())
    // log(isProject())

    if (!isWorkspace()) {
      const msg = nova.localize(`${ext.prefixMessage()}.not-workspace-error`)
      reject(msg)
    } else if (!isProject()) {
      const msg = nova.localize(`${ext.prefixMessage()}.not-project-error`)
      reject(msg)
    } else {
      resolve(true)
    }
  })
}

/**
 * Check for .nova folder
 */
ensureProject = async function () {
  return new Promise((resolve, reject) => {
    if (!isProject()) {
      const msg = nova.localize(`${ext.prefixMessage()}.not-project-error`)
      reject(msg)
    } else {
      resolve(true)
    }
  })
}

/**
 * When the 'enabled' status is changed, initialise or deactivate the extension.
 */
function updateEnabled(newEnabledStatus, oldEnabledStatus) {
  if (getLocalConfig(configKeys.enabled)) {
    exports.initialise()
  } else {
    exports.deactivate()
  }
}

/**
 * Update the extension configuration.
 */
function updateConfig() {
  return new Promise((resolve, reject) => {
    try {
      const prefix = ext.prefixConfig()
      if (!nova.config.get(`${prefix}.updated.v0.0.1`)) {
        nova.config.set(`${prefix}.updated.v0.0.1`, true)
      }
      resolve(true)
    } catch (_err) {
      reject(_err)
    }
  })
}

/**
 * Add a Journey to the tree data and save to file.
 */
function addJourney(journeyName) {
  if (journeyName == undefined) {
    return false
  }

  try {
    dataProvider.addJourney(journeyName.trim())
    dataProvider
      .save()
      .then((payload) => {
        let jn = dataProvider.getActiveJourney()
        myEventHandler.emit("journey-added", {
          journey: jn,
        })

        exports.load().then((res) => {
          exports.launch()
        })
      })
      .catch((message) => {
        throw message
      })
  } catch (_err) {
    const msg = nova.localize(`${ext.prefixMessage()}.add-journey-error`)
    notify("journey_created_error", msg)
    log(_err)
  }
}

/**
 * Rename a Journey
 */
function renameJourney(journeyName) {
  if (!journeyName || journeyName == stashedName) {
    return false
  }
  dataProvider
    .renameJourney(journeyName, stashedName)
    .then((newName) => {
      save().then((res) => {
        myEventHandler.emit("save-complete")
      })
    })
    .catch((_err) => {
      const msg = nova.localize(`${ext.prefixMessage()}.rename-journey-error`)
      console.log(_err)
    })
}

function save() {
  return new Promise((resolve, reject) => {
    dataProvider
      .save()
      .then(() => {
        exports
          .load()
          .then((res) => {
            exports
              .launch()
              .then((res) => {
                return resolve(true)
              })
              .catch((_err) => {
                console.log(_err)
                reject(_err)
              })
          })
          .catch((_err) => {
            console.log(_err)
            reject(_err)
          })
      })
      .catch((_err) => {
        console.log(_err)
        reject(_err)
      })
  })
}

/**
 * When a file is saved, try to realign any waypoint file
 * numbers that have offset from the value we have stored.
 *
 * @param {object} textEditor - Nova textEditor object
 */
function handleOpenFileSave(textEditor) {
  // log("handleOpenFileSave")
  let fileNodes = findValues(
    dataProvider.rootItems,
    "name",
    nova.workspace.relativizePath(textEditor.document.path)
  )

  if (fileNodes && fileNodes.length) {
    let scanner = new Scanner(getDocumentText(textEditor))
    scanner.location = 0
    scanner.caseSensitive = false

    for (var i in fileNodes) {
      if (
        fileNodes[i] &&
        fileNodes[i].children &&
        fileNodes[i].children.length
      ) {
        let waypointNodes = fileNodes[i].children
        for (var ind in waypointNodes) {
          try {
            if (
              waypointNodes[ind] &&
              waypointNodes[ind].name &&
              waypointNodes[ind].line
            ) {
              scanner.location = 0

              let needle = waypointNodes[ind].name
              let currentLine = waypointNodes[ind].line
              let scanned = scanner.scanUpToString(needle)

              if (scanned) {
                let scannerLoc = scanner.location || 0
                let needleLength = needle.length || 0
                let endRange = scannerLoc + needleLength
                if (endRange > textEditor.length) {
                  endRange = textEditor.length
                }

                // NOTE: Nova API support is on the way for line numbers in future.
                let lineNumber = getLineFromRange(
                  textEditor,
                  new Range(0, endRange)
                )

                if (lineNumber && lineNumber !== currentLine) {
                  // console.log(`Line Number Adjusted:  ${lineNumber}`)
                  waypointNodes[ind].line = lineNumber
                  // TODO - highlight line in file gutter somehow
                }
              }
            }
          } catch (_err) {
            console.log(_err)
          }
        }
      }
    }

    save().then((res) => {
      myEventHandler.emit("save-complete")
    })
  }
}

function chooseJourney() {
  let journeys = dataProvider.getRootItems()
  const journeyArr = journeys.map((j) => {
    return j.name
  })

  const msg = nova.localize(`${ext.prefixMessage()}.select-journey`)
  nova.workspace.showChoicePalette(
    journeyArr,
    {
      placeholder: msg,
    },
    (sname, ind) => {
      dataProvider.setActiveJourney(sname)
      dataProvider.save().then(() => {
        exports.load().then((res) => {
          exports.launch()
        })
      })
    }
  )
}

function chooseFile(journey) {
  journey = journey || dataProvider.getActiveJourney()
  if (!journey) {
    return false
  }

  dataProvider.setActiveJourney(journey.name)

  let files = journey.children.map((file) => {
    return file.name
  })

  if (files && files.length) {
    const msg = nova.localize(`${ext.prefixMessage()}.select-file`)
    nova.workspace.showChoicePalette(
      files,
      {
        placeholder: msg,
      },
      chooseWaypoint
    )
  }
}

function chooseWaypoint(file, index) {
  let active = dataProvider.getActiveJourney()
  if (!active) {
    return false
  }

  let curFile = active.children[index]

  if (curFile && curFile.children && curFile.children.length) {
    waypoints = curFile.children.map((wp) => {
      return `@ ${wp.line} - ${wp.name}`
    })
  }

  if (waypoints && waypoints.length) {
    const msg = nova.localize(`${ext.prefixMessage()}.select-waypoint`)
    nova.workspace.showChoicePalette(
      waypoints,
      {
        placeholder: msg,
      },
      (wname, windex) => {
        if (windex > -1) {
          if (curFile.children[windex]) {
            myWorkspaceHandler.openWaypointFile([curFile.children[windex]])
          }
        }
      }
    )
  }
}

/**
 * Register the extension Commands.
 */
function registerCommands() {
  return new Promise((resolve, reject) => {
    try {
      const prefix = ext.prefixCommand()
      // nova.commands.register(
      //   `${prefix}.another-test-function`,
      //   cmds.anotherTestFunction
      // )

      // nova.commands.register(`${prefix}.test-function`, (_) => {
      //   cmds.testFunction(sortBy)
      // })

      // Local methods that need access to main scope.

      /**
       * Reload the data from file and refresh interface.
       */
      nova.commands.register(`${ext.prefixCommand()}.refresh`, () => {
        exports.load().then((res) => {
          exports.launch()
        })
      })

      /**
       * Open file to ActiveEditor at the marked line.
       */
      nova.commands.register(`${ext.prefixCommand()}.doubleClick`, () => {
        treeView.selection.forEach((obj) => {
          myWorkspaceHandler.openWaypointFile(treeView.selection)
        })
      })

      /**
       * Set a Journey as Active.
       */
      nova.commands.register(`${ext.prefixCommand()}.activateJourney`, () => {
        let sname = treeView.selection
          ? treeView.selection.map((e) => e.name)[0]
          : false

        try {
          if (sname) {
            dataProvider.setActiveJourney(sname)
            dataProvider.save().then(() => {
              exports.load().then((res) => {
                exports.launch()
              })
            })
          }
        } catch (_err) {
          console.log(_err)
        }
      })

      /**
       * Add new Journey
       */
      nova.commands.register(`${ext.prefixCommand()}.addJourney`, () => {
        const msg = nova.localize(`${ext.prefixMessage()}.enter-journey-name`)
        const msg2 = nova.localize(
          `${ext.prefixMessage()}.enter-journey-placeholder`
        )
        nova.workspace.showInputPalette(
          msg,
          {
            placeholder: msg2,
          },
          addJourney
        )
      })

      /**
       * Select a File and Waypoint
       */
      nova.commands.register(`${ext.prefixCommand()}.selectWaypoint`, () => {
        try {
          let active = dataProvider.getActiveJourney()
          chooseFile(active)
        } catch (_err) {
          console.log(_err)
        }
      })

      /**
       * Select Journey
       */
      nova.commands.register(`${ext.prefixCommand()}.selectJourney`, () => {
        chooseJourney()
      })

      /**
       * Rename Journey.
       */
      nova.commands.register(`${ext.prefixCommand()}.rename`, () => {
        if (treeView.selection) {
          const msg = nova.localize(`${ext.prefixMessage()}.new-journey-name`)
          const msg2 = nova.localize(`${ext.prefixMessage()}.new-journey-name`)
          stashedName = treeView.selection[0].name
          nova.workspace.showInputPalette(
            msg,
            {
              placeholder: msg2,
            },
            renameJourney
          )
        }
      })

      /**
       * Remove one or more waypoints at any depth.
       */
      nova.commands.register(`${ext.prefixCommand()}.remove`, () => {
        return new Promise((resolve, reject) => {
          const myActiveJourneyName = dataProvider.getActiveJourneyName()
          const deletables = treeView.selection.map((waypointObj) => {
            return waypointObj
          })

          dataProvider
            .removeWaypoints(deletables)
            .then((res) => {
              res.map((item) => {
                if (item == myActiveJourneyName) {
                  dataProvider.activeJourney = false
                }
              })
              save().then((res) => {
                myEventHandler.emit("save-complete")
              })
            })
            .catch((_err) => {
              console.log(_err)
            })
        })
      })

      /**
       * Create a new Waypoint based on the current file and line.
       */
      nova.commands.register(
        `${ext.prefixCommand()}.createWaypoint`,
        (workspace) => {
          dataProvider
            .createWaypoint(workspace)
            .then(() => {
              save()
                .then((res) => {
                  myEventHandler.emit("save-complete")
                })
                .catch((_err) => {
                  console.log(_err)
                })
            })
            .catch((_err) => {
              console.log(_err)
            })
        }
      )

      /**
       * Open previous Waypoint in editor
       */
      nova.commands.register(`${ext.prefixCommand()}.prevWaypoint`, () => {
        let flatIndexes = dataProvider.getWaypointIds()
        if (!flatIndexes || !flatIndexes.length) {
          return false
        }

        --focusedWaypointIndex

        if (focusedWaypointIndex < 0) {
          focusedWaypointIndex = flatIndexes.length - 1
        }

        if (flatIndexes[focusedWaypointIndex]) {
          let newWaypoint = findByAttributeRecursive(
            dataProvider.rootItems,
            flatIndexes[focusedWaypointIndex],
            "children",
            "identifier",
            false,
            []
          )

          if (newWaypoint) {
            myEventHandler.emit("waypoint-focused", newWaypoint)
          } else {
            focusedWaypointIndex = 0
          }
        }
      })

      /**
       * Open next Waypoint in editor
       */
      nova.commands.register(`${ext.prefixCommand()}.nextWaypoint`, () => {
        let flatIndexes = dataProvider.getWaypointIds()
        if (!flatIndexes || !flatIndexes.length) {
          return false
        }

        ++focusedWaypointIndex

        if (focusedWaypointIndex >= flatIndexes.length) {
          focusedWaypointIndex = 0
        }

        if (flatIndexes[focusedWaypointIndex]) {
          let newWaypoint = findByAttributeRecursive(
            dataProvider.rootItems,
            flatIndexes[focusedWaypointIndex],
            "children",
            "identifier",
            false,
            []
          )

          if (newWaypoint) {
            myEventHandler.emit("waypoint-focused", newWaypoint)
          } else {
            focusedWaypointIndex = 0
          }
        }
      })

      // treeView.onDidChangeSelection((selection) => {})
      // treeView.onDidExpandElement((element) => {})
      // treeView.onDidCollapseElement((element) => {})
      // treeView.onDidChangeVisibility(() => {})

      resolve(true)
    } catch (_err) {
      console.log(_err)
      reject(_err)
    }
  })
}

/**
 *
 */
function initialiseWorkspaceHandler() {
  return new Promise((resolve, reject) => {
    try {
      myWorkspaceHandler = new WorkspaceHandler()
      resolve(true)
    } catch (_err) {
      console.log(_err)
      reject(_err)
    }
  })
}

/**
 *
 */
function initialiseStorageHandler() {
  return new Promise((resolve, reject) => {
    try {
      myStorageHandler = new StorageHandler({
        filename: MARKER_FILENAME,
      })
      resolve(true)
    } catch (_err) {
      console.log(_err)
      reject(_err)
    }
  })
}

/**
 *
 */
function initialiseEmitHandler() {
  return new Promise((resolve, reject) => {
    try {
      myEventHandler = new Emitter()
      resolve(true)
    } catch (_err) {
      console.log(_err)
      reject(_err)
    }
  })
}

/**
 *
 */
function initialiseTreeDataProvider(storageHandler) {
  return new Promise((resolve, reject) => {
    try {
      dataProvider = new TreeDataProvider(storageHandler, myEventHandler)
      resolve(true)
    } catch (_err) {
      console.log(_err)
      reject(_err)
    }
  })
}

/**
 *
 */
function loadData(sortBy) {
  return new Promise((resolve, reject) => {
    try {
      dataProvider.loadData(sortBy).then((jsonResult) => {
        if (!jsonResult) {
          jsonResult = defaultJson
        }
        resolve(jsonResult)
      })
    } catch (_err) {
      console.log(_err)
      reject(_err)
    }
  })
}

/**
 *
 */
function initialiseEventListeners() {
  return new Promise((resolve, reject) => {
    try {
      myEventHandler.on("environment-initialised", function () {
        // log(`environment-initialised:`)
      })

      myEventHandler.on("data-loaded", function () {
        // log(`data-loaded:`)
      })

      myEventHandler.on("tree-initialised", function (args) {
        // if (args) {
        //   if (args.json) {
        //     log("Have json")
        //   }
        //   if (args.tree) {
        //     log("Have tree")
        //   }
        // }
      })

      myEventHandler.on("journey-added", function (payload) {
        // if (payload && payload.journey && payload.journey.identifier) {
        //   notify(
        //     "journey_created_" + payload.journey.identifier,
        //     `New Journey: ${payload.journey.name}`
        //   )
        // }
      })

      myEventHandler.on("waypoint-focused", function (payload) {
        if (payload && myWorkspaceHandler) {
          myWorkspaceHandler.openWaypointFile([payload])
        }
      })

      myEventHandler.on("save-complete", function (payload) {
        // log("save-complete")
      })

      resolve(true)
    } catch (_err) {
      reject(_err)
    }
  })
}

/**
 * Register configuration listeners.
 */
function registerConfigListeners() {
  return new Promise((resolve, reject) => {
    try {
      // nova.config.onDidChange(configKeys.enabled, updateEnabled, "enabled")
      nova.workspace.config.onDidChange(
        configKeys.enabled,
        updateEnabled,
        "enabled"
      )
      resolve(true)
    } catch (_err) {
      reject(_err)
    }
  })
}

/**
 * Register TextEditor listeners.
 * Because we piggyback on the Issue AssistantRegistry, but do not
 * actually use it, we do not fully participate in the teardown part
 * of its excellent event setup.
 */
function registerEditorListeners() {
  return new Promise((resolve, reject) => {
    try {
      nova.workspace.onDidAddTextEditor((added) => {
        exports.launch()
        added.onDidDestroy((destroyed) => {
          const doc = destroyed.document
          if (documentIsClosed(doc)) {
            setTimeout(() => {
              exports.launch()
            }, 400)
          } else {
            log("NOT documentIsClosed")
            // TODO - Martin documented this - investigate further.
            // a TextEditor containing the document is destroyed leaves the
            // collection for that document in the wrong state.
            // ...Can also happen when multiple Nova windows are open with same document.
            // documentIsOpenInEditors(doc)[0]
          }
        })

        added.onWillSave((willSave) => {
          const oldURI = willSave.document.uri
          const once = willSave.onDidSave((didSave) => {
            /**
             * Experimental - Realign waypoints.
             * Plenty to go wrong here with duplicate/ambiguous lines - more work needed.
             * TODO - make this a config setting.
             */
            handleOpenFileSave(didSave)

            const newURI = didSave.document.uri
            if (newURI !== oldURI) {
              // TODO - this is not being called when renaming in filepanel or finder?
              log("FILENAME CHANGED")
              dataProvider.updateFilename(newURI, oldURI).then((res) => {
                dataProvider.save().then(() => {
                  exports.load().then((res) => {
                    exports.launch()
                  })
                })
              })
              // TODO: Update filename in waypoints file.
              // if (!findDocumentByURI(oldURI)) {}
            }
            once.dispose()
          })
        })
      })

      resolve(true)
    } catch (_err) {
      reject(_err)
    }
  })
}

exports.activate = async function () {
  return Promise.all([updateConfig(), registerConfigListeners()])
    .then((promiseResults) => {
      if (!getLocalConfig(configKeys.enabled)) {
        if (nova.inDevMode) {
          log("Waypoint is disabled.")
        }
        return false
      } else {
        exports.initialise(promiseResults)
      }
    })
    .catch((_e) => {
      if (!state.activationErrorHandled) {
        myEventHandler.emit("activation-error", {
          message: _e,
        })

        if (!nova.inDevMode()) {
          const msg = nova.localize(`${ext.prefixMessage()}.activation-error`)
          // nova.workspace.showErrorMessage(msg)
          notify("activation_err", msg)
          state.activationErrorHandled = true
        }
      }

      if (nova.inDevMode()) {
        console.log("ACTIVATION ERROR!")
        console.log(_e)
      }

      reject(false)
    })
}

exports.initialise = async function () {
  return Promise.all([
    ensureWorkspace(),
    ensureProject(),
    initialiseWorkspaceHandler(),
    initialiseStorageHandler(),
    initialiseEmitHandler(),
    registerCommands(),
    registerEditorListeners(),
    initialiseEventListeners(),
    myStorageHandler.initWaypointFile(),
    initialiseTreeDataProvider(myStorageHandler),
  ])
    .then((promiseResults) => {
      myEventHandler.emit("environment-initialised")
      exports.load().then((res) => {
        exports.launch()
      })
    })
    .catch((_e) => {
      if (!state.initialisationErrorHandled) {
        myEventHandler.emit("initialisation-error", {
          message: _e,
        })

        if (!nova.inDevMode()) {
          const msg = nova.localize(
            `${ext.prefixMessage()}.initialisation-error`
          )
          // nova.workspace.showErrorMessage(msg)
          notify("initialisation_err", msg)
          state.initialisationErrorHandled = true
        }
      }

      if (nova.inDevMode()) {
        console.log("INITIALISATION ERROR!")
        console.log(_e)
      }
    })
}

exports.load = async function () {
  return new Promise((resolve, reject) => {
    loadData(sortBy)
      .then((json) => {
        myEventHandler.emit("data-loaded")
        dataProvider.initData(json).then((jsonResult) => {
          resolve(jsonResult)
        })
      })
      .catch((_e) => {
        if (!state.loadErrorHandled) {
          myEventHandler.emit("load-error", {
            message: _e,
          })

          if (!nova.inDevMode()) {
            const msg = nova.localize(`${ext.prefixMessage()}.load-error`)
            // nova.workspace.showErrorMessage(msg)
            notify("load_err", msg)
            state.loadErrorHandled = true
          }
        }

        if (nova.inDevMode()) {
          console.log("LOAD ERROR!")
          console.log(_e)
        }

        reject(false)
      })
  })
}

exports.launch = async function () {
  return new Promise((resolve, reject) => {
    let json = dataProvider.getJson()
    dataProvider
      .extractStoredFiles(json)
      .then((filesInStorageFile) => {
        dataProvider.setStoredFiles(filesInStorageFile)
        dataProvider.getOpenEditorFiles().then((storeFilesThatAreOpen) => {
          dataProvider.setOpenStoredFiles(storeFilesThatAreOpen)
          exports.subscribe().then((tree) => {
            let subscribeData = {
              // json: json,
              // tree: tree,
            }
            myEventHandler.emit("tree-initialised", subscribeData)
            resolve(json)
          })
        })
      })
      .catch((_e) => {
        if (!state.launchErrorHandled) {
          myEventHandler.emit("launch-error", {
            message: _e,
          })

          if (!nova.inDevMode()) {
            const msg = nova.localize(`${ext.prefixMessage()}.launch-error`)
            // nova.workspace.showErrorMessage(msg)
            notify("launch_err", msg)
            state.launchErrorHandled = true
          }
        }

        if (nova.inDevMode()) {
          console.log("LAUNCH ERROR!")
          console.log(_e)
        }

        reject(false)
      })
  })
}

exports.subscribe = async function () {
  return new Promise((resolve, reject) => {
    try {
      treeView = new TreeView("waypoint", {
        dataProvider: dataProvider,
      })
      nova.subscriptions.add(treeView)
      resolve(treeView)
    } catch (_e) {
      console.log("SUBSCRIBE ERROR!")
      console.log(_e)

      if (!state.subscribeErrorHandled) {
        myEventHandler.emit("subscribe-error", {
          message: _e,
        })

        if (!nova.inDevMode()) {
          const msg = nova.localize(`${ext.prefixMessage()}.subscribe-error`)
          // nova.workspace.showErrorMessage(msg)
          notify("subscribe_err", msg)
          state.subscribeErrorHandled = true
        }
      }

      if (nova.inDevMode()) {
        log("SUBSCRIBE ERROR!")
        console.log(_e)
      }

      reject(_e)
    }
  })
}

exports.deactivate = function () {
  treeView = null
  dataProvider = null
}
