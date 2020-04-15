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
            levelinfomation = 'line=' + line + ': ' + levelinfomation;
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

    let expparamposition = vscode.commands.registerCommand(
        "yacl-beauti-reader.expParamPosition", function () {
            let editor = vscode.window.activeTextEditor;
            const options = {
                ignoreFocusOut: true,
                password: false,
                prompt: "Please type the params (src_conf[src_id=1262].upin_title_time_interval)"
            };
            vscode.window.showInputBox(options).then(function (value) {
                if (value === undefined || strip(value) === '') {
                    vscode.window.showInformationMessage('Please type the params');
                } else {
                    value = strip(value);
                    let params = value.split(".");
                    console.log("params", params);
                    let curline = editor.selection.active.line;
                    let position = get_position_through_exp_params(params, 0, editor.document.lineCount, 0);
                    if (position != curline) {
                        vscode.commands.executeCommand("cursorMove", {
                            to: position > curline ? "down" : "up",
                            by: "line",
                            select: false,
                            value: position > curline ? (position - curline) : (curline - position)
                        });
                    }
                }
            });

        });


    context.subscriptions.push(disposable);
    context.subscriptions.push(confdiff_generator);
    context.subscriptions.push(expparamposition);
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
            let level = whichlevelami(cur_line_text);
            if (level < level_tracer) {
                level_tracer = level;
                let key_of_scope = '';
                if (does_scope_has_key(cur_line_text)) {
                    let result = get_key_of_scope(i, totline, editor.document);
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
            let level = whichlevelami(cur_line_text);
            if (level < level_tracer) {
                level_tracer = level;
                let key_of_scope = '';
                if (does_scope_has_key(cur_line_text) && i != line) {
                    let result = get_key_of_scope(i, totline, editor.document);
                    // else 部分是为了处理 插入的 line 是 一个key的情况. 例如:animation_mt_info[2].mt_id:16557
                    if (result["line"] != line) key_of_scope = result["info"];
                    else key_of_scope = get_scope_insert_postion(i) + "";

                } else if (does_scope_has_key(cur_line_text) && i == line) {
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

function whichlevelami(text) {
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
    scopetext = strip(scopetext);
    keytext = strip(keytext);
    if (scopetext + keytext == '') return "";

    var text = scopetext + keytext;
    if (does_scope_has_key(scopetext)) {
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


function does_scope_has_key(text) {
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
    // 将 包含 [ ] 的行称之为 scope line
    let reg = /\[.*\]/i;
    let res = reg.exec(text);
    return res != null;
}

function get_key_of_scope(curpos, totline, document) {
    // 如果是有 key 的scope 就可以用这个函数来找到他的 key
    if (!is_scope_line(document.lineAt(curpos).text))
        return { "info": "", "line": curpos };

    let key_of_scope = '';
    let j = curpos + 1;
    for (; j < totline; j++) {
        key_of_scope = document.lineAt(j).text;
        if (strip(key_of_scope) != '') break;
    }
    var result = { "info": key_of_scope, "line": j };
    return result;
}

function get_scope_insert_postion(line) {
    const document = vscode.window.activeTextEditor.document;
    let level = whichlevelami(document.lineAt(line).text);
    let postion = 0;
    for (var i = line; i >= 0; i--) {
        let cur_line_text = document.lineAt(i).text;
        if (is_scope_line(cur_line_text) && i != line) {
            let curlevel = whichlevelami(cur_line_text);
            if (level == curlevel) {
                postion++;
            } else {
                break;
            }
        }
    }
    return postion;
}

function is_repeated_param(text) {
    // 对 .conf 文件中, 有 @ 的是可重复参数, 对于 expparam 来说, 有 name[val] 是可重复的
    return text.indexOf("@") != -1 || text.indexOf("[") != -1;
}

function wrap_repeated_param(text, counter) {
    if (is_repeated_param(text)) {
        text = text.replace("@", "");
        return text + "[" + counter + "]";
    }
    return text;
}

function is_reapeated_param_matching(text1, text2) {
    // 对于 repeated param 做了特殊处理, 不是 repeated 的 inner 参数 也可以使用
    text1 = text1.replace("@", "").split("[")[0];
    text2 = text2.replace("@", "").split("[")[0];
    return text1 == text2;
}

function get_position_through_exp_params(params, iterpos, totline, curparamssegment) {
    // params 是 src_conf[src_id=1262].upin_title_time_interval 通过split(".") 构成的 array
    // iterpos 当前迭代所在的行数, totline: 当前文件的行数, curparamssegment: 匹配到什么位置了.
    // curlevel: 当前的目标等级
    const document = vscode.window.activeTextEditor.document;
    if (curparamssegment >= params.length) return iterpos;
    let curtarget = params[curparamssegment];
    console.log("curtarget: ", curtarget, " from line=", iterpos + 1, "to search");
    console.log("cursegment:", curparamssegment, "params.length=", params.length);
    let repeated_param_counter = -1;
    for (let i = iterpos; i < totline; i++) {
        let curlinetext = document.lineAt(i).text;
        if ((curparamssegment < params.length - 1) && is_scope_line(curlinetext)) {
            let val = "";
            let nextline = i + 1;
            if (does_scope_has_key(curlinetext)) {
                let result = get_key_of_scope(i, totline, document);
                val = to_exp_setting_fmt(curlinetext, result["info"], 0);
                nextline = result["line"] + 1;
            } else {
                val = to_exp_setting_fmt(curlinetext, "", 0);
            }
            if (val == curtarget) {
                return get_position_through_exp_params(params, nextline, totline, curparamssegment + 1);
            }
        } else if (curparamssegment == params.length - 1 && !is_scope_line(curlinetext)) {
            // 参数层级的最后一级必然不是 scope line
            // 对于@param 要特殊处理一下
            console.log("currentline=", get_param_name(curlinetext), "position=", i);
            if (is_repeated_param(curtarget)) {
                if (is_reapeated_param_matching(curtarget, get_param_name(curlinetext))) {
                    repeated_param_counter++;
                }
                console.log("repeated_param_counter=", repeated_param_counter);
                if (wrap_repeated_param(get_param_name(curlinetext), repeated_param_counter) == curtarget) {
                    return i;
                }
            } else {
                if (get_param_name(curlinetext) == curtarget) return i;
            }
        } else if (curparamssegment == params.length - 1 && is_scope_line(curlinetext)) {
            break;
        }
    }
    return -1;
}

module.exports = {
    activate,
    deactivate
}
