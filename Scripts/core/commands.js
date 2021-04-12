/**
 *
 *
 *
 */
exports.testFunction = async function (argz) {
  try {
    console.info("testFunction")
    console.log(argz)
  } catch (_err) {
    console.log(_err)
  }
}

/**
 */
exports.anotherTestFunction = async function () {
  try {
    console.info("anotherTestFunction")
  } catch (_err) {
    console.log(_err)
  }
}
