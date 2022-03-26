/**
 * @file Extension data not easily retrieved from the global `nova` object.
 * @version 1.1.0
 * @author Martin Kopischke <martin@kopischke.net>
 * @license MIT
 */

/**
 * Get the common prefix of all extension configuration items.
 * @returns {string} The prefix.
 */
exports.prefix = function () {
  return nova.extension.identifier.split(".").pop()
}

/**
 * Get the common prefix of extension preferences items.
 * @returns {string} The prefix.
 */
exports.prefixConfig = function () {
  return `${exports.prefix()}.conf`
}

/**
 * Get the common prefix of extension commands.
 * @returns {string} The prefix.
 */
exports.prefixCommand = function () {
  return `${exports.prefix()}.cmd`
}

/**
 * Get the common prefix of extension messages.
 * @returns {string} The prefix.
 */
exports.prefixMessage = function () {
  return `${exports.prefix()}.msg`
}

/**
 * Qualified path to the extension’s script directory.
 * @returns {string} The path.
 */
exports.scriptDir = function () {
  return nova.path.join(nova.extension.path, "Scripts")
}

/**
 * Qualified path to the extension’s script binaries’ directory.
 * @returns {string} The path.
 */
exports.binDir = function () {
  return nova.path.join(exports.scriptDir(), "bin")
}

/**
 * Qualified path to the extension’s script vendor directory.
 * @returns {string} The path.
 * @param {string} vendor - The vendor name.
 */
exports.vendorDir = function (vendor) {
  return nova.path.join(exports.scriptDir(), "vendor", vendor)
}

/**
 * Qualified path to the temporary storage path for the extension.
 * This function guarantees the path exists and is a writable directory.
 * @returns {string} The path to the temporary storage directory.
 * @throws {Error} When the path exists, but is not a writable directory.
 */
exports.tmpDir = function () {
  const store = nova.extension.workspaceStoragePath
  const tmp = nova.path.join(store, "tmp")
  if (!nova.fs.access(tmp, nova.fs.F_OK)) {
    nova.fs.mkdir(tmp)
    return tmp
  }

  if (!nova.fs.stat(tmp).isDirectory()) {
    throw new Error(`temporary path exists but is not a directory: ${tmp}`)
  }

  if (!nova.fs.access(tmp, nova.fs.W_OK)) {
    throw new Error(`temporary directory is not writable: ${tmp}`)
  }

  return tmp
}

/**
 * Qualified path to the temporary storage path for the extension.
 * This function guarantees the path exists and is a writable directory.
 * @returns {string} The path to the temporary storage directory.
 * @throws {Error} When the path exists, but is not a writable directory.
 */
exports.backupDir = function () {
  const store = nova.extension.workspaceStoragePath
  const bkp = nova.path.join(store, "backups")
  if (!nova.fs.access(bkp, nova.fs.F_OK)) {
    nova.fs.mkdir(bkp)
    return bkp
  }

  if (!nova.fs.stat(bkp).isDirectory()) {
    throw new Error(`backup path exists but is not a directory: ${bkp}`)
  }

  if (!nova.fs.access(bkp, nova.fs.W_OK)) {
    throw new Error(`backup directory is not writable: ${bkp}`)
  }

  return bkp
}
