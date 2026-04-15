/**
 * JSON 键值复制功能测试脚本
 * 用于验证 getJsonValueAtPosition 函数在各种场景下的正确性
 */

// 模拟 getJsonValueAtPosition 函数（从 contextMenu.ts 提取的核心逻辑）
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

function getJsonValueAtPosition(json: any, content: string, lineNumber: number): any | undefined {
    const lines = content.split('\n');
    if (lineNumber < 1 || lineNumber > lines.length) return undefined;

    const indentSize = detectIndentSize(content);

    const pathStack: PathItem[] = [];
    const containerStack: ContainerInfo[] = [];
    
    // 记录每个容器开始时路径栈的大小，用于回退
    const containerPathSizeStack: number[] = [];

    for (let i = 0; i < lineNumber; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (trimmedLine === '') continue;

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
                if (trimmedLine === '{') {
                    // 递增数组索引
                    parentContainer.arrayIndex++;
                    
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
            const afterColon = trimmedLine.substring(keyMatch[0].length).trim();
            if (afterColon === '[' || afterColon === '{') {
                const containerType = afterColon === '[' ? 'array' : 'object';
                
                containerPathSizeStack.push(pathStack.length);
                
                containerStack.push({
                    type: containerType,
                    depth,
                    arrayIndex: -1
                });
            }
        }
    }

    if (pathStack.length === 0) {
        const currentLine = lines[lineNumber - 1];
        const keyMatch = currentLine.match(/"([^"]+)"\s*:/);
        if (keyMatch && Object.prototype.hasOwnProperty.call(json, keyMatch[1])) {
            return json[keyMatch[1]];
        }
        return undefined;
    }

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

// 测试结果记录
interface TestResult {
    testName: string;
    passed: boolean;
    expected: any;
    actual: any;
    errorMessage?: string;
}

const testResults: TestResult[] = [];

/**
 * 运行单个测试用例
 */
function runTest(testName: string, jsonContent: string, targetLine: number, expectedValue: any) {
    try {
        const parsedJson = JSON.parse(jsonContent);
        const result = getJsonValueAtPosition(parsedJson, jsonContent, targetLine);
        
        const passed = JSON.stringify(result) === JSON.stringify(expectedValue);
        
        testResults.push({
            testName,
            passed,
            expected: expectedValue,
            actual: result,
            errorMessage: passed ? undefined : `Expected ${JSON.stringify(expectedValue)} but got ${JSON.stringify(result)}`
        });
        
        console.log(`${passed ? '✅' : '❌'} ${testName}`);
        if (!passed) {
            console.log(`   Expected: ${JSON.stringify(expectedValue)}`);
            console.log(`   Actual: ${JSON.stringify(result)}`);
        }
    } catch (error) {
        testResults.push({
            testName,
            passed: false,
            expected: expectedValue,
            actual: error,
            errorMessage: String(error)
        });
        console.log(`❌ ${testName} - Error: ${error}`);
    }
}

console.log('='.repeat(80));
console.log('JSON 键值复制功能测试报告');
console.log('='.repeat(80));
console.log('');

// ============================================
// 测试用例 1：数组内嵌套对象（item_id 场景）
// ============================================
console.log('📋 测试组 1：数组内嵌套对象（原始问题场景）');
console.log('-'.repeat(80));

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
    ]
}`;

const lines1 = testCase1.split('\n');

runTest(
    '复制数组第二个元素的 item_id',
    testCase1,
    12, // "item_id" 所在行（第 12 行）
    "309ee95ca5de4992199212c9C8aaa4b66"
);

runTest(
    '复制数组第一个元素的 clicks_total',
    testCase1,
    5, // "clicks_total" 所在行
    4128
);

runTest(
    '复制数组第一个元素的 comment_total',
    testCase1,
    6, // "comment_total" 所在行
    1
);

runTest(
    '复制数组第二个元素的 full_name',
    testCase1,
    13, // "full_name" 所在行
    "rtk-ai/rtk"
);

console.log('');

// ============================================
// 测试用例 2：简单对象结构
// ============================================
console.log('📋 测试组 2：简单对象结构');
console.log('-'.repeat(80));

const testCase2 = `{
    "name": "Alice",
    "age": 30,
    "city": "Beijing"
}`;

runTest(
    '复制简单对象的 name 属性',
    testCase2,
    2, // "name" 所在行
    "Alice"
);

runTest(
    '复制简单对象的 age 属性',
    testCase2,
    3, // "age" 所在行
    30
);

runTest(
    '复制简单对象的 city 属性',
    testCase2,
    4, // "city" 所在行
    "Beijing"
);

console.log('');

// ============================================
// 测试用例 3：多层嵌套结构
// ============================================
console.log('📋 测试组 3：多层嵌套结构');
console.log('-'.repeat(80));

const testCase3 = `{
    "level1": {
        "level2": {
            "level3": {
                "value": "deep_value",
                "number": 42
            },
            "other": "level2_value"
        },
        "sibling": "level1_sibling"
    }
}`;

runTest(
    '复制三层嵌套的 value 属性',
    testCase3,
    5, // "value" 所在行
    "deep_value"
);

runTest(
    '复制三层嵌套的 number 属性',
    testCase3,
    6, // "number" 所在行
    42
);

runTest(
    '复制二层嵌套的 other 属性',
    testCase3,
    8, // "other" 所在行
    "level2_value"
);

console.log('');

// ============================================
// 测试用例 4：不同缩进格式
// ============================================
console.log('📋 测试组 4：不同缩进格式');
console.log('-'.repeat(80));

// 4 个空格缩进
const testCase4_4spaces = `{
    "data": [
        {
            "id": "12345",
            "name": "test_4space"
        }
    ]
}`;

runTest(
    '4 空格缩进 - 复制数组内对象的 id',
    testCase4_4spaces,
    5, // "id" 所在行
    "12345"
);

// 2 个空格缩进
const testCase4_2spaces = `{
  "data": [
    {
      "id": "67890",
      "name": "test_2space"
    }
  ]
}`;

runTest(
    '2 空格缩进 - 复制数组内对象的 id',
    testCase4_2spaces,
    5, // "id" 所在行
    "67890"
);

// 制表符缩进
const testCase4_tab = `{
	"data": [
		{
			"id": "tab_id",
			"name": "test_tab"
		}
	]
}`;

runTest(
    '制表符缩进 - 复制数组内对象的 id',
    testCase4_tab,
    5, // "id" 所在行
    "tab_id"
);

console.log('');

// ============================================
// 测试用例 5：边界情况和特殊值
// ============================================
console.log('📋 测试组 5：边界情况和特殊值');
console.log('-'.repeat(80));

const testCase5 = `{
    "null_value": null,
    "empty_string": "",
    "number_zero": 0,
    "boolean_false": false,
    "special_chars": "hello\\nworld\\t!",
    "unicode": "中文测试 🎉"
}`;

runTest(
    '复制 null 值',
    testCase5,
    2, // "null_value" 所在行
    null
);

runTest(
    '复制空字符串',
    testCase5,
    3, // "empty_string" 所在行
    ""
);

runTest(
    '复制数字零',
    testCase5,
    4, // "number_zero" 所在行
    0
);

runTest(
    '复制布尔值 false',
    testCase5,
    5, // "boolean_false" 所在行
    false
);

runTest(
    '复制包含特殊字符的字符串',
    testCase5,
    6, // "special_chars" 所在行
    "hello\\nworld\\t!"
);

runTest(
    '复制包含 Unicode 的字符串',
    testCase5,
    7, // "unicode" 所在行
    "中文测试 🎉"
);

console.log('');

// ============================================
// 测试用例 6：复杂混合结构
// ============================================
console.log('📋 测试组 6：复杂混合结构（数组和对象深度嵌套）');
console.log('-'.repeat(80));

const testCase6 = `{
    "users": [
        {
            "id": 1,
            "profile": {
                "name": "User One",
                "contacts": [
                    {
                        "type": "email",
                        "value": "user1@example.com"
                    },
                    {
                        "type": "phone",
                        "value": "+86-13800138000"
                    }
                ]
            }
        },
        {
            "id": 2,
            "profile": {
                "name": "User Two",
                "contacts": []
            }
        }
    ],
    "metadata": {
        "total": 2,
        "page": 1
    }
}`;

runTest(
    '复杂结构 - 第一个用户的 ID',
    testCase6,
    4, // "id": 1 所在行
    1
);

runTest(
    '复杂结构 - 第一个用户的名字',
    testCase6,
    6, // "name": "User One" 所在行
    "User One"
);

runTest(
    '复杂结构 - 第一个用户的邮箱',
    testCase6,
    10, // "value": "user1@example.com" 所在行
    "user1@example.com"
);

runTest(
    '复杂结构 - 第二个用户的 ID',
    testCase6,
    18, // "id": 2 所在行
    2
);

runTest(
    '复杂结构 - metadata.total',
    testCase6,
    25, // "total": 2 所在行
    2
);

console.log('');
console.log('='.repeat(80));
console.log('测试总结');
console.log('='.repeat(80));

const totalTests = testResults.length;
const passedTests = testResults.filter(r => r.passed).length;
const failedTests = totalTests - passedTests;

console.log(`总测试数: ${totalTests}`);
console.log(`通过: ${passedTests} ✅`);
console.log(`失败: ${failedTests} ❌`);
console.log(`通过率: ${(passedTests / totalTests * 100).toFixed(1)}%`);

if (failedTests > 0) {
    console.log('');
    console.log('失败的测试:');
    testResults.filter(r => !r.passed).forEach(result => {
        console.log(`❌ ${result.testName}`);
        console.log(`   原因: ${result.errorMessage}`);
    });
}

console.log('');
console.log('='.repeat(80));
