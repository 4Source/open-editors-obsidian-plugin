import { IconName, setIcon } from 'obsidian';

export class TreeItem {
	// The ID of the tree item
	id: string;

	// The type of the workspace item behind this tree item
	type: string;

	// Tree items inside this tree item
	children: TreeItem[];

	// Main container element for the tree item
	treeItemEl: HTMLDivElement;

	// Represents the tree item
	selfEl: HTMLDivElement;

	// Container for child elements
	childrenEl: HTMLDivElement;

	// Element for displaying collapsible icons
	iconEl: HTMLDivElement;

	/**
	 * Constructor to initialize a TreeItem instance.
	 * @param conteinerEl - The parent container to render the tree item in.
	 * @param title - The label of the tree item.
	 * @param id - A unique identifier for this tree item.
	 * @param handler - Optional event handlers
	 * @param actions - Optional actions (clickable icons with callbacks)
	 */
	constructor(
		conteinerEl: HTMLDivElement,
		title: string,
		id: string,
		type: string,
		handler?: {
			onClickCallback?: (ev: MouseEvent) => void,
			onDragCallback?: (ev: DragEvent, delegateTarget: HTMLElement) => void
		},
		actions?: { iconId: IconName, onClickCallback: (ev: MouseEvent) => void, ariaLabel?: string }[]
	) {
		this.children = [];
		this.id = id;
		this.type = type;

		// Create the main tree item element
		this.treeItemEl = conteinerEl.createEl('div', { cls: 'tree-item' });
		this.selfEl = this.treeItemEl.createEl('div', { cls: 'open-editors-tree-item-self tree-item-self is-clickable' });
		this.childrenEl = this.treeItemEl.createEl('div', { cls: 'tree-item-children' });
		// TODO: Add Icon infront of name

		// Add a click event listener to toggle the collapsible state of the item
		this.selfEl.onClickEvent((ev) => {
			if (this.selfEl.hasClass('mod-collapsible')) {
				// Toggle visibility of children
				if (this.iconEl.hasClass('is-collapsed')) {
					this.selfEl.removeClass('is-collapsed');
					this.iconEl.removeClass('is-collapsed');
					this.childrenEl.setCssProps({ 'display': 'block' });
				}
				else {
					this.selfEl.addClass('is-collapsed');
					this.iconEl.addClass('is-collapsed');
					this.childrenEl.setCssProps({ 'display': 'none' });
				}
			}

			// Invoke custom click handler if provided
			if (handler?.onClickCallback) {
				handler.onClickCallback(ev);
			}
		});

		// Add a drag event listener if a drag handler is provided
		if (handler?.onDragCallback) {
			this.selfEl.on('drag', 'selector', (ev, delegateTarget) => {
				if (handler?.onDragCallback) {
					handler.onDragCallback(ev, delegateTarget);
				}
			});
		}
		// TODO: Add drag target functionality

		// Create inner content for the tree item
		this.selfEl.createEl('div', { cls: 'open-editors-tree-item-inner tree-item-inner' })
			.createEl('div', { cls: 'tree-item-inner-text' })
			.createEl('span', { cls: 'tree-item-inner-text', text: title });

		// Create an actions container
		const flairOuter = this.selfEl.createEl('div', { cls: 'open-editors-tree-item-flair-outer tree-item-flair-outer' });
		if (actions) {
			actions.forEach(action => {
				// Create a button for each action
				const button = flairOuter.createEl('div', { cls: 'tree-item-flair mod-clickable tree-iten-action-icon' });
				setIcon(button.createEl('span', { cls: '' }), action.iconId);
				if (action.ariaLabel) {
					button.ariaLabel = action.ariaLabel;
				}

				// Add a click listener to invoke the action callback
				button.onClickEvent((ev) => {
					// Prevent click from bubbling up
					ev.stopPropagation();

					// Call provided onClick Callback function
					action.onClickCallback(ev);
				});
			});
		}
	}

	/**
	 * Recursively apply a callback function to the current tree item and its children.
	 * @param callback - The function to call for each tree item.
	 */
	rekursiveCall(callback: (tree: TreeItem) => void) {
		this.children.forEach((child) => {
			child.rekursiveCall(callback);
		});
		callback(this);
	}

	/**
	 * Recursively apply a callback funstion to the current tree item and its children if the type matches the given type.
	 * @param callback - The function to call for each tree item.
	 * @param type - The type TreeItem needs to have
	 */
	rekursiveCallForType(actions: { callback: (tree: TreeItem) => void, type: string }[]) {
		this.children.forEach((child) => {
			child.rekursiveCallForType(actions);
		});

		actions.forEach(action => {
			if (this.type === action.type) {
				action.callback(this);
			}
		});
	}

	/**
	 * Add a child TreeItem to this tree item.
	 * @param treeCreateCallback - A function that creates and returns a new TreeItem.
	 * @returns The newly added TreeItem.
	 * @example
	 * parent.addChild((containerEl) => new TreeItem(containerEl, "Title", "ID"))
	 */
	addChild(treeCreateCallback: (containerEl: HTMLDivElement) => TreeItem): TreeItem {
		if (!this.selfEl.hasClass('mod-collapsible')) {
			// Make this tree item collapsible if it isn't already
			this.selfEl.addClass('mod-collapsible');
			this.iconEl = this.selfEl.createEl('div', { cls: 'open-editors-tree-item-icon tree-item-icon collapse-icon' });
			setIcon(this.iconEl, 'right-triangle');
		}

		const child = treeCreateCallback(this.childrenEl);

		// Add the child to the children array
		this.children.push(child);
		return child;
	}

	/**
	 * Remove a child TreeItem by its ID.
	 * @param id - The unique identifier of the child to remove.
	 */
	removeChild(id: string) {
		const child = this.children.find((value) => value.id == id);
		if (child) {
			this.children.remove(child);

			// Recursively remove all children
			child.removeAllChildren();

			// Remove the DOM elements for this child
			child.removeDom();
		}

		// If there are no more children, remove collapsible functionality
		if (this.children.length <= 0 && this.selfEl.hasClass('mod-collapsible')) {
			this.selfEl.removeClass('mod-collapsible');
			this.iconEl?.remove();
		}
	}

	/**
	 * Remove all child TreeItems from this tree item.
	 */
	removeAllChildren() {
		while (this.children.length > 0) {
			const child = this.children.pop();
			if (child) {
				// Recursively remove all children
				child.removeAllChildren();

				// Remove the DOM elements for this child
				child.removeDom();
			}
		}

		// If there are no more children, remove collapsible functionality
		if (this.children.length <= 0 && this.selfEl.hasClass('mod-collapsible')) {
			this.selfEl.removeClass('mod-collapsible');
			this.iconEl?.remove();
		}
	}

	/**
	 * Completely delete this tree and all of its children.
	 */
	deleteTree() {
		this.removeAllChildren();
		this.removeDom();
	}

	/**
	 * Private helper to remove DOM elements associated with this tree item.
	 */
	private removeDom() {
		this.treeItemEl?.remove();
		this.selfEl?.remove();
		this.childrenEl?.remove();
		this.iconEl?.remove();
	}
}
