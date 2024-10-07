import * as vscode from 'vscode';

const output: vscode.OutputChannel = vscode.window.createOutputChannel('Uncrustify');

export function show() {
    output.show(true);
}

export function hide() {
    output.hide();
}

export function log(msg: string, line = true) {
    if (line) {
        output.appendLine(msg);
    } else {
        output.append(msg);
    }
}

export function dbg(msg: string, line = true) {
    if (vscode.workspace.getConfiguration('uncrustify-format').get('debug', false)) {
        const dmsg = 'Debug: ' + msg;

        if (line) {
            output.appendLine(dmsg);
        } else {
            output.append(dmsg);
        }
    }
}
