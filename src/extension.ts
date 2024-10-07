import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as cp from 'child_process';
import * as logger from './logger';
import * as util from './util';
import UncrustifyFormatter from './formatter';

let extContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
    logger.dbg('extension started');
    extContext = context;

    const formatter = new UncrustifyFormatter();
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(util.modes, formatter));
    context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider(util.modes, formatter));
    context.subscriptions.push(vscode.languages.registerOnTypeFormattingEditProvider(util.modes, formatter, ';', '}'));
    logger.dbg('registered formatter for modes: ' + util.modes.map((mode) => mode.language).join(', '));

    vscode.commands.registerCommand('uncrustify-format.create', () => {
        logger.dbg('command: create');

        if (!vscode.workspace.workspaceFolders || !vscode.workspace.workspaceFolders.length) {
            return vscode.window.showWarningMessage('No folder is open');
        }

        let output = '';
        const error = new Error('Configuration file already exists');

        return fs
            .access(util.configPath(), fs.constants.F_OK)
            .then(() =>
                vscode.window.showWarningMessage('Configuration file already exists', 'Overwrite').then((choice) => {
                    if (choice !== 'Overwrite') {
                        throw error;
                    }
                })
            )
            .catch((e) => {
                if (e === error) {
                    throw e;
                } else {
                    return fs.ensureFile(util.configPath());
                }
            })
            .then(
                () =>
                    new Promise((resolve) =>
                        cp
                            .spawn(util.executablePath(), ['-c', util.configPath(), '--update-config-with-doc'])
                            .stdout.on('data', (data) => (output += data.toString()))
                            .on('end', () => resolve(output.replace(/\?\?\?:.*/g, '')))
                    )
            )
            .then((config: string) => {
                if (config.length > 0) {
                    fs.writeFile(util.configPath(), config);
                } else {
                    vscode.window.showErrorMessage(
                        'Configuration could not be created; is Uncrustify correctly installed and configured?'
                    );
                }
            })
            .catch((reason) => logger.dbg(reason));
    });

    vscode.commands.registerCommand('uncrustify-format.open', () =>
        vscode.commands.executeCommand('vscode.open', vscode.Uri.file(util.configPath()))
    );

    vscode.commands.registerCommand('uncrustify-format.save', async (config) => {
        logger.dbg('command: save');

        if (!config) {
            logger.dbg('error saving config: no config passed');
            return;
        }

        try {
            const data = await new Promise((resolve, reject) =>
                fs.readFile(util.configPath(), (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(data);
                })
            );

            let result = data.toString();

            for (const key in config) {
                result = result.replace(new RegExp(`^(${key}\\s*=\\s*)\\S+(.*)`, 'm'), `$1${config[key]}$2`);
            }

            return await new Promise<void>((resolve, reject) =>
                fs.writeFile(util.configPath(), result, (err) => {
                    if (err) {
                        reject(err);
                    }

                    resolve();
                    logger.dbg('saved config file');
                })
            );
        } catch (reason) {
            return logger.dbg('error saving config file: ' + reason);
        }
    });

    vscode.commands.registerCommand('uncrustify-format.savePreset', async (config, name) => {
        logger.dbg('command: savePreset');

        if (!config) {
            logger.dbg('error saving preset: no config passed');
            return;
        }

        const promise: Thenable<string> =
            name !== undefined
                ? Promise.resolve(name)
                : vscode.window.showInputBox({ placeHolder: 'Name of the preset' });

        const chosenName = await promise;

        if (!chosenName && name === undefined) {
            vscode.window.showErrorMessage("Name can't be empty !");
            throw new Error('Name is empty');
        }

        const presets = extContext.globalState.get('presets', {});
        presets[chosenName] = config;
        logger.dbg('saved preset ' + chosenName);

        await extContext.globalState.update('presets', presets);
        return await (name === undefined && vscode.window.showInformationMessage('Preset saved !'));
    });

    presetCommand('loadPreset', async (presets, name, internal) => {
        logger.dbg('command: loadPreset');

        if (!presets || (!name && name !== '')) {
            logger.dbg('error loading presets');
            return;
        }

        await vscode.commands.executeCommand('uncrustify-format.create');
        await vscode.commands.executeCommand('uncrustify-format.save', presets[name]);

        if (!internal) {
            vscode.window.showInformationMessage('Preset loaded !');
        }
    });

    presetCommand('deletePreset', async (presets, name, internal) => {
        logger.dbg('command: deletePreset');

        if (!presets || (!name && name !== '')) {
            logger.dbg('error loading presets');
            return;
        }

        delete presets[name];
        await extContext.globalState.update('presets', presets);
        return await (!internal && vscode.window.showInformationMessage('Preset deleted !'));
    });

    vscode.commands.registerCommand('uncrustify-format.upgrade', async (config) => {
        logger.dbg('command: upgrade');

        if (!config) {
            logger.dbg('error upgrading config: no config passed');
            return;
        }

        await vscode.commands.executeCommand('uncrustify-format.savePreset', config, '');
        await vscode.commands.executeCommand('uncrustify-format.loadPreset', '');
        await vscode.commands.executeCommand('uncrustify-format.deletePreset', '');
        return await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(util.configPath()));
    });
}

export function deactivate() {
    // do nothing
}

export { extContext };

function presetCommand(commandName: string, callback: (presets: any, name: string, internal: boolean) => any) {
    vscode.commands.registerCommand('uncrustify-format.' + commandName, async (name) => {
        logger.dbg('command: ' + commandName);

        const presets = extContext.globalState.get('presets', {});
        const names: string[] = [];

        for (const name in presets) {
            names.push(name);
        }

        if (names.length === 0) {
            vscode.window.showErrorMessage('No presets saved');
            return;
        }

        const promise: Thenable<string> =
            name !== undefined ? Promise.resolve(name) : vscode.window.showQuickPick(names);

        const chosenName = await promise;

        if (!chosenName && name === undefined) {
            throw new Error('No preset selected');
        }

        return callback(presets, chosenName, name !== undefined);
    });
}
