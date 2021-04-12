# Bugs

- 

# Improvements

- When a document is renamed, update the file
- When there are zero waypoints in a file, remove it from journey

# Features

## Add support for non-workspace usage

Instead of using .nova/waypoints.json, we could use the Application-Support folder for non-workspace usage.

- TODO 1 - watch for creation/deletion of a ./.nova folder

[File Watcher Documentation](https://docs.nova.app/api-reference/file-system/#watchpattern-callable)



## Open file in File Panel

Not currently supported by Nova API.

[Forum enquiry about File-Panel support](https://devforum.nova.app/t/showinfilepanel-instead-of-showinfinder/736)


## Show a mark/dot in editor gutter for lines with a waypoint.

This will make it easier to see waypoint overview at a glance.

[Form enquiry about Gutter-Decorators](https://devforum.nova.app/t/advice-on-outputting-marks-symbols-to-the-editor-gutter/729)