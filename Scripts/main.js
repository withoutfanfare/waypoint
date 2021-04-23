"use strict"
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

const EXT = require("./lib/extension")
const BASE = require("./lib/base")
const CMDS = require("./core/commands")
const { findValues } = require("./lib/helper")

const {
  log,
  getLocalConfig,
  notify,
  isWorkspace,
  findByAttributeRecursive,
  ensureNovaFolderExists,
  ensureWorkspace,
  debounce,
} = require("./lib/utils")

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
const { NodeDataProvider } = require("./NodeDataProvider.js")

let treeView,
  dataProvider,
  nodeView,
  nodeDataProvider,
  myWorkspaceHandler,
  myStorageHandler,
  myEventHandler,
  activeJourney,
  viewedNode,
  stashedName = null

/**
 * Carousel index for waypoints.
 * @property {number}
 */
let focusedWaypointIndex = 0

/**
 * Timer for launch method.
 * @property {number}
 */
let launchTimeout = 0

/**
 * Configuration keys.
 * @property {object}
 */
const CONFIGKEYS = {
  enabled: `${EXT.prefixConfig()}.enabled`,
}

/**
 * Extension state.
 * @property {object}
 */
let state = Object.assign({}, BASE.state())

/**
 * Default json structure.
 * @property {object}
 */
const defaultJson = Object.assign({}, BASE.json())

/**
 * Sorting.
 * @property {string}
 */
const defaultSortBy = BASE.sortBy()

/**
 * Marker file.
 * @property {string}
 */
const defaultMarkerFilename = BASE.markerFilename()

function valdiateRequiredObjects() {
  if(!dataProvider) { return false; }
  if(!nodeDataProvider) { return false; }
  if(!myEventHandler) { return false; }
  if(!treeView) { return false; }
  if(!nodeView) { return false; }
  if(!myWorkspaceHandler) { return false; }
  if(!myStorageHandler) { return false; }
  
  return true
}

/**
 * Initialise WorkspaceHandler.
 */
function initialiseWorkspaceHandler() {
  return new Promise((resolve, reject) => {
    try {
      myWorkspaceHandler = new WorkspaceHandler()
      resolve(true)
    } catch (_err) {
      log("Error 3")
      log(_err)
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
        filename: defaultMarkerFilename,
      })
      resolve(true)
    } catch (_err) {
      log("Error 4")
      log(_err)
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
      log("Error 5")
      log(_err)
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
      log("Error 6")
      log(_err)
      reject(_err)
    }
  })
}

/**
 *
 */
function initialiseNodeDataProvider() {
  return new Promise((resolve, reject) => {
    try {
      nodeDataProvider = new NodeDataProvider({})
      resolve(true)
    } catch (_err) {
      log("Error 6.1")
      log(_err)
      reject(_err)
    }
  })
}

/**
 * Register the extension Commands.
 */
function registerCommands() {
  
  // if(!valdiateRequiredObjects()) {
  //   return false
  // }
  
  return new Promise((resolve, reject) => {
    try {
      const prefix = EXT.prefixCommand()

      /**
       * Reload the data from file and refresh interface.
       */
      nova.commands.register(`${EXT.prefixCommand()}.refresh`, () => {
        if(!valdiateRequiredObjects()) {
          return false
        }
        
        exports.load().then((res) => {
          myEventHandler.emit("request-launch")
        })
      })

      /**
       * Open file to ActiveEditor at the marked line.
       */
      nova.commands.register(`${EXT.prefixCommand()}.doubleClick`, () => {
        if(!valdiateRequiredObjects()) {
          return false
        }
        
        treeView.selection.forEach((obj) => {
          myWorkspaceHandler.openWaypointFile(treeView.selection)
        })
      })

      /**
       * Set a Journey as Active.
       */
      nova.commands.register(`${EXT.prefixCommand()}.activateJourney`, () => {
        if(!valdiateRequiredObjects()) {
          return false
        }
        
        let sname = treeView.selection
          ? treeView.selection.map((e) => e.name)[0]
          : false

        try {
          if (sname) {
            dataProvider.setActiveJourney(sname).then((res) => {
              save()
            })
          }
        } catch (_err) {
          log("Error 19")
          log(_err)
        }
      })

      /**
       * Add new Journey
       */
      nova.commands.register(`${EXT.prefixCommand()}.addJourney`, () => {
        if(!valdiateRequiredObjects()) {
          return false
        }
        
        const msg = nova.localize(`${EXT.prefixMessage()}.enter-journey-name`)
        const msg2 = nova.localize(
          `${EXT.prefixMessage()}.enter-journey-placeholder`
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
      nova.commands.register(`${EXT.prefixCommand()}.selectWaypoint`, () => {
        if(!valdiateRequiredObjects()) {
          return false
        }
        
        try {
          let active = dataProvider.getActiveJourney()
          myEventHandler.emit("init-node-view", active)
          chooseFile(active)
        } catch (_err) {
          log("Error 20")
          log(_err)
          return false
        }
      })

      /**
       * Select Journey
       */
      nova.commands.register(`${EXT.prefixCommand()}.selectJourney`, () => {
        if(!valdiateRequiredObjects()) {
          return false
        }
        
        chooseJourney()
      })

      /**
       * Rename Journey.
       */
      nova.commands.register(`${EXT.prefixCommand()}.rename`, () => {
        if(!valdiateRequiredObjects()) {
          return false
        }
        
        if (treeView.selection) {
          const msg = nova.localize(`${EXT.prefixMessage()}.new-journey-name`)
          const msg2 = nova.localize(
            `${EXT.prefixMessage()}.new-journey-placeholder`
          )
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
       * Rename Journey.
       */
      nova.commands.register(`${EXT.prefixCommand()}.editcomment`, () => {
        if(!valdiateRequiredObjects()) {
          return false
        }
        
        editComment()
      })

      /**
       * Remove one or more waypoints at any depth.
       */
      nova.commands.register(`${EXT.prefixCommand()}.remove`, () => {
        if(!valdiateRequiredObjects()) {
          return false
        }
        
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
              log("Error 21")
              log(_err)
            })
        })
      })

      /**
       * Create a new Waypoint based on the current file and line.
       */
      nova.commands.register(
        `${EXT.prefixCommand()}.createWaypoint`,
        (workspace) => {
          
          if(!valdiateRequiredObjects()) {
            return false
          }
          
          dataProvider
            .createWaypoint(workspace)
            .then((active) => {
              if (active) {
                myEventHandler.emit("init-node-view", active)
              }
              save()
                .then((res) => {
                  myEventHandler.emit("save-complete")
                })
                .catch((_err) => {
                  log("Error 22")
                  log(_err)
                })
            })
            .catch((_err) => {
              log("Error 23")
              notify("create_waypoint_error", _err)
              return false
            })
        }
      )

      /**
       * Open previous Waypoint in editor
       */
      nova.commands.register(`${EXT.prefixCommand()}.prevWaypoint`, () => {
        if(!valdiateRequiredObjects()) {
          return false
        }
        
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
      nova.commands.register(`${EXT.prefixCommand()}.nextWaypoint`, () => {
        if(!valdiateRequiredObjects()) {
          return false
        }
        
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

      resolve(true)
    } catch (_err) {
      log("Error 24")
      log(_err)
      reject(_err)
    }
  })
}

/**
 * When a file is saved, try to realign any waypoint file
 * numbers that have offset from the value we have stored.
 *
 * @param {object} textEditor - Nova textEditor object
 */
function handleOpenFileSave(textEditor) {
  let roots =
    dataProvider && dataProvider.rootItems ? dataProvider.rootItems : []

  if (!roots || !roots.length) {
    return false
  }

  let fileNodes = findValues(
    roots,
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

              // TODO: is this unique? If not, bail...

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
                  // log(`Line Number Adjusted:  ${lineNumber}`)
                  waypointNodes[ind].line = lineNumber
                  // TODO - highlight line in file gutter somehow
                }
              }
            }
          } catch (_err) {
            log("Error 14")
            log(_err)
          }
        }
      }
    }

    save()
      .then((res) => {
        myEventHandler.emit("save-complete")
      })
      .catch((_err) => {
        log("Error 15")
        log(_err)
      })
  }
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
        myEventHandler.emit("request-launch")
        added.onDidDestroy((destroyed) => {
          const doc = destroyed.document
          if (documentIsClosed(doc)) {
            myEventHandler.emit("request-launch")
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
              // dataProvider.updateFilename(newURI, oldURI).then((res) => {
              //   dataProvider.save().then(() => {
              //     exports.load().then((res) => {
              //       exports.launch()
              //     })
              //   })
              // })
              // TODO: Update filename in waypoints file.
              // if (!findDocumentByURI(oldURI)) {}
            }
            once.dispose()
          })
        })
      })

      resolve(true)
    } catch (_err) {
      log("Error 25")
      log(_err)
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
      // myEventHandler.on("environment-initialised", function () {
      //   // log(`environment-initialised:`)
      // })

      // myEventHandler.on("data-loaded", function (json) {
      //   // log(`data-loaded:`)
      //   // log(JSON.stringify(json))
      // })

      // myEventHandler.on("tree-initialised", function (args) {
      //   // log(`tree-initialised:`)
      //   // if (args) {
      //   //   if (args.json) {
      //   //     log("Have json")
      //   //   }
      //   //   if (args.tree) {
      //   //     log("Have tree")
      //   //   }
      //   // }
      // })

      myEventHandler.on("journey-added", function (payload) {
        if (payload && payload.journey && payload.journey.identifier) {
          notify(
            "journey_created_" + payload.journey.identifier,
            `New Journey: ${payload.journey.name}`
          )
        }
      })

      myEventHandler.on("waypoint-focused", function (payload) {
        if (payload && myWorkspaceHandler) {
          myEventHandler.emit("init-node-view", payload)
          myWorkspaceHandler.openWaypointFile([payload])
        }
      })

      myEventHandler.on("init-node-view", function (payload) {
        if (payload && payload.identifier && nodeDataProvider) {
          viewedNode = payload
          nodeDataProvider.initNode(payload).then((res) => {
            nodeView.reload()
          })
        }
      })

      // myEventHandler.on("save-complete", function (payload) {})
      myEventHandler.on("request-launch", function (payload) {
        clearTimeout(launchTimeout)
        launchTimeout = setTimeout(exports.launch, 200)
      })

      // TODO: If user deletes their .nova folder, then destroy the in memory tree data.
      // myEventHandler.on("reset-data", function (payload) {
      //   log("reset-data")
      // })

      resolve(true)
    } catch (_err) {
      log("Error 26")
      log(_err)
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
      if (!dataProvider) {
        log("Error 28")
        log("Missing dataProvider")
        reject(false)
      }

      dataProvider
        .loadData(sortBy)
        .catch((_err) => {
          log("Error 29 - OK, recover with default json.")
          log(_err)
          return defaultJson
        })
        .then((jsonResult) => {
          resolve(jsonResult)
        })
    } catch (_err) {
      log("Error 30")
      log(_err)
      reject(_err)
    }
  })
}

function chooseJourney() {
  let journeys = dataProvider.getRootItems()
  const journeyArr = journeys.map((j) => {
    return j.name
  })

  const msg = nova.localize(`${EXT.prefixMessage()}.select-journey`)
  nova.workspace.showChoicePalette(
    journeyArr,
    {
      placeholder: msg,
    },
    (sname, ind) => {
      dataProvider.setActiveJourney(sname).then((res) => {
        myEventHandler.emit("init-node-view", res)
        save().catch((_err) => {
          log("Error 16")
          log(_err)
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

  dataProvider.setActiveJourney(journey.name).then((res) => {
    myEventHandler.emit("init-node-view", res)
    let files = journey.children.map((file) => {
      return file.name
    })

    if (files && files.length) {
      const msg = nova.localize(`${EXT.prefixMessage()}.select-file`)
      nova.workspace.showChoicePalette(
        files,
        {
          placeholder: msg,
        },
        chooseWaypoint
      )
    }
  })
}

function chooseWaypoint(file, index) {
  let active = dataProvider.getActiveJourney()
  if (!active) {
    return false
  }

  let waypoints = []
  let curFile = active.children[index]

  if (curFile && curFile.children && curFile.children.length) {
    waypoints = curFile.children.map((wp) => {
      return `@ ${wp.line} - ${wp.name}`
    })
  }

  if (waypoints && waypoints.length) {
    const msg = nova.localize(`${EXT.prefixMessage()}.select-waypoint`)
    nova.workspace.showChoicePalette(
      waypoints,
      {
        placeholder: msg,
      },
      (wname, windex) => {
        if (windex > -1) {
          if (curFile.children[windex]) {
            myEventHandler.emit("init-node-view", curFile.children[windex])
            myWorkspaceHandler.openWaypointFile([curFile.children[windex]])
          }
        }
      }
    )
  }
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
    save()
      .then((payload) => {
        let jn = dataProvider.getActiveJourney()
        myEventHandler.emit("init-node-view", jn)
        myEventHandler.emit("journey-added", {
          journey: jn,
        })
      })
      .catch((_err) => {
        log("Error 7")
        log(_err)
        throw _err
      })
  } catch (_err) {
    log("Error 9")
    log(_err)
    const msg = nova.localize(`${EXT.prefixMessage()}.add-journey-error`)
    notify("journey_created_error", msg)
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
      log("Error 10")
      log(_err)
      const msg = nova.localize(`${EXT.prefixMessage()}.rename-journey-error`)
      notify("rename_journey-error", msg)
    })
}

/**
 * Comment
 */
function editComment() {
  let item = false
  if (treeView.selection && treeView.selection[0]) {
    item = treeView.selection[0]
  }

  if (!item || !item.identifier) {
    item = dataProvider.getActiveJourney() || false
  }

  if (!item || !item.identifier) {
    const emsg = nova.localize(
      `${EXT.prefixMessage()}.edit-comment-missing-node`
    )
    notify("edit_missing_subject_error", emsg)
    return false
  }

  const stashedComment = item.comment
  let elementNameString = item.name.substr(0, 25)

  const msg = nova.localize(`${EXT.prefixMessage()}.edit-comment-prompt`)
  const msg2 = nova.localize(`${EXT.prefixMessage()}.edit-comment-placeholder`)
  const msg3 = nova.localize(`${EXT.prefixMessage()}.edit-comment-button`)

  nova.workspace.showInputPalette(
    `${msg} on '${elementNameString}'`,
    {
      prompt: msg3,
      placeholder: msg2,
      value: stashedComment || "",
    },
    (payload) => {
      if (payload == undefined) {
        return false
      }

      if (payload == stashedComment) {
        return false
      }

      item.comment = payload
      save().then((res) => {
        //
      })
    }
  )
}

function save() {
  return new Promise((resolve, reject) => {
    ensureNovaFolderExists()
      .then(myStorageHandler.initWaypointFile())
      .then((res) => {
        dataProvider
          .save()
          .then((saved) => {
            exports
              .load()
              .then((res) => {
                exports
                  .launch()
                  .then((res) => {
                    resolve(true)
                  })
                  .catch((_err) => {
                    log("Error 13")
                    log(_err)
                    reject(_err)
                  })
              })
              .catch((_err) => {
                log("Error 12")
                log(_err)
                reject(_err)
              })
          })
          .catch((_err) => {
            log("Error 11")
            log(_err)
            reject(_err)
          })
      })
  })
}

/**
 * This allows us to set up listeners that respond to the most basic events including
 * the enable/disable config setting change.
 *
 * @returns {Promise}  - description
 */
exports.activate = async function () {
  return Promise.all([
    CMDS.updateConfig(EXT.prefixConfig()),
    CMDS.registerConfigListeners(CONFIGKEYS),
  ])
    .then(() => {
      if (!getLocalConfig(CONFIGKEYS.enabled)) {
        if (nova.inDevMode()) {
          log("Waypoint is disabled.")
        }
        return false
      } else {
        state.activated = true
        exports.initialise()
      }
    })
    .catch((_e) => {
      state.activated = false

      if (nova.inDevMode()) {
        log("ACTIVATION ERROR! Error 31")
        log(_e)
      }

      if (!state.activationErrorHandled) {
        myEventHandler.emit("activation-error", {
          message: _e,
        })

        if (!nova.inDevMode()) {
          const msg = nova.localize(`${EXT.prefixMessage()}.activation-error`)
          notify("activation_err", msg)
          state.activationErrorHandled = true
        }
      }

      reject(false)
    })
}

/**
 * summary
 * @returns {Promise}  - description
 */
exports.initialise = async function () {
  return Promise.all([
    ensureWorkspace(),
    initialiseWorkspaceHandler(),
    initialiseStorageHandler(),
    initialiseEmitHandler(),
    registerCommands(),
    registerEditorListeners(),
    initialiseEventListeners(),
    initialiseNodeDataProvider(),
  ])
    .then(() => {
      if (!state.initialised) {
        initialiseTreeDataProvider(myStorageHandler)
          .then((res) => {
            state.initialised = true
            myEventHandler.emit("environment-initialised")
          })
          .then((res) => {
            exports.load().then((json) => {
              myEventHandler.emit("request-launch")
            })
          })
      }
    })
    .catch((_e) => {
      state.initialised = false
      if (nova.inDevMode()) {
        // log("INITIALISATION ERROR! Error 32")
        log(_e)
      }
      if (!state.initialisationErrorHandled) {
        myEventHandler.emit("initialisation-error", {
          message: _e,
        })

        if (!nova.inDevMode()) {
          notify(
            "initialisation_err",
            nova.localize(`${EXT.prefixMessage()}.initialisation-error`)
          )
          state.initialisationErrorHandled = true
        }
      }
    })
}

exports.load = async function () {
  if (!state.initialised) {
    return false
  }
  return new Promise((resolve, reject) => {
    loadData(defaultSortBy)
      .then((json) => {
        myEventHandler.emit("data-loaded", json)
        dataProvider.initData(json).then((jsonResult) => {
          state.loaded = true
          resolve(json)
        })
      })
      .catch((_e) => {
        state.loaded = false
        if (nova.inDevMode()) {
          // log("LOAD ERROR! Error 33")
          log(_e)
        }

        if (!state.loadErrorHandled) {
          myEventHandler.emit("load-error", {
            message: _e,
          })

          if (!nova.inDevMode()) {
            notify(
              "load_err",
              nova.localize(`${EXT.prefixMessage()}.load-error`)
            )
            state.loadErrorHandled = true
          }
        }

        reject(false)
      })
  })
}

/**
 * summary
 * @returns {Promise}  - description
 */
exports.launch = function () {
  if (!state.loaded) {
    return false
  }
  // TODO debounce this so it calls less.
  return new Promise((resolve, reject) => {
    const json = dataProvider.getJson()

    if (viewedNode) {
      let item = findByAttributeRecursive(
        json.journeys,
        viewedNode.identifier,
        "children",
        "identifier",
        false,
        []
      )
      // Reload the detail node.
      if (item && item.identifier) {
        myEventHandler.emit("init-node-view", item)
      }
    }

    dataProvider
      .extractStoredFiles(json)
      .then((filesInStorageFile) => {
        dataProvider.setStoredFiles(filesInStorageFile)
        dataProvider.getOpenEditorFiles().then((storeFilesThatAreOpen) => {
          dataProvider.setOpenStoredFiles(storeFilesThatAreOpen)

          state.launched = true
          if (!state.subscribed) {
            exports
              .subscribe()
              .then((tree) => {
                let subscribeData = {
                  // json: json,
                  // tree: tree,
                }
                myEventHandler.emit("tree-initialised", subscribeData)
                resolve(json)
              })
              .catch((_err) => {
                log("Error 34")
                log(_err)
              })
          } else {
            // TODO: Target the exact node to improve performance.
            treeView.reload()
            nodeView.reload()
            resolve(true)
          }
        })
      })
      .catch((_e) => {
        state.launched = false

        if (nova.inDevMode()) {
          // log("LAUNCH ERROR! Error 35")
          log(_e)
        }

        if (!state.launchErrorHandled) {
          myEventHandler.emit("launch-error", {
            message: _e,
          })

          if (!nova.inDevMode()) {
            notify(
              "launch_err",
              nova.localize(`${EXT.prefixMessage()}.launch-error`)
            )
            state.launchErrorHandled = true
          }
        }

        reject(false)
      })
  })
}

exports.subscribe = async function () {
  return new Promise((resolve, reject) => {
    try {
      if (state.subscribed) {
        treeView.reload()
        nodeView.reload()
        resolve(treeView)
      } else {
        treeView = new TreeView("waypoint", {
          dataProvider: dataProvider,
        })
        nova.subscriptions.add(treeView)
        treeView.reload()
        state.subscribed = true

        nodeView = new TreeView("viewer", {
          dataProvider: nodeDataProvider,
        })
        nova.subscriptions.add(nodeView)
        nodeView.reload()

        // nodeView.onDidChangeSelection((selection) => {
        //   console.log("New selection: " + selection.map((e) => e.name))
        // })

        treeView.onDidChangeSelection((selection) => {
          if (selection && selection[0]) {
            myEventHandler.emit("init-node-view", selection[0])
          }
        })

        // treeView.onDidExpandElement((element) => {
        //   console.log("Expanded: " + element.name)
        // })

        // treeView.onDidCollapseElement((element) => {
        //   console.log("Collapsed: " + element.name)
        // })

        // TODO: When/if does this actually trigger?
        // treeView.onDidChangeVisibility(() => {
        //   console.log("Visibility Changed")
        //   treeView.reload()
        // })

        resolve(treeView)
      }
    } catch (_e) {
      state.subscribed = false
      // log("SUBSCRIBE ERROR! Error 36")
      log(_e)

      if (!state.subscribeErrorHandled) {
        myEventHandler.emit("subscribe-error", {
          message: _e,
        })

        if (!nova.inDevMode()) {
          const msg = nova.localize(`${EXT.prefixMessage()}.subscribe-error`)
          // nova.workspace.showErrorMessage(msg)
          notify("subscribe_err", msg)
          state.subscribeErrorHandled = true
        }
      }

      reject(_e)
    }
  })
}

exports.deactivate = function () {
  treeView = null
  nodeView = null
  dataProvider = null
  nodeDataProvider = null
}
