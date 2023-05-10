CATALOG="my-catalog"

function main() {
  createNewCatalog
  cd $CATALOG
  npm install -D @eventcatalog/plugin-doc-generator-asyncapi
  removeDemoMaterials
}

function createNewCatalog() {
  npx @eventcatalog/create-eventcatalog@latest $CATALOG
}

function removeDemoMaterials() {
  rm -rf domains
  rm -rf events
  rm -rf services
}

# Start
main
exit