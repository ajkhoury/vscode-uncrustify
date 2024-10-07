# Uncrustify Formatter for Visual Studio Code

[Uncrustify](https://github.com/uncrustify/uncrustify) is a highly configurable source code beautifier for C, C++, C#, ObjectiveC, D, Java, Pawn and VALA.

## Extension settings

* `uncrustify.executablePath.[linux|osx|windows]` (`string`): Path to the uncrustify executable if it's not already in the PATH environment variable.
* `uncrustify.configPath.[linux|osx|windows]` (`string`): Path to the uncrustify configuration file. Environment variables can be used with either a Windows or a bash syntax (examples: `%SOME_PATH%/dev/uncrustify.cfg`, `$SOME_PATH/dev/uncrustify.cfg`). A relative path will be automatically prefixed with the current workspace path.
* `uncrustify.debug` (`boolean`): Activates logs for debugging the extension. Logs should appear in the uncrustify output channel.
* `uncrustify.langOverrides` (`object`): Overrides the language used by uncrustify.

## Installation

- Linux : Uncrustify is available in most distributions as a package in the official repositories (`sudo apt/yum install uncrustify` or equivalent)
- macOS : Uncrustify is available through Homebrew (`brew install uncrustify` or see http://macappstore.org/uncrustify)
- Windows : Prebuilt binaries are available on [sourceforge](https://sourceforge.net/projects/uncrustify/files).

On Windows you will need to install the executable and point the `uncrustify.executablePath.windows` setting to the installed `uncrustify.exe` path, or install it somewhere in your `PATH` environment variable. We recommend installing the `uncrustify` executable in your workspace folder and setting `uncrustify.executablePath.windows` appropriately so it can stay self-contained and compatible between developers.

## Default Formatter

To ensure that the Uncrustify Formatter extension is used over other extensions, be sure to set it as the default formatter in your user or workspace VS Code settings. This setting can be set for a specific language or for all languages:

    {
        // Use Uncrustify for specific languages.
        "[c]": {
            "editor.defaultFormatter": "ajkhoury.uncrustify"
        },
        "[cpp]": {
            "editor.defaultFormatter": "ajkhoury.uncrustify"
        },

        // Use Uncrustify for all languages - NOT RECOMMENDED!
        // "editor.defaultFormatter": "ajkhoury.uncrustify"
    }

## Uncrustify configuration

A default config file can automatically be created (see the [commands](#extension-commands) below).

## Extension commands

* `Uncrustify: Create default config file` (`uncrustify.create`): Creates a default `uncrustify.cfg` file and puts it at the root of the current workspace.
* `Uncrustify: Open config file` (`uncrustify.open`): Opens the configuration file that is currently set in the extension settings.

## Acknowledgements

This extension was originally created and maintained by [@LaurentTreguier](https://github.com/LaurentTreguier). After being archived and removed from the extension marketplace, it was resurrected and maintained by [@zachflower](https://github.com/zachflower). Thank you to any previous authors who created and maintained this extension.
