import * as monaco from "monaco-editor";
import formatter from "@/tools/code/formatter";
import Message from "@/helper/message";

/**
 * 检测 JSON 内容的缩进大小
 * @param content - JSON 字符串内容
 * @returns 每级缩进的空格数
 */
function detectIndentSize(content: string): number {
    const lines = content.split('\n');
    const indents: number[] = [];
    
    for (const line of lines) {
        const indent = line.search(/\S/);
        if (indent > 0) {
            indents.push(indent);
        }
    }
    
    if (indents.length === 0) return 2;
    
    // 找出最小的缩进作为基础单位
    const minIndent = Math.min(...indents);
    return minIndent > 0 ? minIndent : 2;
}

/**
 * 路径栈项接口
 * @property key - 键名或数组索引
 * @property depth - 缩进深度
 */
interface PathItem {
    key: string;
    depth: number;
}

/**
 * 容器信息接口，用于跟踪当前所在的对象或数组
 * @property type - 容器类型：object 或 array
 * @property depth - 容器开始位置的深度
 * @property arrayIndex - 如果是数组，记录当前元素的索引
 */
interface ContainerInfo {
    type: 'object' | 'array';
    depth: number;
    arrayIndex: number;
}

/**
 * 根据光标位置获取 JSON 中对应的键值
 * 支持复杂嵌套结构，包括数组内嵌套对象
 * @param json - 解析后的 JSON 对象
 * @param content - JSON 字符串内容
 * @param lineNumber - 光标所在行号（从 1 开始）
 * @returns 键对应的值，如果未找到则返回 undefined
 */
function getJsonValueAtPosition(json: any, content: string, lineNumber: number): any | undefined {
    const lines = content.split('\n');
    if (lineNumber < 1 || lineNumber > lines.length) return undefined;

    // 检测缩进大小
    const indentSize = detectIndentSize(content);

    // 路径栈，记录从根到当前位置的完整路径
    const pathStack: PathItem[] = [];

    // 容器栈，跟踪当前嵌套的容器类型和深度
    const containerStack: ContainerInfo[] = [];

    // 记录每个容器开始时路径栈的大小，用于回退
    const containerPathSizeStack: number[] = [];

    // 分析到当前行为止的所有行，构建路径
    for (let i = 0; i < lineNumber; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // 跳过空行
        if (trimmedLine === '') continue;

        // 计算当前行的缩进深度
        const indent = line.search(/\S/);
        const depth = indent >= 0 ? Math.floor(indent / indentSize) : 0;

        // 处理容器结束标记 } 或 ]
        if (trimmedLine.startsWith('}') || trimmedLine.startsWith(']')) {
            // 从容器栈中弹出当前容器
            if (containerStack.length > 0) {
                containerStack.pop();
                // 回退路径栈到该容器开始前的大小
                const previousPathSize = containerPathSizeStack.pop();
                if (previousPathSize !== undefined) {
                    pathStack.length = previousPathSize;
                }
            }
            continue;
        }

        // 处理容器开始标记 { 或 [
        if (trimmedLine === '{' || trimmedLine === '[') {
            const parentContainer = containerStack[containerStack.length - 1];

            // 如果父容器是数组，检查是否为新的数组元素
            if (parentContainer && parentContainer.type === 'array') {
                // 判断是否为数组的新元素
                // 新元素的特征：
                // 1. 是对象 {（不是数组 [）
                // 2. 深度比数组容器深（或相等，取决于格式化）
                if (trimmedLine === '{') {
                    // 递增数组索引
                    parentContainer.arrayIndex++;
                    
                    // 如果这不是第一个元素（索引 > 0），或者之前没有添加过索引
                    // 则将数组索引添加到路径栈
                    if (parentContainer.arrayIndex > 0) {
                        // 移除之前的旧索引（如果存在）
                        const lastPathItem = pathStack[pathStack.length - 1];
                        if (lastPathItem && !isNaN(parseInt(lastPathItem.key)) && 
                            lastPathItem.depth === parentContainer.depth) {
                            pathStack.pop();
                        }
                        
                        // 添加新索引
                        pathStack.push({
                            key: parentContainer.arrayIndex.toString(),
                            depth: parentContainer.depth
                        });
                    } else if (parentContainer.arrayIndex === 0) {
                        // 第一个元素，添加索引 0
                        pathStack.push({
                            key: '0',
                            depth: parentContainer.depth
                        });
                    }
                }
            }

            // 记录当前路径栈大小，以便后续回退
            containerPathSizeStack.push(pathStack.length);

            // 将当前容器压入容器栈
            containerStack.push({
                type: trimmedLine === '{' ? 'object' : 'array',
                depth,
                arrayIndex: -1  // 初始化为 -1，首次使用时会递增到 0
            });
            continue;
        }

        // 处理键值对 "key": value
        const keyMatch = trimmedLine.match(/^"([^"]+)"\s*:/);
        if (keyMatch) {
            const key = keyMatch[1];
            const currentContainer = containerStack[containerStack.length - 1];

            // 只有在对象容器内才将键名添加到路径栈
            if (currentContainer && currentContainer.type === 'object') {
                // 清理路径栈中深度大于等于当前深度的项（移除同级或更深层的旧键）
                while (pathStack.length > 0 && pathStack[pathStack.length - 1].depth >= depth) {
                    pathStack.pop();
                }

                // 添加键名到路径栈
                pathStack.push({ key, depth });
            }
            
            // 检查值部分是否直接跟随容器开始标记
            // 例如: "data": [  或  "item": {
            const afterColon = trimmedLine.substring(keyMatch[0].length).trim();
            if (afterColon === '[' || afterColon === '{') {
                // 这是一个内联的容器开始标记，需要立即处理
                const containerType = afterColon === '[' ? 'array' : 'object';
                
                // 记录当前路径栈大小
                containerPathSizeStack.push(pathStack.length);
                
                // 压入新容器
                containerStack.push({
                    type: containerType,
                    depth,
                    arrayIndex: -1
                });
            }
        }
    }

    // 如果路径栈为空，尝试获取当前行的顶级键
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
                // 处理数组索引
                const index = parseInt(item.key);
                if (isNaN(index) || index < 0 || index >= current.length) {
                    return undefined;
                }
                current = current[index];
            } else if (typeof current === 'object') {
                // 处理对象属性
                if (!Object.prototype.hasOwnProperty.call(current, item.key)) {
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

/**
 * 格式化 JSON 值为字符串
 * @param value - 要格式化的值
 * @returns 格式化后的字符串
 */
function formatJsonValue(value: any): string {
    // 字符串：直接返回字符串内容，不添加引号
    if (typeof value === 'string') {
        return value;
    }
    
    // 对象或数组：使用 JSON.stringify 格式化
    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value, null, 2);
    }
    
    // 其他基本类型（数字、布尔值、null）：直接转换为字符串
    return String(value);
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
                        const formattedValue = formatJsonValue(value);
                        navigator.clipboard.writeText(formattedValue);
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
