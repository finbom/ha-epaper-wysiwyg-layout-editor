#!/usr/bin/env sh
echo "Starting E-Paper WYSIWYG web server"
cd /web
python3 -m http.server 8080
