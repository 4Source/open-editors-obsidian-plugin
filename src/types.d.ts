import { } from 'obsidian';

declare module 'obsidian' {
	interface WorkspaceLeaf {
		id: string,
		parent: WorkspaceTabs | WorkspaceMobileDrawer;
	}
}