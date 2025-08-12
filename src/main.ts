import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, Settings } from './settings/SettingsInterface';
import { ICON_OPEN_EDITORS, VIEW_DISPLAY_OPEN_EDITORS, VIEW_TYPE_OPEN_EDITORS } from './constants';
import { OpenEditorsView } from './OpenEditorsView';

export default class OpenEditorsPlugin extends Plugin {
	settings: Settings;

	async onload() {
		await this.loadSettings();

		/*
		 * This adds a settings tab so the user can configure various aspects of the plugin
		 * this.addSettingTab(new OpenEditorsSettingTab(this.app, this));
		 */

		// Register the view
		this.registerView(VIEW_TYPE_OPEN_EDITORS, (leaf) => new OpenEditorsView(leaf));

		// Add ribbon icon to open the view
		this.addRibbonIcon(ICON_OPEN_EDITORS, VIEW_DISPLAY_OPEN_EDITORS, () => {
			this.activateView(VIEW_TYPE_OPEN_EDITORS);
		});

		// Add command to open the view
		this.addCommand({
			id: 'show-view',
			name: 'Show',
			callback: () => {
				this.activateView(VIEW_TYPE_OPEN_EDITORS);
			},
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView(viewType: string) {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(viewType);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		}
		else {
			/*
			 * Our view could not be found in the workspace, create a new leaf
			 * in the right sidebar for it
			 */
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: viewType, active: true });
			}
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}
