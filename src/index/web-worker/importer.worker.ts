import { markdownImport } from "index/import/markdown";
import { ImportCommand, MarkdownImportResult } from "index/web-worker/message";
import { Transferable } from "index/web-worker/transferable";

/** Web worker entry point for importing. */
onmessage = (event) => {
    const message = Transferable.value(event.data) as ImportCommand;

    if (message.type === "markdown") {
        const markdown = markdownImport(message.contents, message.metadata);
        postMessage(Transferable.transferable({
            type: "markdown",
            result: markdown
        } as MarkdownImportResult));
    } else if (message.type === "canvas") {
        postMessage({ "$error": "Unsupported import method." });
    }
};