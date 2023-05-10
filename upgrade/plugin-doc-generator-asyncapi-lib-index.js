"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const parser_1 = require("@asyncapi/parser");
const fs_extra_1 = __importDefault(require("fs-extra"));
const utils_1 = __importDefault(require("@eventcatalog/utils"));
const getServiceFromAsyncDoc = (doc) => ({
    name: doc.info().title(),
    summary: doc.info().description() || '',
});
const getAllEventsFromAsyncDoc = (doc, options) => {
    const { externalAsyncAPIUrl } = options;
    const channels = doc.channels();
    return Object.keys(channels).reduce((data, channelName) => {
        let desc, url;
        if (doc.hasExternalDocs()) desc = doc.externalDocs().description();
        if (doc.hasExternalDocs()) url = doc.externalDocs().url();
        const domain = doc.info().extension('x-domain') || '';
        const system = doc.info().extension('x-system') || '';
        const _service = doc.info().extension('x-service') || '';
        const contactName = doc.info().contact().name();
        const contactUrl = doc.info().contact().url();
        const contactEmail = doc.info().contact().email();
        const service = doc.info().title();
        const channel = channels[channelName];
        const operation = channel.hasSubscribe() ? 'subscribe' : 'publish';
        const messages = channel[operation]().messages();
        const eventsFromMessages = messages.map((message) => {
            const messageName = message.name() || message.extension('x-parser-message-name');
            const schema = message.originalPayload();
            const externalLink = {
                label: `View event in AsyncAPI`,
                url: `${externalAsyncAPIUrl}#message-${messageName}`,
            };
            return {
                name: messageName,
                summary: message.summary(),
                version: doc.info().version(),
                producers: operation === 'subscribe' ? [service] : [],
                consumers: operation === 'publish' ? [service] : [],
                externalLinks: externalAsyncAPIUrl ? [externalLink] : [],
                schema: schema ? JSON.stringify(schema, null, 2) : '',
                owners: contactName ? [contactName] : []
            };
        });
        return data.concat(eventsFromMessages);
    }, []);
};
const parseAsyncAPIFile = async (pathToFile, options, copyFrontMatter) => {
    const { versionEvents = true, renderMermaidDiagram = true, renderNodeGraph = false } = options;
    let asyncAPIFile;
    try {
        asyncAPIFile = fs_extra_1.default.readFileSync(pathToFile, 'utf-8');
    }
    catch (error) {
        console.error(error);
        throw new Error(`Failed to read file with provided path`);
    }
    const doc = await (0, parser_1.parse)(asyncAPIFile);
    const service = getServiceFromAsyncDoc(doc);
    const events = getAllEventsFromAsyncDoc(doc, options);
    if (!process.env.PROJECT_DIR) {
        throw new Error('Please provide catalog url (env variable PROJECT_DIR)');
    }
    const { writeServiceToCatalog, writeEventToCatalog } = (0, utils_1.default)({ catalogDirectory: process.env.PROJECT_DIR });
    await writeServiceToCatalog(service, {
        useMarkdownContentFromExistingService: true,
        renderMermaidDiagram,
        renderNodeGraph,
    });
    const eventFiles = events.map(async (event) => {
        const { schema, ...eventData } = event;
        await writeEventToCatalog(eventData, {
            useMarkdownContentFromExistingEvent: true,
            versionExistingEvent: versionEvents,
            renderMermaidDiagram,
            renderNodeGraph,
            frontMatterToCopyToNewVersions: {
                // only do consumers and producers if its not the first file.
                consumers: copyFrontMatter,
                producers: copyFrontMatter,
            },
            schema: {
                extension: 'json',
                fileContent: schema,
            },
        });
    });
    // write all events to folders
    Promise.all(eventFiles);
    return {
        generatedEvents: events,
    };
};
exports.default = async (context, options) => {
    const { pathToSpec } = options;
    const listOfAsyncAPIFilesToParse = Array.isArray(pathToSpec) ? pathToSpec : [pathToSpec];
    if (listOfAsyncAPIFilesToParse.length === 0 || !pathToSpec) {
        throw new Error('No file provided in plugin.');
    }
    // on first parse of files don't copy any frontmatter over.
    const parsers = listOfAsyncAPIFilesToParse.map((specFile, index) => parseAsyncAPIFile(specFile, options, index !== 0));
    const data = await Promise.all(parsers);
    const totalEvents = data.reduce((sum, { generatedEvents }) => sum + generatedEvents.length, 0);
    console.log(chalk_1.default.green(`Successfully parsed ${listOfAsyncAPIFilesToParse.length} AsyncAPI file/s. Generated ${totalEvents} events`));
};
