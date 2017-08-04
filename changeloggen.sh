echo "*** PLEASE MAKE SURE YOU HAVE RUN MAKETAG BEFORE**"
echo -n  "Enter new version:"
read newver
github_changelog_generator  -u hsccorp -p sensorcollect --future-release "$newver" --token 398b9e4b83d5a9969d56c180f18f940cb1a3b8a8
