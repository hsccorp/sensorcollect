echo -n  "Enter new version:"
read newver
github_changelog_generator  -u hsccorp -p sensorcollect --future-release "$newver" --token ${SENSORTOKEN}
