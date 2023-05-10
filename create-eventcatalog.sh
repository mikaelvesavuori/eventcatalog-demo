CATALOG="$1"

if [ -z $CATALOG ]
then
  echo "Missing catalog name!"
  exit 1
fi

npx @eventcatalog/create-eventcatalog@latest $CATALOG && cd $CATALOG
rm -rf domains && rm -rf events && rm -rf services