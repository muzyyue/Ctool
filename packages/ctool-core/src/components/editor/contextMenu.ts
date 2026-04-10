import * as monaco from "monaco-editor";
import formatter from "@/tools/code/formatter";
import Message from "@/helper/message";

/**
 * 根据光标位置获取 JSON 中对应的键值
 * @param json - 解析后的 JSON 对象
 * @param content - JSON 字符串内容
 * @param lineNumber - 光标所在行号
 * @returns 键对应的值，如果未找到则返回 undefined
 */
function getJsonValueAtPosition(json: any, content: string, lineNumber: number): any | undefined {
    const lines = content.split('\n');
    if (lineNumber < 1 || lineNumber > lines.length) return undefined;
    
    // 构建路径栈，记录每一行的键和层级关系
    const pathStack: Array<{key: string, depth: number}> = [];
    let currentDepth = 0;
    
    // 分析到当前行为止的所有行，构建路径
    for (let i = 0; i < lineNumber; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // 计算当前行的缩进深度
        const indent = line.search(/\S/);
        const depth = Math.floor(indent / 2); // 假设每级缩进2个空格
        
        // 如果遇到 } 或 ]，减少深度
        if (trimmedLine.startsWith('}') || trimmedLine.startsWith(']')) {
            currentDepth = depth;
            // 移除栈中深度大于等于当前深度的元素
            while (pathStack.length > 0 && pathStack[pathStack.length - 1].depth >= currentDepth) {
                pathStack.pop();
            }
            continue;
        }
        
        // 查找键名
        const keyMatch = trimmedLine.match(/^"([^"]+)"\s*:/);
        if (keyMatch) {
            const key = keyMatch[1];
            
            // 移除栈中深度大于等于当前深度的元素
            while (pathStack.length > 0 && pathStack[pathStack.length - 1].depth >= depth) {
                pathStack.pop();
            }
            
            // 添加当前键到栈中
            pathStack.push({key, depth});
            currentDepth = depth;
        }
        
        // 处理数组索引
        const arrayItemMatch = trimmedLine.match(/^(\d+):/);
        if (arrayItemMatch) {
            const index = parseInt(arrayItemMatch[1]);
            while (pathStack.length > 0 && pathStack[pathStack.length - 1].depth >= depth) {
                pathStack.pop();
            }
            pathStack.push({key: index.toString(), depth});
            currentDepth = depth;
        }
    }
    
    // 如果路径栈为空，尝试获取当前行的键
    if (pathStack.length === 0) {
        const currentLine = lines[lineNumber - 1];
        const keyMatch = currentLine.match(/"([^"]+)"\s*:/);
        if (keyMatch && json.hasOwnProperty(keyMatch[1])) {
            return json[keyMatch[1]];
        }
        return undefined;
    }
    
    // 根据路径栈获取值
    try {
        let current = json;
        for (const item of pathStack) {
            if (current === null || current === undefined) return undefined;
            
            if (Array.isArray(current)) {
                const index = parseInt(item.key);
                if (isNaN(index) || index < 0 || index >= current.length) {
                    return undefined;
                }
                current = current[index];
            } else if (typeof current === 'object') {
                if (!current.hasOwnProperty(item.key)) {
                    return undefined;
                }
                current = current[item.key];
            } else {
                return undefined;
            }
        }
        return current;
    } catch (e) {
        return undefined;
    }
}


// 自定义右键菜单
const lists = [
    "ctool_multiple_selection",
    "ctool_beautify",
    "ctool_compress",
    "ctool_line_wrapping",
    "ctool_line_number",
    "ctool_goto",
    "ctool_search",
    "ctool_copy_json_value",
] as const;

type contextMenuType = (typeof lists)[number];
type menuHandle = (ed: monaco.editor.ICodeEditor, id: contextMenuType, result?: any) => any;

const menuDefinition = (): {
    id: contextMenuType;
    label: string;
    contextMenuGroupId?: string;
    enable?: boolean;
    run?: menuHandle;
}[] => {
    return [
        // 列选择
        {
            id: "ctool_multiple_selection",
            label: $t(`component_editor_multiple`),
            contextMenuGroupId: "1_modification",
            enable: true,
            run: (ed, id) => {
                ed.trigger(id, "editor.action.insertCursorAtEndOfEachLineSelected", "");
            },
        },
        // 查找/替换
        {
            id: "ctool_search",
            label: $t(`component_editor_search`),
            contextMenuGroupId: "1_modification",
            enable: true,
            run: (ed, id) => {
                ed.trigger(id, "editor.action.startFindReplaceAction", null);
            },
        },
        // 跳转
        {
            id: "ctool_goto",
            label: $t(`component_editor_goto`),
            contextMenuGroupId: "1_modification",
            enable: true,
            run: ed => ed.trigger("", "editor.action.gotoLine", null),
        },
        // 格式化
        {
            id: "ctool_beautify",
            label: $t(`code_beautify`),
            run: async ed => {
                const lang = ed.getModel()?.getLanguageId() || "";
                if (!formatter.isEnable(lang, "beautify") || ed.getValue() === "") {
                    return;
                }
                const result = await formatter.simple(lang, "beautify", ed.getValue());
                if (result !== ed.getValue()) {
                    ed.setValue(result);
                }
            },
        },
        // 压缩
        {
            id: "ctool_compress",
            label: $t(`code_compress`),
            run: async ed => {
                const lang = ed.getModel()?.getLanguageId() || "";
                if (!formatter.isEnable(lang, "compress") || ed.getValue() === "") {
                    return;
                }
                const result = await formatter.simple(lang, "compress", ed.getValue());
                if (result !== ed.getValue()) {
                    ed.setValue(result);
                }
            },
        },
        // 自动换行
        {
            id: "ctool_line_wrapping",
            label: $t(`component_editor_line_wrapping`),
            enable: true,
            run: ed => {
                ed.updateOptions({ wordWrap: ed.getRawOptions().wordWrap === "off" ? "on" : "off" });
                return ed.getRawOptions().wordWrap === "on";
            },
        },
        // 显示行号
        {
            id: "ctool_line_number",
            label: $t(`component_editor_line_number`),
            enable: true,
            run: ed => {
                ed.updateOptions({ lineNumbers: ed.getRawOptions().lineNumbers === "off" ? "on" : "off" });
                return ed.getRawOptions().lineNumbers === "on";
            },
        },
        // 复制JSON键值
        {
            id: "ctool_copy_json_value",
            label: $t(`json_copy_value`),
            enable: false,
            run: ed => {
                const position = ed.getPosition();
                if (!position) return;
                
                const model = ed.getModel();
                if (!model) return;
                
                const content = ed.getValue();
                if (!content.trim()) return;
                
                try {
                    const json = JSON.parse(content);
                    const value = getJsonValueAtPosition(json, content, position.lineNumber);
                    
                    if (value !== undefined) {
                        navigator.clipboard.writeText(JSON.stringify(value, null, 2));
                        Message.success($t('json_copy_value_success'));
                    } else {
                        Message.info($t('json_copy_value_not_found'));
                    }
                } catch (e) {
                    Message.error($t('json_copy_value_error'));
                }
            },
        },
    ];
};

class contextMenu {
    private editor: monaco.editor.IStandaloneCodeEditor;

    private handles: { [key in contextMenuType]?: menuHandle } = {};

    constructor(editor: monaco.editor.IStandaloneCodeEditor) {
        this.editor = editor;
        this.initMenu();
        this.editor.onDidChangeModelLanguage(e => {
            this.toggle("ctool_beautify", formatter.isEnable(e.newLanguage, "beautify"));
            this.toggle("ctool_compress", formatter.isEnable(e.newLanguage, "compress"));
            this.removeDefaultMenu();
        });
        this.removeDefaultMenu();
    }

    private removeDefaultMenu() {
        setTimeout(() => {
            // 移除多余右键菜单
            this.editor.createContextKey("editorHasDocumentFormattingProvider", false);
            // this.editor.createContextKey("editorHasDocumentSymbolProvider", false);
            this.editor.createContextKey("editorHasReferenceProvider", false);
            this.editor.createContextKey("editorHasDefinitionProvider", false);
            this.editor.createContextKey("editorHasDocumentSelectionFormattingProvider", false);
            this.editor.createContextKey("editorHasMultipleDocumentFormattingProvider", false);
            this.editor.createContextKey("editorHasMultipleDocumentSelectionFormattingProvider", false);
        }, 200);
    }

    initMenu() {
        let index = 1000;
        menuDefinition().forEach(item => {
            const action: monaco.editor.IActionDescriptor = {
                id: item.id,
                precondition: item.id,
                label: item.label,
                contextMenuGroupId: item.contextMenuGroupId || "ctool",
                contextMenuOrder: index++,
                run: editor => {
                    if (item.run) {
                        const result = item.run(editor, item.id);
                        this.handles[item.id]?.(editor, item.id, result);
                        return;
                    }
                    this.handles[item.id]?.(editor, item.id);
                },
            };
            this.toggle(item.id, !!item.enable);
            this.editor.addAction(action);
        });
    }

    setHandle(id: contextMenuType, handle: menuHandle) {
        this.handles[id] = handle;
    }

    toggle(id: contextMenuType, status: boolean) {
        return this.editor.createContextKey(id, status);
    }
}

export default contextMenu;
