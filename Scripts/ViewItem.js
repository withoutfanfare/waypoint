/**
 * Nova: Waypoint - WaypointItem.js
 * @author DannyHarding
 */
const { getId } = require("./lib/utils")

module.exports.ViewItem = class ViewItem {
  constructor(item) {
    this.identifier = item.identifier || getId()

    const dateStr = new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/-/g, "/")
      .replace("T", " ")

    this.name = item.name || dateStr

    this.path = item.path || false
    this.line = item.line || false
    this.updatedAt = item.updated_at || Date.now()
    this.comment = null
    this.children = []
    this.parent = null

    return this
  }

  addChild(element) {
    element.parent = this
    if (element.parent.path) {
      element.path = element.parent.path
    }
    this.children.push(element)
  }
}
