import { DatacoreApi } from "api/api";
import { Datacore } from "index/datacore";
import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { createElement, render } from "preact";
import { DEFAULT_SETTINGS, Settings } from "settings";
import { IndexStatusBar } from "ui/index-status";

/** Reactive data engine for your Obsidian.md vault. */
export default class DatacorePlugin extends Plugin {
    /** Plugin-wide default settings. */
    public settings: Settings;

    /** Central internal state. */
    public core: Datacore;
    /** Externally visible API for querying. */
    public api: DatacoreApi;

    async onload() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) ?? {});
        this.addSettingTab(new GeneralSettingsTab(this.app, this));

        // Initialize the core API for usage in all views and downstream apps.
        this.addChild((this.core = new Datacore(this.app, this.manifest.version, this.settings)));
        this.api = new DatacoreApi(this.core);

        // Add a visual aid for what datacore is currently doing.
        this.mountIndexState(this.addStatusBarItem(), this.core);

        // Primary visual elements (DatacoreJS and Datacore blocks).
        this.registerMarkdownCodeBlockProcessor(
            "datacorejs",
            async (source: string, el, ctx) => this.api.executeJs(source, el, ctx, ctx.sourcePath),
            -100
        );

        this.registerMarkdownCodeBlockProcessor(
            "datacorejsx",
            async (source: string, el, ctx) => this.api.executeJsx(source, el, ctx, ctx.sourcePath),
            -100
        );

        this.registerMarkdownCodeBlockProcessor(
            "datacorets",
            async (source: string, el, ctx) => this.api.executeTs(source, el, ctx, ctx.sourcePath),
            -100
        );

        this.registerMarkdownCodeBlockProcessor(
            "datacoretsx",
            async (source: string, el, ctx) => this.api.executeTsx(source, el, ctx, ctx.sourcePath),
            -100
        );

        // Initialize as soon as the workspace is ready.
        if (!this.app.workspace.layoutReady) {
            this.app.workspace.onLayoutReady(async () => this.core.initialize());
        } else {
            this.core.initialize();
        }

        // Make the API globally accessible from any context.
        window.datacore = this.api;

        // bon appetit
        console.log(`Datacore: version ${this.manifest.version} (requires obsidian ${this.manifest.minAppVersion})`);
    }

    onunload() {
        console.log(`Datacore: version ${this.manifest.version} unloaded.`);
    }

    /** Update the given settings to new values. */
    async updateSettings(settings: Partial<Settings>) {
        Object.assign(this.settings, settings);
        await this.saveData(this.settings);
    }

    /** Render datacore indexing status using the index. */
    private mountIndexState(root: HTMLElement, core: Datacore): void {
        render(createElement(IndexStatusBar, { datacore: core }), root);

        this.register(() => render(null, root));
    }
}

/** Datacore Settings Tab. */
class GeneralSettingsTab extends PluginSettingTab {
    constructor(
        app: App,
        private plugin: DatacorePlugin
    ) {
        super(app, plugin);
    }

    public display(): void {
        this.containerEl.empty();

        this.containerEl.createEl("h2", { text: "Views" });

        new Setting(this.containerEl)
            .setName("Pagination")
            .setDesc(
                "If enabled, splits up views into pages of results which can be traversed " +
                    "via buttons at the top and bottom of the view. This substantially improves " +
                    "the performance of large views, and can help with visual clutter. Note that " +
                    "this setting can also be set on a per-view basis."
            )
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.defaultPagingEnabled).onChange(async (value) => {
                    await this.plugin.updateSettings({ defaultPagingEnabled: value });
                });
            });

        new Setting(this.containerEl)
            .setName("Default Page Size")
            .setDesc("The number of entries to show per page, by default. This can be overriden on a per-view basis.")
            .addDropdown((dropdown) => {
                const OPTIONS: Record<string, string> = {
                    "25": "25",
                    "50": "50",
                    "100": "100",
                    "200": "200",
                    "500": "500",
                };
                const current = "" + this.plugin.settings.defaultPageSize;
                if (!(current in OPTIONS)) OPTIONS[current] = current;

                dropdown
                    .addOptions(OPTIONS)
                    .setValue(current)
                    .onChange(async (value) => {
                        const parsed = parseFloat(value);
                        if (isNaN(parsed)) return;

                        await this.plugin.updateSettings({ defaultPageSize: parsed | 0 });
                    });
            });

        this.containerEl.createEl("h2", { text: "Performance Tuning" });

        new Setting(this.containerEl)
            .setName("Inline Fields")
            .setDesc(
                "If enabled, inline fields will be parsed in all documents. Finding inline fields requires a full text scan through each document, " +
                    "which noticably slows down indexing for large vaults. Disabling this functionality will mean metadata will only come from tags, links, and " +
                    "Properties / frontmatter"
            )
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.indexInlineFields).onChange(async (value) => {
                    await this.plugin.updateSettings({ indexInlineFields: value });

                    // TODO: Request a full index drop + reindex for correctness.
                });
            });

        new Setting(this.containerEl)
            .setName("Importer Threads")
            .setDesc("The number of importer threads to use for parsing metadata.")
            .addText((text) => {
                text.setValue("" + this.plugin.settings.importerNumThreads).onChange(async (value) => {
                    const parsed = parseInt(value);
                    if (isNaN(parsed)) return;

                    await this.plugin.updateSettings({ importerNumThreads: parsed });
                });
            });

        new Setting(this.containerEl)
            .setName("Importer Utilization")
            .setDesc("How much CPU time each importer thread should use, as a fraction (0.1 - 1.0).")
            .addText((text) => {
                text.setValue(this.plugin.settings.importerUtilization.toFixed(2)).onChange(async (value) => {
                    const parsed = parseFloat(value);
                    if (isNaN(parsed)) return;

                    const limited = Math.max(0.1, Math.min(1.0, parsed));
                    await this.plugin.updateSettings({ importerUtilization: limited });
                });
            });
    }
}
