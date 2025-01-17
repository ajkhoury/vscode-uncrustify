import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import * as u from 'util';
import * as temp from 'temp';
import * as logger from './logger';
import * as util from './util';

temp.track();

export default class Formatter
    implements
        vscode.DocumentFormattingEditProvider,
        vscode.DocumentRangeFormattingEditProvider,
        vscode.OnTypeFormattingEditProvider
{
    private tempDir: string = null;
    private tempFileName: string = null;

    public provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ) {
        return this.format(document, null, options, token);
    }

    public provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ) {
        return this.format(document, range, options, token);
    }

    public provideOnTypeFormattingEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        ch: string,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ) {
        return this.format(document, new vscode.Range(new vscode.Position(0, 0), position), options, token);
    }

    private async format(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): Promise<vscode.TextEdit[]> {
        const configuration = vscode.workspace.getConfiguration('uncrustify', document.uri);
        const useTempFile = configuration.get('useTempFile') || range; // range formatting is not supported with stdin
        const useReplaceOption = configuration.get('useReplaceOption');
        const useDirectFile = useTempFile || useReplaceOption;

        if (useTempFile) {
            if (this.tempDir == null) {
                this.tempDir = await u.promisify(temp.mkdir)(vscode.env.appName + '.' + 'uncrustify');
                logger.dbg('temporary directory: ' + this.tempDir);
            }

            this.tempFileName = path.join(this.tempDir, path.basename(document.fileName));
            logger.dbg('temporary file: ' + this.tempFileName);
            await u.promisify(fs.writeFile)(this.tempFileName, document.getText(range));
        } else if (useReplaceOption) {
            await document.save();
        }

        return await new Promise((resolve, reject) => {
            token.onCancellationRequested(reject);
            const configPath = util.configPath();
            logger.dbg('config file: ' + configPath);

            try {
                fs.accessSync(configPath);
            } catch (err) {
                logger.dbg('error accessing config file: ' + err);
                vscode.window.showErrorMessage('The uncrustify config file path is incorrect: ' + configPath);
                reject(err);
                return;
            }

            const args = ['-l', languageMap[document.languageId], '-c', configPath];
            let output = Buffer.alloc(0);
            let stderrOutput = '';

            if (range) {
                args.push('--frag');
            }

            // This option helps you if the document saved as UTF8 with BOM, though not able to format it partially.
            if (useDirectFile) {
                args.push('--replace');
                args.push('--no-backup');
                args.push(useTempFile ? this.tempFileName : document.fileName);
            }

            const uncrustifyProc = cp.spawn(util.executablePath(), args);
            const text = document.getText(range);
            logger.dbg(`launched: ${util.executablePath()} ${args.join(' ')}`);

            uncrustifyProc.on('error', reject);
            uncrustifyProc.on('exit', async (code) => {
                logger.dbg('uncrustify exited with status: ' + code);

                if (code < 0) {
                    vscode.window.showErrorMessage('Uncrustify exited with error code: ' + code);
                    reject(code);
                } else if (useTempFile) {
                    const result = await u.promisify(fs.readFile)(this.tempFileName);
                    resolve([new vscode.TextEdit(this.getRange(document, range), result.toString())]);
                }
            });

            uncrustifyProc.stdout.on('data', (data) => {
                //logger.dbg('uncrustify data: ' + data); // for debugging.
                output = Buffer.concat([output, Buffer.from(data)]);
            });
            uncrustifyProc.stdout.on('close', () => {
                if (useDirectFile) {
                    return;
                }

                const result = output.toString();
                if (result.length == 0 && text.length > 0) {
                    reject();
                } else {
                    resolve([new vscode.TextEdit(this.getRange(document, range), result)]);
                }
            });

            uncrustifyProc.stderr.on('data', (data) => {
                stderrOutput += data.toString(); // not necessarily an error, uncrustify writes to stderr on windows.
            });
            uncrustifyProc.stderr.on('close', () => {
                logger.dbg('uncrustify exited with: ' + stderrOutput);
            });

            if (!useDirectFile) {
                uncrustifyProc.stdin.end(text);
            }
        });
    }

    private getRange(document: vscode.TextDocument, range: vscode.Range): vscode.Range {
        const lastLine = document.lineCount - 1;
        const lastCol = document.lineAt(lastLine).text.length;
        return range || new vscode.Range(0, 0, lastLine, lastCol);
    }
}

const langOverrides = vscode.workspace.getConfiguration('uncrustify').get('langOverrides');

const languageMap = Object.assign(
    {
        c: 'C',
        cpp: 'CPP',
        csharp: 'CS',
        d: 'D',
        java: 'JAVA',
        'objective-c': 'OC',
        pawn: 'PAWN',
        pde: 'JAVA',
        vala: 'VALA',
    },
    langOverrides
);
