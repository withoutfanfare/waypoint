/**
 * Nova: Waypoint - lib/base.js
 * @author DannyHarding
 */

exports.json = function () {
  return {
    activeJourney: false,
    journeys: [],
  }
}

exports.state = function () {
  return {
    activated: false,
    initialised: false,
    launched: false,
    loaded: false,
    subscribed: false,
    activationErrorHandled: false,
    initialisationErrorHandled: false,
    launchErrorHandled: false,
    loadErrorHandled: false,
    subscribeErrorHandled: false,
  }
}

exports.markerFilename = function () {
  return "waypoints.json"
}

exports.sortBy = function () {
  return "file"
}
