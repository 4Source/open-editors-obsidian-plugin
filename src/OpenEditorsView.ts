import { View, WorkspaceLeaf } from 'obsidian';
import { ICON_CLOSE, ICON_CLOSE_GROUP, ICON_CLOSE_WINDOW, ICON_OPEN_EDITORS, VIEW_TYPE_OPEN_EDITORS } from './constants';
import { TreeItem } from './TreeItem';

export class OpenEditorsView extends View {
	windows: TreeItem[];
	treeEl: HTMLDivElement;

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
		// Create the HTML container
		this.containerEl.empty();
		const container = this.containerEl.createEl('div', { cls: (VIEW_TYPE_OPEN_EDITORS + '-container') });
		this.treeEl = container.createEl('div', { attr: { 'style': '' } });

		// If layout changes clear the current tree and recreate it from layout
		this.registerEvent(this.app.workspace.on('layout-change', async () => {
			this.clearTree();
			this.createTree();
		}));
	}

	createTree () {
		const layout = this.app.workspace.getLayout();

		// Expand the tree with the groups and leafs from the main window
		const main = layout['main'];
		if (main) {
			const tree = new TreeItem(this.treeEl, 'Main window', main.id, undefined, [{
				iconId: ICON_CLOSE_WINDOW,
				onClickCallback: () => {
					tree.rekursiveCall((tree) => {
						this.app.workspace.getLeafById(tree.id)?.detach();
					});
				},
				ariaLabel: 'Close all',
			}]);
			this.windows.push(tree);
			main.children.forEach((element: { id: string, type: string, children: object[], state: { title: string } }) => {
				TreeWalker(element, tree);
			});
		}

		// Expand the tree with the groups and leafs from popout windows
		const floatingWindow = layout['floating'];
		if (floatingWindow) {
			let count = 1;
			floatingWindow.children.forEach((element: { id: string, type: string, children: object[] }) => {
				const tree = new TreeItem(this.treeEl, `Window ${count}`, element.id, undefined, [{
					iconId: ICON_CLOSE_WINDOW,
					onClickCallback: () => {
						tree.rekursiveCall((tree) => {
							this.app.workspace.getLeafById(tree.id)?.detach();
						});
					},
					ariaLabel: 'Close all',
				}]);
				this.windows.push(tree);
				element.children.forEach((element_: { id: string, type: string, children: object[], state: { title: string } }) => {
					TreeWalker(element_, tree);
				});
				count++;
			});
		}
	}

	clearTree () {
		this.windows.forEach(window => window.deleteTree());
		this.windows = [];

		this.treeEl.empty();
	}
}

function TreeWalker (layout: { id: string, type: string, children: object[], state: { title: string } }, parent: TreeItem) {
	let count = 0;
	switch (layout.type) {
		case 'split':
			count = 1;
			layout.children.forEach((element: { id: string, type: string, children: object[], state: { title: string } }) => {
				const tree = parent.addChild((container) => new TreeItem(container, `Group ${count}`, element.id, undefined, [{
					iconId: ICON_CLOSE_GROUP,
					onClickCallback: () => {
						tree.rekursiveCall((tree) => {
							this.app.workspace.getLeafById(tree.id)?.detach();
						});
					},
					ariaLabel: 'Close all',
				}]));
				TreeWalker(element, tree);
				count++;
			});
			break;
		case 'tabs':
			count = 1;
			layout.children.forEach((element: { id: string, type: string, children: object[], state: { title: string } }) => {
				TreeWalker(element, parent);
				count++;
			});
			break;
		case 'leaf':
			parent.addChild((container) => new TreeItem(container, layout.state.title, layout.id, {
				onClickCallback: () => {
					const leaf = this.app.workspace.getLeafById(layout.id);
					if (!leaf) {
						console.warn('Leaf not found with the id ', layout.id);
						return;
					}
					this.app.workspace.setActiveLeaf(leaf);
					// TODO: Leaf is in popout Window bringt to forground
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