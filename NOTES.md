# Notes on use

It seems that requiring libraries into the config file will break when Next builds the project. A workaround seems to be placing a configuration copy that does not include the generator functionality and module imports into `.eventcatalog-core`.

Flow for devs:

- Devs push contracts/schemas to TripleCheck (?) during their CI
- CI triggers build in Cloudflare Pages (or similar)

Flow for EventCatalog:

- During the build phase, pull all contracts/schemas from TripleCheck (?)
- For each file
  - Dynamically add generators for each schema
- Generate, build, deploy

See https://github.com/boyney123/eventcatalog/pull/277
