/**
 * JSON 键值复制功能调试脚本
 * 用于分析 getJsonValueAtPosition 函数的执行过程
 */

// 模拟 getJsonValueAtPosition 函数
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
    
    const minIndent = Math.min(...indents);
    return minIndent > 0 ? minIndent : 2;
}

interface PathItem {
    key: string;
    depth: number;
}

interface ContainerInfo {
    type: 'object' | 'array';
    depth: number;
    arrayIndex: number;
}

function getJsonValueAtPositionWithDebug(json: any, content: string, lineNumber: number): { result: any, debugLog: string[] } {
    const lines = content.split('\n');
    const debugLog: string[] = [];
    
    if (lineNumber < 1 || lineNumber > lines.length) {
        return { result: undefined, debugLog: ['错误：行号超出范围'] };
    }

    const indentSize = detectIndentSize(content);
    debugLog.push(`检测到缩进大小: ${indentSize}`);

    const pathStack: PathItem[] = [];
    const containerStack: ContainerInfo[] = [];
    const containerPathSizeStack: number[] = [];

    for (let i = 0; i < lineNumber; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (trimmedLine === '') continue;

        const indent = line.search(/\S/);
        const depth = indent >= 0 ? Math.floor(indent / indentSize) : 0;

        debugLog.push(`\n第 ${i + 1} 行: "${line.substring(0, 50)}..."`);
        debugLog.push(`  缩进: ${indent}, 深度: ${depth}, 内容: "${trimmedLine}"`);

        // 处理容器结束标记 } 或 ]
        if (trimmedLine.startsWith('}') || trimmedLine.startsWith(']')) {
            debugLog(`  → 容器结束标记`);
            if (containerStack.length > 0) {
                const poppedContainer = containerStack.pop();
                debugLog(`  → 弹出容器: ${poppedContainer?.type} @ depth ${poppedContainer?.depth}`);
                
                const previousPathSize = containerPathSizeStack.pop();
                if (previousPathSize !== undefined) {
                    debugLog(`  → 回退路径栈: ${pathStack.length} → ${previousPathSize}`);
                    pathStack.length = previousPathSize;
                }
            }
            debugLog(`  → 当前路径栈: [${pathStack.map(p => `"${p.key}"@${p.depth}`).join(', ')}]`);
            continue;
        }

        // 处理容器开始标记 { 或 [
        if (trimmedLine === '{' || trimmedLine === '[') {
            const parentContainer = containerStack[containerStack.length - 1];
            debugLog.push(`  → 容器开始标记: ${trimmedLine}`);
            
            if (parentContainer) {
                debugLog(`  → 父容器: ${parentContainer.type} @ depth ${parentContainer.depth}, arrayIndex: ${parentContainer.arrayIndex}`);
            }

            // 如果父容器是数组，检查是否为新的数组元素
            if (parentContainer && parentContainer.type === 'array') {
                if (trimmedLine === '{') {
                    debugLog(`  → 检测到数组内的新对象元素`);
                    parentContainer.arrayIndex++;
                    debugLog(`  → 数组索引递增: ${parentContainer.arrayIndex}`);
                    
                    if (parentContainer.arrayIndex > 0) {
                        const lastPathItem = pathStack[pathStack.length - 1];
                        if (lastPathItem && !isNaN(parseInt(lastPathItem.key)) && 
                            lastPathItem.depth === parentContainer.depth) {
                            debugLog(`  → 移除旧索引: "${lastPathItem.key}"@${lastPathItem.depth}`);
                            pathStack.pop();
                        }
                        
                        debugLog(`  → 添加新索引: "${parentContainer.arrayIndex.toString()}"@${parentContainer.depth}`);
                        pathStack.push({
                            key: parentContainer.arrayIndex.toString(),
                            depth: parentContainer.depth
                        });
                    } else if (parentContainer.arrayIndex === 0) {
                        debugLog(`  → 添加第一个索引: "0"@${parentContainer.depth}`);
                        pathStack.push({
                            key: '0',
                            depth: parentContainer.depth
                        });
                    }
                }
            }

            containerPathSizeStack.push(pathStack.length);
            debugLog(`  → 记录路径栈大小: ${pathStack.length}`);

            containerStack.push({
                type: trimmedLine === '{' ? 'object' : 'array',
                depth,
                arrayIndex: -1
            });
            debugLog(`  → 压入容器: ${trimmedLine === '{' ? 'object' : 'array'} @ depth ${depth}`);
            debugLog(`  → 当前路径栈: [${pathStack.map(p => `"${p.key}"@${p.depth}`).join(', ')}]`);
            continue;
        }

        // 处理键值对 "key": value
        const keyMatch = trimmedLine.match(/^"([^"]+)"\s*:/);
        if (keyMatch) {
            const key = keyMatch[1];
            const currentContainer = containerStack[containerStack.length - 1];

            debugLog(`  → 找到键: "${key}"`);
            
            if (currentContainer) {
                debugLog(`  → 当前容器: ${currentContainer.type} @ depth ${currentContainer.depth}`);
            }

            if (currentContainer && currentContainer.type === 'object') {
                while (pathStack.length > 0 && pathStack[pathStack.length - 1].depth >= depth) {
                    const removed = pathStack.pop();
                    debugLog(`  → 移除旧键: "${removed?.key}"@${removed?.depth}`);
                }

                pathStack.push({ key, depth });
                debugLog(`  → 添加新键: "${key}"@${depth}`);
            } else if (!currentContainer || currentContainer.type !== 'object') {
                debugLog(`  → 跳过（不在对象容器内）`);
            }
            
            debugLog(`  → 当前路径栈: [${pathStack.map(p => `"${p.key}"@${p.depth}`).join(', ')}]`);
        }
    }

    debugLog.push(`\n最终路径栈: [${pathStack.map(p => `"${p.key}"@${p.depth}`).join(', ')}]`);

    // 获取值
    let result: any = undefined;
    try {
        if (pathStack.length === 0) {
            const currentLine = lines[lineNumber - 1];
            const keyMatch = currentLine.match(/"([^"]+)"\s*:/);
            if (keyMatch && Object.prototype.hasOwnProperty.call(json, keyMatch[1])) {
                result = json[keyMatch[1]];
                debugLog.push(`\n从顶级获取值: ${JSON.stringify(result)}`);
            } else {
                debugLog.push(`\n未找到顶级键`);
            }
        } else {
            let current = json;
            for (const item of pathStack) {
                debugLog.push(`\n遍历路径: "${item.key}"@${item.depth}`);
                debugLog.push(`  当前值类型: ${Array.isArray(current) ? 'array' : typeof current}`);
                
                if (current === null || current === undefined) {
                    debugLog.push(`  值为空或 undefined，停止`);
                    break;
                }

                if (Array.isArray(current)) {
                    const index = parseInt(item.key);
                    debugLog.push(`  作为数组访问索引: ${index}`);
                    if (isNaN(index) || index < 0 || index >= current.length) {
                        debugLog.push(`  索引无效！数组长度: ${current.length}`);
                        result = undefined;
                        break;
                    }
                    current = current[index];
                    debugLog.push(`  结果: ${JSON.stringify(current)?.substring(0, 50)}...`);
                } else if (typeof current === 'object') {
                    debugLog.push(`  作为对象访问属性: "${item.key}"`);
                    if (!Object.prototype.hasOwnProperty.call(current, item.key)) {
                        debugLog.push(`  属性不存在！可用属性: ${Object.keys(current).join(', ')}`);
                        result = undefined;
                        break;
                    }
                    current = current[item.key];
                    debugLog.push(`  结果: ${JSON.stringify(current)?.substring(0, 50)}...`);
                } else {
                    debugLog.push(`  不是对象或数组，无法继续`);
                    result = undefined;
                    break;
                }
            }
            result = current;
        }
    } catch (e) {
        debugLog.push(`\n异常: ${e}`);
        result = undefined;
    }

    debugLog.push(`\n最终结果: ${JSON.stringify(result)}`);

    return { result, debugLog };
}

// 测试用例 1：原始问题场景
console.log('='.repeat(100));
console.log('调试测试：数组内嵌套对象的 item_id 复制');
console.log('='.repeat(100));

const testCase1 = `{
    "data": [
        {
            "clicks_total": 4128,
            "comment_total": 1,
            "updated_at": "2026-02-28T08:10:09"
        },
        {
            "item_id": "309ee95ca5de4992199212c9C8aaa4b66",
            "full_name": "rtk-ai/rtk",
            "title": "降低 Token 消耗的命令行工具"
        }
    ]}`;

const parsedJson1 = JSON.parse(testCase1);

console.log('\n📌 测试：复制 item_id（第 12 行）');
const test1 = getJsonValueAtPositionWithDebug(parsedJson1, testCase1, 12);
test1.debugLog.forEach(log => console.log(log));

console.log('\n\n' + '='.repeat(100));
console.log('预期结果: "309ee95ca5de4992199212c9C8aaa4b66"');
console.log('实际结果:', JSON.stringify(test1.result));
console.log('测试', test1.result === "309ee95ca5de4992199212c9C8aaa4b66" ? '通过 ✅' : '失败 ❌');
