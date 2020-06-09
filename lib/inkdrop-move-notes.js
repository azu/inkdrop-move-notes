"use babel";
const NAMESPACE = "move-notes";
/**
 * @returns {Array<{ commandName: string; pattern: (noteName:string) => boolean; from:string; to:string; }>}
 */
const loadConfig = () => {
    const configFile = inkdrop.config.get(`${NAMESPACE}.configFilePath`);
    try {
        const config = require(configFile);
        if (!Array.isArray(config)) {
            throw new Error("Config should be an Array");
        }
        return config;
    } catch (error) {
        throw error;
    }
}
/**
 * 
 * @param {string} notebookName 
 */
const getNoteBookByName = async (notebookName) => {
    const db = inkdrop.main.dataStore.getLocalDB()
    const notebookDocs = await db.books.findWithName(notebookName);
    if (!notebookDocs) {
        console.log(`Not found ${notebookName} notebook`)
        return;
    }
    return notebookDocs;
}
/**
 * @param {string} notebookName 
 * @returns {Array}
 */
const getNotesInBook = async (notebookName) => {
    const db = inkdrop.main.dataStore.getLocalDB()
    const templateDocs = await getNoteBookByName(notebookName);
    const { docs } = await db.notes.findInBook(templateDocs._id, {
        limit: 100,
        sort: [{ updatedAt: 'desc' }],
    });
    if (!docs) {
        console.log(`Not found docs in ${notebookName}`);
        return [];
    }
    return docs;
}

const moveNoteToBook = async (note, book) => {
    const db = inkdrop.main.dataStore.getLocalDB()
    await db.notes.put({
        ...note,
        bookId: book._id
    });
}
module.exports = {
    config: {
        configFilePath: {
            title: 'Path to config.js',
            description:
                "Set config file path for inkdrop-move-notes",
            type: 'string',
            default: ""
        }
    },
    async activate() {
        const config = loadConfig();
        // add command
        config.forEach(item => {
            inkdrop.commands.add(document.body, `move-notes:${item.commandName}`, async () => {
                // command
                try {
                    const targetNotes = await getNotesInBook(item.from);
                    const toNotebook = await getNoteBookByName(item.to);
                    const wantMoveNotes = targetNotes
                        .filter(note => {
                            // predicate with note instance
                            // https://docs.inkdrop.app/reference/db-note
                            return item.pattern(note);
                        });
                    for (const note of wantMoveNotes) {
                        console.log(`Move "${note.title}" → ${toNotebook.name}:${toNotebook._id}`);
                        await moveNoteToBook(note, toNotebook);
                    }
                } catch (error) {
                    console.error(error);
                }
            });
        })
        // add menu
        inkdrop.menu.add([
            {
                label: "Plugins",
                submenu: [
                    {
                        label: "Move Notes",
                        submenu: config.map(item => {
                            return {
                                "label": item.commandName,
                                "command": `move-notes:${item.commandName}`
                            };
                        }),
                    },
                ],
            },
        ]);
    },

    deactivate() {
    }

};
