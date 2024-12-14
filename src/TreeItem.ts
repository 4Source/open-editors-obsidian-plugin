import { IconName, setIcon } from 'obsidian';

export class TreeItem {
	id: string;
	parent: TreeItem | undefined;
	children: TreeItem[];
	treeItemEl: HTMLDivElement;
	selfEl: HTMLDivElement;
	childrenEl: HTMLDivElement;
	iconEl: HTMLDivElement;

	constructor (conteiner: HTMLDivElement, title: string, id: string, handler?: { onClickCallback?: (ev: MouseEvent) => void, onDragCallback?: (ev: DragEvent, delegateTarget: HTMLElement) => void }, actions?: { iconId: IconName, onClickCallback: (ev: MouseEvent) => void, ariaLabel?: string }[]) {
		this.children = [];
		this.id = id;
		this.treeItemEl = conteiner.createEl('div', { cls: 'tree-item' });
		this.selfEl = this.treeItemEl.createEl('div', { cls: 'open-editors-tree-item-self tree-item-self is-clickable' });
		this.childrenEl = this.treeItemEl.createEl('div', { cls: 'tree-item-children' });

		this.selfEl.onClickEvent((ev) => {
			if (this.selfEl.hasClass('mod-collapsible')) {
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
			if (handler?.onClickCallback) {
				handler.onClickCallback(ev);
			}
		});

		if (handler?.onDragCallback) {
			this.selfEl.on('drag', 'selector', (ev, delegateTarget) => {
				console.log(ev, delegateTarget);
				if (handler?.onDragCallback) {
					handler.onDragCallback(ev, delegateTarget);
				}
			});
		}

		this.selfEl.createEl('div', { cls: 'open-editors-tree-item-inner tree-item-inner' })
			.createEl('div', { cls: 'tree-item-inner-text' })
			.createEl('span', { cls: 'tree-item-inner-text', text: title });
		const flairOuter = this.selfEl.createEl('div', { cls: 'open-editors-tree-item-flair-outer tree-item-flair-outer' });

		if (actions) {
			actions.forEach(action => {
				const button = flairOuter.createEl('div', { cls: 'tree-item-flair mod-clickable tree-iten-action-icon' });
				setIcon(button.createEl('span', { cls: '' }), action.iconId);
				if (action.ariaLabel) {
					button.ariaLabel = action.ariaLabel;
					// button.setAttr('data-tooltip-position', 'top');
				}
				button.onClickEvent((ev) => {
					ev.stopPropagation();
					action.onClickCallback(ev);
				});
			});
		}
	}

	rekursiveCall (callback: (tree: TreeItem) => void) {
		this.children.forEach((child) => {
			child.rekursiveCall(callback);
		});
		callback(this);
	}

	addChild (treeCreateCallback: (container: HTMLDivElement) => TreeItem): TreeItem {
		if (!this.selfEl.hasClass('mod-collapsible')) {
			this.selfEl.addClass('mod-collapsible');
			this.iconEl = this.selfEl.createEl('div', { cls: 'open-editors-tree-item-icon tree-item-icon collapse-icon' });
			setIcon(this.iconEl, 'right-triangle');
		}

		const child = treeCreateCallback(this.childrenEl);
		child.parent = this;
		this.children.push(child);
		return child;
	}

	removeChild (id: string) {
		const child = this.children.find((value) => value.id == id);
		if (child) {
			this.children.remove(child);
			child.removeAllChildren();
			child.removeDom();
		}
		if (this.children.length <= 0 && this.selfEl.hasClass('mod-collapsible')) {
			this.selfEl.removeClass('mod-collapsible');
			this.iconEl?.remove();
		}
	}

	removeAllChildren () {
		while (this.children.length > 0) {
			const child = this.children.pop();
			if (child) {
				child.removeAllChildren();
				child.removeDom();
			}
		}
		this.selfEl.removeClass('mod-collapsible');
		this.iconEl?.remove();
	}

	deleteTree () {
		this.removeAllChildren();
		this.removeDom();
	}

	private removeDom () {
		this.treeItemEl?.remove();
		this.selfEl?.remove();
		this.childrenEl?.remove();
		this.iconEl?.remove();
	}
}
