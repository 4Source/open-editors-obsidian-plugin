import { View, WorkspaceLeaf } from 'obsidian';
import { ICON_CLOSE, ICON_CLOSE_GROUP, ICON_CLOSE_WINDOW, ICON_OPEN_EDITORS, VIEW_TYPE_OPEN_EDITORS } from './constants';
import { TreeItem } from './TreeItem';

export class OpenEditorsView extends View {
	// Array of top-level tree items representing open editor windows
	windows: TreeItem[];
	// The root container element for the tree structure
	treeEl: HTMLDivElement;

	/**
	 * Initializes the OpenEditorsView with a given workspace leaf.
	 * @param leaf - The workspace leaf where this view will be rendered.
	 */
	constructor (leaf: WorkspaceLeaf) {
		super(leaf);

		this.windows = [];
		this.icon = ICON_OPEN_EDITORS;
	}

	getViewType (): string {
		return VIEW_TYPE_OPEN_EDITORS;
	}

	getDisplayText (): string {
		return 'Open Editors';
	}

	async onOpen () {
		// Create the main container for the view
		this.containerEl.empty();
		const container = this.containerEl.createEl('div', { cls: (VIEW_TYPE_OPEN_EDITORS + '-container') });
		this.treeEl = container.createEl('div', { attr: { 'style': '' } });

		// Register an event listener to handle layout changes
		this.registerEvent(this.app.workspace.on('layout-change', async () => {
			// Clear the current tree structure
			this.clearTree();
			// Rebuild the tree based on the updated layout
			this.createTree();
		}));
	}

	/**
	 * Creates the tree structure representing the current workspace layout.
	 */
	createTree () {
		// Get the current workspace layout
		const layout = this.app.workspace.getLayout();

		// Handle the main window's layout
		const main = layout['main'];
		if (main) {
			// Create a top-level tree item for the main window
			const tree = new TreeItem(this.treeEl, 'Main window', main.id, undefined, [{
				iconId: ICON_CLOSE_WINDOW,
				onClickCallback: () => {
					// Recursively detach all leaves in the tree
					tree.rekursiveCall((tree) => {
						this.app.workspace.getLeafById(tree.id)?.detach();
					});
				},
				ariaLabel: 'Close all',
			}]);
			// Add the tree item to the list of windows
			this.windows.push(tree);

			// Recursively build the tree structure for all child elements
			main.children.forEach((element: { id: string, type: string, children: object[], state: { title: string, type: string } }) => {
				TreeWalker(element, tree);
			});
		}

		// Handle floating windows (popout windows)
		const floatingWindow = layout['floating'];
		if (floatingWindow) {
			// Counter to label floating windows
			let count = 1;
			floatingWindow.children.forEach((element: { id: string, type: string, children: object[] }) => {
				// Create a tree item for each floating window
				const tree = new TreeItem(this.treeEl, `Window ${count}`, element.id, undefined, [{
					iconId: ICON_CLOSE_WINDOW,
					onClickCallback: () => {
						// Recursively detach all leaves in the tree
						tree.rekursiveCall((tree) => {
							this.app.workspace.getLeafById(tree.id)?.detach();
						});
					},
					ariaLabel: 'Close all',
				}]);
				// Add the tree item to the list of windows
				this.windows.push(tree);

				// Recursively build the tree structure for all child elements
				element.children.forEach((element_: { id: string, type: string, children: object[], state: { title: string, type: string } }) => {
					TreeWalker(element_, tree);
				});
				count++;
			});
		}
	}

	/**
	 * Clears the current tree structure and resets the windows array.
	 */
	clearTree () {
		// Delete all tree items and their children
		this.windows.forEach(window => window.deleteTree());
		// Reset the windows array
		this.windows = [];

		// Clear the tree container in the DOM
		this.treeEl.empty();
	}
}

/**
 * A recursive function to traverse the workspace layout and build the tree structure.
 * @param layout - The current layout node being processed.
 * @param parent - The parent TreeItem to attach new child TreeItems to.
 */
function TreeWalker (layout: { id: string, type: string, children: object[], state: { title: string, type: string } }, parent: TreeItem) {
	// Counter for labeling groups and tabs
	let count = 1;
	switch (layout.type) {
		// Handle split layouts (groups of tabs)
		case 'split':
			layout.children.forEach((element: { id: string, type: string, children: object[], state: { title: string, type: string } }) => {
			// Create a child tree item for each split group
				const tree = parent.addChild((container) => new TreeItem(container, `Group ${count}`, element.id, undefined, [{
					iconId: ICON_CLOSE_GROUP,
					onClickCallback: () => {
						tree.rekursiveCall((tree) => {
							this.app.workspace.getLeafById(tree.id)?.detach();
						});
					},
					ariaLabel: 'Close all',
				}]));
				// Recursively process child elements
				TreeWalker(element, tree);
				count++;
			});
			break;
		// Handle tabs layouts
		case 'tabs':
			layout.children.forEach((element: { id: string, type: string, children: object[], state: { title: string, type: string } }) => {
			// Recursively process tabs as children
				TreeWalker(element, parent);
			});
			break;
		// Handle individual leaves
		case 'leaf':
			parent.addChild((container) => new TreeItem(container, layout.state.title, layout.id, {
				onClickCallback: () => {
					// Set the clicked leaf as the active leaf in the workspace
					const leaf = this.app.workspace.getLeafById(layout.id);
					if (!leaf) {
						console.warn('Leaf not found with the id ', layout.id);
						return;
					}
					this.app.workspace.setActiveLeaf(leaf);
					// TODO: Bring the leaf's popout window to the foreground if necessary
				},
			}, [{
				iconId: ICON_CLOSE,
				onClickCallback: () => {
					this.app.workspace.getLeafById(layout.id)?.detach();
				},
				ariaLabel: 'Close',
			}]));
			break;
		default:
			console.warn('Unknown layout component', layout);
			break;
	}
}
