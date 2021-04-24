# Waypoint

**Waypoint** extension provides **Lightweight Task Bookmarking** for [Nova](https://nova.app) code editor.

## Concept

Create Waypoints within the Files you work on, grouped by Journey.

```Journey(s) > File(s) > Waypoint(s)```

- Journey - Synonymous with Task
- File
- Waypoint - Synonymous with LineNumber

## Usage

When a Waypoint is Toggled, it is saved to the currently Active Journey within the SidePanel. 

If no Journey is active, then a new one will be created and activated with the current date.

### Command Palette

- **Waypoint:** Create Journey (```ctrl-opt-cmd-j```)
- **Waypoint:** Toggle Waypoint in Active Journey (```ctrl-opt-cmd-m```)
- **Waypoint:** Edit Comment for selected node (```ctrl-opt-cmd-c```)
- **Waypoint:** Select Journey (```ctrl-opt-cmd-;```)
- **Waypoint:** Select Waypoint in Active Journey/File (```ctrl-opt-cmd-'```)
- **Waypoint:** Previous Waypoint (```ctrl-opt-cmd-[```)
- **Waypoint:** Next Waypoint (```ctrl-opt-cmd-]```)

### Sidebar

In the Sidebar you can doubleclick on a Waypoint to open it in the editor, as well as deleting items at all three levels (Journey, File and Waypoint)

### Data Storage

Waypoints are saved to file in **.nova/waypoints.json**. 

Its up to you if you want to include this file in your GIT repository to share with team members.

## Configuration

To configure global preferences, open **Extensions → Extension Library...** then select Waypoint's **Preferences** tab.

You can also configure preferences on a per-project basis in ```Project → Project Settings```

## Limitations

- Because the extension uses text strings to create it's markers, it doesn't handle duplicate lines very well. I'm working on improving this.

## Future Improvements

I'm working on the following improvements/bugs:

- Improve Sidebar sorting with options
- Handle renamed files
- Export all Waypoints to markdown
- Better support for multiple Nova windows and document editors
- Improve "line realignent" mechanism
- Make console errors less dramatic/scarey!
- Better README for extension and more info on usage
- Automatic backup and recovery for Waypoint file
- More translations (english only atm)
- Handle bookmarking for duplicated lines (currently waypoints must be unique)
- Drag and drop Waypoints into other Journeys (Requires Nova API support)
- Better display of comments in sidebar (Requires Nova API support)
- Display waypoints in filepanel (Requires Nova API support)

## Issues

[Report Issues](https://github.com/withoutfanfare/waypoint/issues) here help me to improve the extension.

## Acknowledgements

I wouldn't have been able to get started without experimenting with code from their extensions. Thank you.

 - Martin Kopischke | [Nova Page](https://extensions.panic.com/extensions/net.kopischke/)
 - Jason Platts | [Nova Page](https://extensions.panic.com/extensions/jasonplatts/jasonplatts.TODO/)

