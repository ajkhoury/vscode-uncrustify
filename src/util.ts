import * as path from 'path';
import * as vsc from 'vscode';

export const ADDRESS = 'https://raw.githubusercontent.com/uncrustify/uncrustify/uncrustify-%VERSION%/documentation/htdocs/default.cfg';
export const CONFIG_FILE_NAME = 'uncrustify.cfg';
export const MODES = [
    'apex',
    'c',
    'cpp',
    'csharp',
    'd',
    'java',
    'objective-c',
    'pawn',
    'vala'
];

export function configPath() {
    let folder = vsc.window.activeTextEditor
        ? vsc.workspace.getWorkspaceFolder(vsc.window.activeTextEditor.document.uri)
        : vsc.workspace.workspaceFolders && vsc.workspace.workspaceFolders[0];
    return vsc.workspace.getConfiguration('uncrustify')
        .get<string>('configPath') || path.join(folder.uri.fsPath, CONFIG_FILE_NAME);
}

export function configUri() {
    return vsc.Uri.parse('uncrustify://configuration');
};
