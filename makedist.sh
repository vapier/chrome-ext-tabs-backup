#!/bin/bash -e

json_value() {
  local key=$1
  python -c '
import json, os, sys
path, key = sys.argv[1:]
with open(path) as fp:
  data = json.load(fp)
print(data[key])
' "manifest.json" "${key}"
}

PN=$(json_value name | sed 's:[[:space:]/]:_:g' | tr '[:upper:]' '[:lower:]')
PV=$(json_value version)
P="${PN}-${PV}"

rm -rf "${P}"
mkdir "${P}"

cp -r *.css *.html *.js *.json *.png img "${P}"/
zip="${P}.zip"
rm -f "${zip}"
zip -r "${zip}" "${P}"
rm -rf "${P}"
du -b "${zip}"

echo "https://chrome.google.com/webstore/devconsole/g08715941841440123102/ojcidmfgknjffgginmfeakngnegjkaca/edit/package"
