import * as path from 'path';
import * as vscode from 'vscode';

const DEFAULT_CONFIG_FILE_NAME = 'uncrustify.cfg';
const DEFAULT_PATH = 'uncrustify';
const DEFAULT_MODES = ['c', 'cpp', 'csharp', 'd', 'java', 'objective-c', 'pawn', 'pde', 'vala'];

const SUPPORTED_PLATFORM_NAMES = {
    linux: '.linux',
    darwin: '.osx',
    win32: '.windows',
};

/**
 * Normalize a path string. Expands environment variables and applies workspace folder
 * variable substitution. If the path is relative, it is prefixed with the workspace folder.
 *
 * @return The normalized path string.
 */
function normalizePath(folderUri: vscode.Uri, p: string): string {
    // interpret environment variables
    p = p.replace(/(%\w+%)|(\$\w+)/g, (variable) => {
        const end = variable.startsWith('%') ? 1 : 0;
        return process.env[variable.substring(1, variable.length - end)];
    });

    // interpret ${workspaceFolder} variable
    p = p.replace(/\$\{workspaceFolder\}/, (_, name) => {
        return folderUri.fsPath;
    });

    // interpret ${workspaceFolder:<folder>} variables
    p = p.replace(/\$\{workspaceFolder:(.*?)\}/, (_, name) => {
        return vscode.workspace.workspaceFolders.find((wf) => wf.name == name).uri.fsPath;
    });

    // prefix relative paths with the detected workspace folder
    if (!path.isAbsolute(p)) {
        p = path.join(folderUri.fsPath, p);
    }

    // Normalize the path separators.
    p = path.normalize(p);

    return p;
}

/**
 * Retrieves the uncrustify language settings.
 *
 * @return Array of default language modes and any configured overrides.
 */
export function modes(): Array<string> {
    const config = getExtensionConfig();
    const overrides = config.get<Record<string, unknown>>('langOverrides', {});

    return DEFAULT_MODES.concat(Object.getOwnPropertyNames(overrides));
}

/**
 * Retrieves the configured path to the `uncrustify` configuration file.
 *
 * @return An absolute path to an `uncrustify` configuration file.
 */
export function configPath(): string {
    const folderUri = getWorkspacePath();
    const config = getExtensionConfig(folderUri);
    let cfgPath = config.get<string>(`configPath${getPlatformSuffix()}`, DEFAULT_CONFIG_FILE_NAME);
    return normalizePath(folderUri, cfgPath);
}

/**
 * Retrieves the configured `uncrustify` executable path.
 *
 * @return The path or name of the `uncrustify` executable.
 */
export function executablePath(): string {
    const folderUri = getWorkspacePath();
    const config = getExtensionConfig(folderUri);
    let execPath = config.get<string>(`executablePath${getPlatformSuffix()}`, DEFAULT_PATH);
    return normalizePath(folderUri, execPath);
}

/**
 * Determines the workspace path relative to the currently open document, or the
 * first workspace found.
 *
 * @return A workspace folder.
 */
export function getWorkspacePath(): vscode.Uri {
    let folderUri: vscode.Uri;
    const workspaces = vscode.workspace.workspaceFolders || [];
    const textEditors = [vscode.window.activeTextEditor];

    if (workspaces.length === 0) {
        return folderUri;
    }

    textEditors.push(...vscode.window.visibleTextEditors);

    // if there is a document open in the editor, use its workspace folder
    for (const textEditor of textEditors.filter((e) => e)) {
        const workspace: vscode.WorkspaceFolder = vscode.workspace.getWorkspaceFolder(textEditor.document.uri);

        if (workspace) {
            return workspace.uri;
        }
    }

    return workspaces[0].uri;
}

/**
 * Retrieves the extension configuration object for the `uncrustify` extension
 *
 * @param folderUri A scope for which the configuration is asked for.
 *
 * @return The `uncrustify` extension configuration object
 */
export function getExtensionConfig(folderUri?: vscode.Uri): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('uncrustify', folderUri ?? getWorkspacePath());
}

/**
 * Retrieves the configuration suffix for the current platform
 *
 * @param platform The platform to retrieve the platform suffix for
 *
 * @return The platform configuration suffix
 */
export function getPlatformSuffix(platform?: string): string {
    return SUPPORTED_PLATFORM_NAMES[platform ?? process.platform];
}
