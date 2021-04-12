exports.findValuesHelper = function findValuesHelper(obj, key, val, list) {
  if (!obj) {
    return list
  }

  if (obj instanceof Array) {
    for (var i in obj) {
      list = list.concat(exports.findValuesHelper(obj[i], key, val, []))
    }
  } else {
    if (obj[key] && obj[key] === val) {
      list.push(obj)
    }
  }

  if (typeof obj === "object" && obj !== null) {
    let children = Object.keys(obj)
    if (children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        if (obj[children[i]]) {
          if (
            typeof obj[children[i]] === "object" &&
            obj[children[i]] !== null &&
            obj[children[i]].length
          ) {
            list = list.concat(
              exports.findValuesHelper(obj[children[i]], key, val, [])
            )
          }
        }
      }
    }
  }
  return list
}

exports.findValues = function findValues(obj, key, val) {
  return exports.findValuesHelper(obj, key, val, [])
}

/**
 * Recursive convert to json
 * @param {node} node - tree item
 */
exports.itemToJson = function itemToJson(node) {
  if (!node) {
    return false
  }

  let newObj = {}
  for (let [k, v] of Object.entries(node)) {
    if (k !== "parent") {
      if (k == "children") {
        newObj.children = v
          .map((file) => {
            return exports.itemToJson(file)
          })
          .filter(Boolean)
      } else {
        newObj[k] = v
      }
    }
  }
  return newObj
}
