// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors
    // (console.error) This line of code will only be executed once when your
    // extension is activated

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let outputchannelwithline =
        vscode.window.createOutputChannel('LevelInfoWithLine');
    let outputchannelwithoutline =
        vscode.window.createOutputChannel('LevelInfoWithoutLine');

    let disposable = vscode.commands.registerCommand(
        'yacl-beauti-reader.helloWorld', function () {
            // The code you place here will be executed every time your command is
            // executed
            var result = whereami();
            var levelinfomation = result["info"];
            var line = result["line"];
            outputchannelwithoutline.appendLine(levelinfomation);
            outputchannelwithoutline.show();
            levelinfomation = 'line=' + (line + 1) + ': ' + levelinfomation;
            outputchannelwithline.appendLine(levelinfomation);
            outputchannelwithline.show();
        });

    let confdiffoutputchannel =
        vscode.window.createOutputChannel('confdiff');
    let confdiff_generator = vscode.commands.registerCommand(
        'yacl-beauti-reader.confdiffGenerator', function () {
            // 1, 插入scope 与 插入 param 的格式是不同的. 插入scope需要 [..], 插入value则不是
            let result = confdiffgenerator();
            confdiffoutputchannel.appendLine(result["info"]);
            confdiffoutputchannel.show();
        });



    context.subscriptions.push(disposable);
    context.subscriptions.push(confdiff_generator);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

function whereami() {
    const editor = vscode.window.activeTextEditor;
    let line = editor.selection.active.line;
    let totline = editor.document.lineCount;
    let level_tracer = 100;
    let levelinfomation = '';

    for (var i = line; i >= 0; i--) {
        let cur_line_text = editor.document.lineAt(i).text;

        if (is_scope_line(cur_line_text)) {
            let level = levelcounter(cur_line_text);
            if (level < level_tracer) {
                level_tracer = level;
                let key_of_scope = '';
                if (check_whether_scope_has_key(cur_line_text)) {
                    let result = get_key_of_scope(i, totline, editor);
                    key_of_scope = result["info"];
                }
                let curlevelinfo = to_exp_setting_fmt(strip(cur_line_text), strip(key_of_scope), level_tracer);
                levelinfomation = curlevelinfo + levelinfomation;
            }

        } else if (!is_scope_line(cur_line_text) && i == line) {
            // 光标所在的行进行单独处理, 将 参数名搞出来, 然后前面加个. 就可以了
            levelinfomation =
                to_exp_setting_fmt("", get_param_name(cur_line_text), level_tracer);
        }
        if (level_tracer == 0) break;
    }

    var result = { "info": levelinfomation, "line": line + 1 };
    return result;
}

function confdiffgenerator() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;
    let line = editor.selection.active.line;
    let totline = document.lineCount;
    let level_tracer = 100;
    let levelinfomation = '';
    let is_a_scope = is_scope_line(document.lineAt(line).text);

    for (var i = line; i >= 0; i--) {
        let cur_line_text = document.lineAt(i).text;
        console.log("position=", cur_line_text);

        if (is_scope_line(cur_line_text)) {
            let level = levelcounter(cur_line_text);
            if (level < level_tracer) {
                level_tracer = level;
                let key_of_scope = '';
                if (check_whether_scope_has_key(cur_line_text) && i != line) {
                    let result = get_key_of_scope(i, totline, editor);
                    // else 部分是为了处理 插入的 line 是 一个key的情况. 例如:animation_mt_info[2].mt_id:16557
                    if (result["line"] != line) key_of_scope = result["info"];
                    else key_of_scope = get_scope_insert_postion(i) + "";

                } else if (check_whether_scope_has_key(cur_line_text) && i == line) {
                    // 插入 scope 的格式为 [animation_mt_info[2]], 如果想用 [@animation_mt_info] 自己手动改就好
                    key_of_scope = get_scope_insert_postion(i) + "";
                }
                console.log("key of scope=", key_of_scope);
                let curlevelinfo = to_exp_setting_fmt(strip(cur_line_text), strip(key_of_scope), level_tracer);
                levelinfomation = curlevelinfo + levelinfomation;
            }

        } else if (!is_scope_line(cur_line_text) && i == line) {
            // 光标所在的行进行单独处理, 将 参数名搞出来, 然后前面加个. 就可以了
            levelinfomation =
                to_exp_setting_fmt("", get_param_name_and_value(cur_line_text), level_tracer);
            console.log(levelinfomation);
        }
        if (level_tracer == 0) break;
    }
    if (is_a_scope) {
        levelinfomation = "[" + levelinfomation + "]";
    }

    var result = { "info": levelinfomation, "line": line + 1 };
    return result;
}

function levelcounter(text) {
    var textlength = text.length;
    var level = 0;
    for (var i = 0; i < textlength; i++) {
        if (text[i] == '.') {
            level++;
        }
    }
    return level;
}

function strip(text) {
    text = text.replace(/\s/g, '');
    text = text.replace('\n', '').replace('\r', '');
    return text;
}

function to_exp_setting_fmt(scopetext, keytext, level) {
    if (scopetext + keytext == '') return "";

    var text = scopetext + keytext;
    if (check_whether_scope_has_key(scopetext)) {
        // 如果是key相关的, [..@match_type_params]match_type:14 -->
        // .match_type_params[match_type=14]

        text = text.replace('[', '').replace(/\./g, '').replace('@', '').replace(
            ':', '=');
        text = text.replace(']', '[');
        text = text + ']';
    } else {
        text = text.replace('[', '').replace(']', '').replace(/\./g, '');
    }
    if (level > 0) text = '.' + text;
    return text;
}


function check_whether_scope_has_key(text) {
    // 包含 @ 的 scope 是有 key 的
    var pos = text.search('@');
    return pos >= 0;
}

function get_param_name(text) {
    var vals = text.split(':')
    var param_name = '';
    for (var i = 0; i < vals.length; i++) {
        param_name = vals[i];
        break;
    }
    param_name = strip(param_name);
    return param_name;
}

function get_param_name_and_value(text) {
    return strip(text);
}

function is_scope_line(text) {
    // 将 包含 [ ...] 的行称之为 scope line
    let reg = /\[.*\]/i;
    let res = reg.exec(text);
    return res != null;
}

function get_key_of_scope(curpos, totline, editor) {
    // 如果是有 key 的scope 就可以用这个函数来找到他的 key
    let key_of_scope = '';
    let j = curpos + 1;
    for (; j < totline; j++) {
        key_of_scope = editor.document.lineAt(j).text;
        if (strip(key_of_scope) != '') break;
    }
    var result = { "info": key_of_scope, "line": j };
    return result;
}

function get_scope_insert_postion(line) {
    const document = vscode.window.activeTextEditor.document;
    let level = levelcounter(document.lineAt(line).text)
    let postion = 0;
    for (var i = line; i >= 0; i--) {
        let cur_line_text = document.lineAt(i).text;
        if (is_scope_line(cur_line_text) && i != line) {
            let curlevel = levelcounter(cur_line_text);
            if (level == curlevel) {
                postion++;
            } else {
                break;
            }

        }
    }
    return postion
}

module.exports = {
    activate,
    deactivate
}
