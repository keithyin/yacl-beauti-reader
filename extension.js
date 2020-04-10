// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('yacl-beauti-reader.helloWorld', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		const editor = vscode.window.activeTextEditor;
		let line = editor.selection.active.line;
		let totline = editor.document.lineCount;
		let level_tracer = 100;
		let levelinfomation = "";

		for (var i = line; i >= 0; i--) {
			let cur_line_text = editor.document.lineAt(i).text;

			if (is_scope_line(cur_line_text)) {
				let level = levelcounter(cur_line_text);
				if (level < level_tracer) {
					level_tracer = level;
					let key_of_scope = "";
					if (check_if_scope_has_key(cur_line_text)) {
						key_of_scope = get_key_of_scope(i, totline, editor);
					}
					let curlevelinfo = strip(cur_line_text) + strip(key_of_scope);
					curlevelinfo = to_exp_setting_fmt(curlevelinfo, level_tracer);
					levelinfomation = curlevelinfo + levelinfomation;
				}
				
			} else if (!is_scope_line(cur_line_text) && i == line) {
				// 光标所在的行进行单独处理
				levelinfomation = to_exp_setting_fmt(get_param_name(cur_line_text), level_tracer);
			}
			if (level_tracer == 0) break;
		}
		// TODO: 处理一下最后一行
		vscode.window.showInformationMessage("level-info: \n" + levelinfomation);
		
	});

	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

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
	text = text.replace(/\s/g, "");
	text = text.replace("\n", "").replace("\r", "");
	return text;
}

function to_exp_setting_fmt(text, level) {
	if (text == "") return text;

	var pos = text.search("@");
	if (pos >= 0) {
		// 如果是key相关的, [..@match_type_params]match_type:14 --> .match_type_params[match_type=14]
		text = text.replace("[", "").replace(/\./g, "").replace("@", "").replace(":", "=");
		text = text.replace("]", "[");
		text = text + "]";
		
	} else {
		text = text.replace("[", "").replace("]", "").replace(/\./g, "");
	}
	if (level > 0) text = "." + text;
	return text;
}

function check_if_scope_has_key(text) {
	// 包含 @ 的 scope 是有 key 的
	var pos = text.search("@");
	return pos >= 0;
}

function get_param_name(text) {
	var vals = text.split(":")
	var param_name = "";
	for (var i = 0; i < vals.length; i++) {
		param_name = vals[i];
		break;
	}
	param_name = strip(param_name);
	return param_name;
}

function is_scope_line(text){
	// 将 包含 [ ...] 的行称之为 scope line
	let reg = /\[.*\]/i;
	let res = reg.exec(text);
	return res != null;
}

function get_key_of_scope(curpos, totline, editor) {
	// 如果是有 key 的scope 就可以用这个函数来找到他的 key
	let key_of_scope = "";
	for (var j = curpos + 1; j < totline; j++){
		key_of_scope = editor.document.lineAt(j).text;
		if (strip(key_of_scope) != "") break;
	}
	return key_of_scope;
}

module.exports = {
	activate,
	deactivate
}
