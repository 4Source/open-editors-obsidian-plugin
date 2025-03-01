import { View, WorkspaceLeaf, WorkspaceSplit } from 'obsidian';
import { ICON_CLOSE, ICON_CLOSE_GROUP, ICON_CLOSE_WINDOW, ICON_OPEN_EDITORS, VIEW_DISPLAY_OPEN_EDITORS, VIEW_TYPE_OPEN_EDITORS } from './constants';
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
		return VIEW_DISPLAY_OPEN_EDITORS;
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
			const tree = new TreeItem(this.treeEl, 'Main window', main.id, main.type, undefined, [{
				iconId: ICON_CLOSE_WINDOW,
				ariaLabel: 'Close all',
				onClickCallback: () => {
					// Recursively detach all leaves in the tree
					tree.rekursiveCallForType([{
						callback: (tree) => {
							this.app.workspace.getLeafById(tree.id)?.detach();
						},
						type: 'leaf',
					}]);
				},
			}]);
			// Add the tree item to the list of windows
			this.windows.push(tree);

			// Recursively build the tree structure for all child elements
			if (main.children.length > 1) {
				this.TreeWalker(main, tree);
			}
			else {
				main.children.forEach((element: { id: string, type: string, children: object[], state: { title: string, type: string } }) => {
					this.TreeWalker(element, tree);
				});
			}
		}

		// Handle floating windows (popout windows)
		const floatingWindow = layout['floating'];
		if (floatingWindow) {
			floatingWindow.children.forEach((element: { id: string, type: string, children: object[], state: { title: string, type: string } }) => {
				this.TreeWalker(element, undefined);
			});
		}
	}

	/**
	 * A recursive function to traverse the workspace layout and build the tree structure.
	 * @param layout - The current layout node being processed.
	 * @param parent - The parent TreeItem to attach new child TreeItems to.
	 */
	TreeWalker (layout: { id: string, type: string, children: object[], state: { title: string, type: string } }, parent: TreeItem | undefined) {
		// Counter for labeling groups and tabs
		let count = 1;
		switch (layout.type) {
			// Handle popout window layouts
			case 'window':
				// Create a tree item for each floating window
				parent = new TreeItem(this.treeEl, `Window ${count}`, layout.id, layout.type, undefined, [{
					iconId: ICON_CLOSE_WINDOW,
					ariaLabel: 'Close all',
					onClickCallback: () => {
						// Recursively detach all leaves in the tree
						parent?.rekursiveCallForType([{
							callback: (parent) => {
								this.app.workspace.getLeafById(parent.id)?.detach();
							},
							type: 'leaf',
						}]);
					},
				}]);
				// Add the tree item to the list of windows
				this.windows.push(parent);

				if (layout.children.length > 1) {
					let groupCount = 1;
					// Recursively build the tree structure for all child elements
					layout.children.forEach((element: { id: string, type: string, children: object[], state: { title: string, type: string } }) => {
						const group = parent?.addChild((containerEl) => new TreeItem(containerEl, `Group ${groupCount}`, element.id, element.type, undefined, [{
							iconId: ICON_CLOSE_GROUP,
							ariaLabel: 'Close all',
							onClickCallback: () => {
								parent?.rekursiveCallForType([{
									callback: (tree) => {
										this.app.workspace.getLeafById(tree.id)?.detach();
									},
									type: 'leaf',
								}]);
							},
						}]));
						this.TreeWalker(element, group);
						groupCount++;
					});
				}
				else {
					// Recursively build the tree structure for all child elements
					layout.children.forEach((element: { id: string, type: string, children: object[], state: { title: string, type: string } }) => {
						this.TreeWalker(element, parent);
					});
					count++;
				}

				break;
			// Handle split layouts
			case 'split':
				layout.children.forEach((element: { id: string, type: string, children: object[], state: { title: string, type: string } }) => {
					// Create a child tree item for each split group
					const group = parent?.addChild((container) => new TreeItem(container, `Group ${count}`, element.id, element.type, undefined, [{
						iconId: ICON_CLOSE,
						ariaLabel: 'Close group',
						onClickCallback: () => {
							group?.rekursiveCallForType([{
								callback: (tree) => {
									this.app.workspace.getLeafById(tree.id)?.detach();
								},
								type: 'leaf',
							}]);
						},
					}, {
						iconId: ICON_CLOSE_GROUP,
						ariaLabel: 'Close all editors',
						onClickCallback: () => {
							if (group) {
								// Find leaf parent
								let leafParent: WorkspaceSplit | undefined;
								group.rekursiveCallForType([{
									callback: tree => {
										const leaf = this.app.workspace.getLeafById(tree.id);
										if (!leaf) {
											console.debug('Leaf not found with the id ', tree.id);
											return;
										}
										const parent = leaf?.parent;
										if (!parent) {
											console.debug('Parent of leaf not found!');
											return;
										}
										leafParent = parent;
									},
									type: 'leaf',
								}]);
								if (!leafParent) {
									console.warn('Parent of leaf not found!');
									return;
								}

								// Add a new tab to parent
								const newId = this.app.workspace.createLeafInParent(leafParent, 0).id;
								if (!newId) {
									console.warn('No id of new leaf!');
									return;
								}

								// Recursively detach all leaves in the tree except for new tab
								group?.rekursiveCallForType([{
									callback: (tree) => {
										if (tree.id != newId) {
											this.app.workspace.getLeafById(tree.id)?.detach();
										}
									},
									type: 'leaf',
								}]);
							}
						},
					}]));
					// Recursively process tabs as children
					this.TreeWalker(element, group);
					count++;
				});
				break;
			// Handle tabs layouts
			case 'tabs':
				layout.children.forEach((element: { id: string, type: string, children: object[], state: { title: string, type: string } }) => {
					this.TreeWalker(element, parent);
				});
				break;
			// Handle individual leaves
			case 'leaf':
				parent?.addChild((container) => new TreeItem(container, layout.state.title, layout.id, layout.type, {
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
					ariaLabel: 'Close',
					onClickCallback: () => {
						this.app.workspace.getLeafById(layout.id)?.detach();
					},
				}]));
				break;
			default:
				console.warn('Unknown layout component', layout);
				break;
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