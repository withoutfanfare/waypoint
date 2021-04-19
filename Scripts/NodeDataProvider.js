/**
 * Nova: Waypoint - WaypointDataProvider.js
 * @author DannyHarding
 */
const EXT = require("./lib/extension")
const { ViewItem } = require("./ViewItem.js")

module.exports.NodeDataProvider = class NodeDataProvider {
  constructor(config = {}) {
    this.config = config
    this.setRootItems(null)
  }

  getRootItems() {
    return this.rootItems
  }

  setRootItems(payload) {
    this.rootItems = payload
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
      console.log("ViewDataProvider ERROR! Error 53")
      console.log(_err)
      return false
    }
  }

  /**
   * Adds TreeItem
   * @param {element} element - data item
   */
  getTreeItem(element) {
    if (!element || !element.name) {
      return false
    }

    let item = new TreeItem(element.name)

    if (!item) {
      return false
    }

    item.descriptiveText = element.descriptiveText
    item.image = "__builtin.remove"

    // item.color = new Color(ColorFormat.rgb, [0, 0, 0, 1])
    if (element.tooltip && element.tooltip !== "") {
      item.tooltip = element.tooltip
      // item.image = "icon-chat"
    } else {
      if (element.comment && element.comment !== "") {
        item.tooltip = element.comment
      }
    }

    if (this.hasCommentLabel(element)) {
      // item.color = new Color(ColorFormat.rgb, [0.7, 0.5, 0.9, 1])
      item.command = `${EXT.prefixCommand()}.editcomment`
      item.image = "icon-chat"
    }

    item.contextValue = element.contextValue
    item.collapsibleState = TreeItemCollapsibleState.None
    return item
  }

  hasCommentLabel(element) {
    if (
      element.name == "Comment (rollover)" ||
      element.name == "Comment" ||
      element.contextValue == "comment"
    ) {
      return true
    }
    return false
  }

  initNode(element) {
    return new Promise((resolve, reject) => {
      try {
        this.node = element

        let lineNumber = this.node.line ? parseInt(this.node.line) : false
        let elementFilepath =
          this.node.path && this.node.path !== "" ? this.node.path : false
        let elementName =
          this.node.name && this.node.name !== "" ? this.node.name : false
        let elementComment =
          this.node.comment && this.node.comment !== ""
            ? this.node.comment
            : false
        let isJourney = !lineNumber && !elementFilepath ? true : false
        let isWaypoint = lineNumber > -1 && elementFilepath ? true : false
        let isFile = !lineNumber && elementFilepath ? true : false
        let elementCommentString = ""

        // for (const [key, value] of Object.entries(this.node)) {
        //   console.log(`${key}: ${value}`)
        // }

        let items = []
        let elementNameString = elementName.substr(0, 35)
        if (elementComment) {
          elementCommentString = elementComment
            ? elementComment.substr(0, 35)
            : ""
        }
        let showElip = ""
        if (
          elementCommentString &&
          elementComment.length > elementCommentString.length
        ) {
          showElip = "... (rollover)"
        }

        let nameLine = {
          identifier: `dtnl-${this.node.identifier}`,
          name: elementNameString,
          descriptiveText: "",
          children: [],
          tooltip: false,
          comment: false,
        }
        items.push(nameLine)

        if (isWaypoint && this.node.line) {
          let lineLine = {
            identifier: `dtll-${this.node.identifier}`,
            name: `${this.node.path}`,
            descriptiveText: `@ ${this.node.line}`,
            children: [],
            tooltip: false,
            comment: false,
          }
          items.push(lineLine)
        }

        // if (elementComment) {
        let commentLine = {
          identifier: `dtcl-${this.node.identifier}`,
          // name: "Comment (rollover)",
          name: elementCommentString || "Doubleclick to add comment",
          descriptiveText: showElip,
          children: [],
          tooltip: elementComment,
          // comment: elementComment,
          contextValue: "comment",
        }
        items.push(commentLine)
        // }

        this.setRootItems(items)
        resolve(this.getRootItems())
      } catch (_err) {
        reject(_err)
      }
    })
  }
}
