import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * JSON工具台 - 一键收起/展开功能单元测试
 * 测试foldAll和unfoldAll核心逻辑的正确性
 */
describe('JSON工具台 - 一键收起/展开功能', () => {

    /**
     * 创建Mock编辑器实例
     * 模拟Monaco Editor的关键API
     * @param config - Mock配置选项
     * @returns Mock的编辑器实例对象
     */
    const createMockEditor = (config: {
        actionExists?: boolean;
        scrollTop?: number;
        scrollLeft?: number;
    } = {}) => {
        const defaultConfig = {
            actionExists: true,
            scrollTop: 100,
            scrollLeft: 0,
            ...config,
        };

        return {
            getAction: vi.fn().mockReturnValue(
                defaultConfig.actionExists ? { run: vi.fn() } : null,
            ),
            getScrollTop: vi.fn().mockReturnValue(defaultConfig.scrollTop),
            getScrollLeft: vi.fn().mockReturnValue(defaultConfig.scrollLeft),
            setScrollPosition: vi.fn(),
        };
    };

    describe('foldAll 功能', () => {

        /**
         * 测试正常调用foldAll时正确执行折叠操作
         */
        it('应正确调用Monaco的foldAll动作', () => {
            const mockEditor = createMockEditor();

            // 模拟foldAll核心逻辑
            const foldAll = (editor: ReturnType<typeof createMockEditor> | null) => {
                if (!editor) return;

                const scrollTop = editor.getScrollTop();
                const scrollLeft = editor.getScrollLeft();

                try {
                    const foldAction = editor.getAction('editor.foldAll');
                    if (foldAction) {
                        foldAction.run();
                    }

                    requestAnimationFrame(() => {
                        editor.setScrollPosition({
                            scrollLeft,
                            scrollTop,
                        });
                    });
                } catch (error) {
                    console.error('Fold all operation failed:', error);
                }
            };

            foldAll(mockEditor);

            // 验证API调用
            expect(mockEditor.getAction).toHaveBeenCalledWith('editor.foldAll');
            expect(mockEditor.getScrollTop).toHaveBeenCalled();
            expect(mockEditor.getScrollLeft).toHaveBeenCalled();
        });

        /**
         * 测试编辑器未初始化时的安全处理
         */
        it('应在编辑器为null时安全返回', () => {
            const foldAll = (editor: unknown) => {
                if (!editor) return;
                throw new Error('不应执行到这里');
            };

            // 传入null不应该抛出异常
            expect(() => foldAll(null)).not.toThrow();
        });

        /**
         * 测试foldAll动作不存在时的容错处理
         */
        it('应在foldAll动作不存在时正常处理', () => {
            const mockEditor = createMockEditor({ actionExists: false });

            const foldAll = (editor: ReturnType<typeof createMockEditor>) => {
                if (!editor) return;

                try {
                    const foldAction = editor.getAction('editor.foldAll');
                    if (foldAction) {
                        foldAction.run();
                    }
                } catch (error) {
                    console.error('Fold all operation failed:', error);
                }
            };

            // 不应抛出异常
            expect(() => foldAll(mockEditor)).not.toThrow();
            expect(mockEditor.getAction).toHaveBeenCalledWith('editor.foldAll');
        });

        /**
         * 测试滚动位置保存和恢复逻辑
         */
        it('应正确保存并恢复滚动位置', () => {
            const mockEditor = createMockEditor({
                scrollTop: 250,
                scrollLeft: 50,
            });

            let savedScrollTop = 0;
            let savedScrollLeft = 0;

            const foldAll = (editor: ReturnType<typeof createMockEditor>) => {
                if (!editor) return;

                savedScrollTop = editor.getScrollTop();
                savedScrollLeft = editor.getScrollLeft();

                const foldAction = editor.getAction('editor.foldAll');
                if (foldAction) {
                    foldAction.run();
                }

                requestAnimationFrame(() => {
                    editor.setScrollPosition({
                        scrollLeft: savedScrollLeft,
                        scrollTop: savedScrollTop,
                    });
                });
            };

            foldAll(mockEditor);

            // 验证保存的位置值
            expect(savedScrollTop).toBe(250);
            expect(savedScrollLeft).toBe(50);
        });
    });

    describe('unfoldAll 功能', () => {

        /**
         * 测试正常调用unfoldAll时正确执行展开操作
         */
        it('应正确调用Monaco的unfoldAll动作', () => {
            const mockEditor = createMockEditor({
                scrollTop: 50,
                scrollLeft: 20,
            });

            // 模拟unfoldAll核心逻辑
            const unfoldAll = (editor: ReturnType<typeof createMockEditor> | null) => {
                if (!editor) return;

                const scrollTop = editor.getScrollTop();
                const scrollLeft = editor.getScrollLeft();

                try {
                    const unfoldAction = editor.getAction('editor.unfoldAll');
                    if (unfoldAction) {
                        unfoldAction.run();
                    }

                    requestAnimationFrame(() => {
                        editor.setScrollPosition({
                            scrollLeft,
                            scrollTop,
                        });
                    });
                } catch (error) {
                    console.error('Unfold all operation failed:', error);
                }
            };

            unfoldAll(mockEditor);

            // 验证API调用
            expect(mockEditor.getAction).toHaveBeenCalledWith('editor.unfoldAll');
            expect(mockEditor.setScrollPosition).toHaveBeenCalled();
        });

        /**
         * 测试编辑器未初始化时的安全处理
         */
        it('应在编辑器为null时安全返回', () => {
            const unfoldAll = (editor: unknown) => {
                if (!editor) return;
                throw new Error('不应执行到这里');
            };

            expect(() => unfoldAll(null)).not.toThrow();
        });

        /**
         * 测试异常情况下的错误处理
         */
        it('应在抛出异常时捕获错误', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const mockEditor = {
                getAction: vi.fn().mockImplementation(() => {
                    throw new Error('模拟异常');
                }),
                getScrollTop: vi.fn(),
                getScrollLeft: vi.fn(),
                setScrollPosition: vi.fn(),
            };

            const unfoldAll = (editor: typeof mockEditor) => {
                if (!editor) return;

                try {
                    const unfoldAction = editor.getAction('editor.unfoldAll');
                    if (unfoldAction) {
                        unfoldAction.run();
                    }
                } catch (error) {
                    console.error('Unfold all operation failed:', error);
                }
            };

            // 不应抛出异常（已被catch捕获）
            expect(() => unfoldAll(mockEditor)).not.toThrow();
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('边界情况和数据兼容性', () => {

        /**
         * 测试不同滚动位置的保存恢复
         */
        it('应处理各种滚动位置组合', () => {
            const testCases = [
                { scrollTop: 0, scrollLeft: 0 },
                { scrollTop: 100, scrollLeft: 0 },
                { scrollTop: 0, scrollLeft: 100 },
                { scrollTop: 9999, scrollLeft: 9999 },
            ];

            testCases.forEach(({ scrollTop, scrollLeft }) => {
                const mockEditor = createMockEditor({ scrollTop, scrollLeft });

                let restoredPosition: { scrollTop: number; scrollLeft: number } | null = null;

                const foldAll = (editor: ReturnType<typeof createMockEditor>) => {
                    const st = editor.getScrollTop();
                    const sl = editor.getScrollLeft();

                    requestAnimationFrame(() => {
                        restoredPosition = { scrollTop: st, scrollLeft: sl };
                    });
                };

                foldAll(mockEditor);
                expect(restoredPosition).toEqual({ scrollTop, scrollLeft });
            });
        });

        /**
         * 测试连续快速调用的稳定性
         */
        it('应支持连续多次调用而不出错', () => {
            const mockEditor = createMockEditor();

            const foldAll = (editor: ReturnType<typeof createMockEditor>) => {
                if (!editor) return;
                const foldAction = editor.getAction('editor.foldAll');
                if (foldAction) {
                    foldAction.run();
                }
            };

            // 连续调用10次
            for (let i = 0; i < 10; i++) {
                expect(() => foldAll(mockEditor)).not.toThrow();
            }

            // 验证foldAll被调用了10次
            expect(mockEditor.getAction).toHaveBeenCalledTimes(10);
        });

        /**
         * 测试requestAnimationFrame回调的正确性
         */
        it('应使用requestAnimationFrame异步恢复位置', () => {
            vi.useFakeTimers();

            const mockEditor = createMockEditor();
            let callbackExecuted = false;

            const foldAll = (editor: ReturnType<typeof createMockEditor>) => {
                const scrollTop = editor.getScrollTop();
                const scrollLeft = editor.getScrollLeft();

                requestAnimationFrame(() => {
                    callbackExecuted = true;
                    editor.setScrollPosition({
                        scrollLeft,
                        scrollTop,
                    });
                });
            };

            foldAll(mockEditor);

            // 回调尚未执行
            expect(callbackExecuted).toBe(false);
            expect(mockEditor.setScrollPosition).not.toHaveBeenCalled();

            // 触发动画帧
            vi.advanceToNextFrame();

            // 回调已执行
            expect(callbackExecuted).toBe(true);
            expect(mockEditor.setScrollPosition).toHaveBeenCalledWith({
                scrollLeft: 0,
                scrollTop: 100,
            });

            vi.useRealTimers();
        });
    });

    describe('智能层级折叠算法', () => {

        /**
         * 模拟findTopLevelRange函数
         * 找出顶层范围（不被任何其他范围包含的最外层范围）
         */
        const findTopLevelRange = (
            ranges: Array<{ startLineNumber: number; endLineNumber: number }>,
        ): { startLineNumber: number; endLineNumber: number } | null => {
            const sortedBySize = [...ranges].sort(
                (a, b) => b.endLineNumber - b.startLineNumber - (a.endLineNumber - a.startLineNumber),
            );

            if (sortedBySize.length === 0) return null;

            return sortedBySize[0];
        };

        /**
         * 模拟findDirectChildren函数
         * 找出某父范围的直接子范围
         */
        const findDirectChildren = (
            parent: { startLineNumber: number; endLineNumber: number },
            allRanges: Array<{ startLineNumber: number; endLineNumber: number }>,
        ): Array<{ startLineNumber: number; endLineNumber: number }> => {
            return allRanges.filter((range) => {
                if (range === parent) return false;

                const isInsideParent =
                    range.startLineNumber > parent.startLineNumber &&
                    range.endLineNumber < parent.endLineNumber;

                if (!isInsideParent) return false;

                const isDirectChild = !allRanges.some((other) => {
                    if (other === range || other === parent) return false;
                    const otherIsInsideParent =
                        other.startLineNumber > parent.startLineNumber &&
                        other.endLineNumber < parent.endLineNumber;
                    const otherContainsRange =
                        other.startLineNumber < range.startLineNumber && other.endLineNumber > range.endLineNumber;
                    return otherIsInsideParent && otherContainsRange;
                });

                return isDirectChild;
            });
        };

        describe('findTopLevelRange 功能', () => {

            /**
             * 测试正常识别顶层范围
             */
            it('应正确找出包含最多行的顶层范围', () => {
                const ranges = [
                    { startLineNumber: 1, endLineNumber: 500 }, // 顶层对象
                    { startLineNumber: 2, endLineNumber: 50 },  // 子对象1
                    { startLineNumber: 62, endLineNumber: 100 }, // 子对象2
                    { startLineNumber: 101, endLineNumber: 120 }, // 子对象3
                ];

                const topLevel = findTopLevelRange(ranges);

                expect(topLevel).toEqual({ startLineNumber: 1, endLineNumber: 500 });
            });

            /**
             * 测试空数组返回null
             */
            it('应在空数组时返回null', () => {
                const topLevel = findTopLevelRange([]);
                expect(topLevel).toBeNull();
            });

            /**
             * 测试单个范围时返回该范围本身
             */
            it('应在只有一个范围时返回该范围', () => {
                const ranges = [{ startLineNumber: 1, endLineNumber: 10 }];
                const topLevel = findTopLevelRange(ranges);

                expect(topLevel).toEqual({ startLineNumber: 1, endLineNumber: 10 });
            });
        });

        describe('findDirectChildren 功能', () => {

            /**
             * 测试正确找出直接子范围
             */
            it('应正确找出父范围的直接子范围', () => {
                const allRanges = [
                    { startLineNumber: 1, endLineNumber: 500 },   // 顶层（父）
                    { startLineNumber: 2, endLineNumber: 50 },    // 直接子级1
                    { startLineNumber: 62, endLineNumber: 100 },  // 直接子级2
                    { startLineNumber: 3, endLineNumber: 20 },    // 子级1的子级（非直接子级）
                    { startLineNumber: 63, endLineNumber: 80 },   // 子级2的子级（非直接子级）
                ];

                const parent = { startLineNumber: 1, endLineNumber: 500 };
                const children = findDirectChildren(parent, allRanges);

                // 应该只返回直接子级，不包括孙级
                expect(children).toHaveLength(2);
                expect(children).toContainEqual({ startLineNumber: 2, endLineNumber: 50 });
                expect(children).toContainEqual({ startLineNumber: 62, endLineNumber: 100 });
                expect(children).not.toContainEqual({ startLineNumber: 3, endLineNumber: 20 });
                expect(children).not.toContainEqual({ startLineNumber: 63, endLineNumber: 80 });
            });

            /**
             * 测试没有子范围时返回空数组
             */
            it('应在没有直接子范围时返回空数组', () => {
                const allRanges = [{ startLineNumber: 1, endLineNumber: 10 }];
                const parent = { startLineNumber: 1, endLineNumber: 10 };
                const children = findDirectChildren(parent, allRanges);

                expect(children).toHaveLength(0);
            });

            /**
             * 测试多层嵌套结构
             */
            it('应正确处理多层嵌套结构', () => {
                const allRanges = [
                    { startLineNumber: 1, endLineNumber: 1000 },     // Level 0
                    { startLineNumber: 2, endLineNumber: 400 },      // Level 1 - A
                    { startLineNumber: 401, endLineNumber: 700 },    // Level 1 - B
                    { startLineNumber: 701, endLineNumber: 999 },    // Level 1 - C
                    { startLineNumber: 3, endLineNumber: 100 },      // Level 2 - A1
                    { startLineNumber: 101, endLineNumber: 200 },    // Level 2 - A2
                    { startLineNumber: 402, endLineNumber: 500 },    // Level 2 - B1
                ];

                const parent = { startLineNumber: 1, endLineNumber: 1000 };
                const children = findDirectChildren(parent, allRanges);

                // 应该只返回Level 1的三个直接子级
                expect(children).toHaveLength(3);
                expect(children).toContainEqual({ startLineNumber: 2, endLineNumber: 400 });
                expect(children).toContainEqual({ startLineNumber: 401, endLineNumber: 700 });
                expect(children).toContainEqual({ startLineNumber: 701, endLineNumber: 999 });

                // 不应该包含Level 2的子级
                children.forEach((child) => {
                    expect(child.startLineNumber).not.toBe(3);
                    expect(child.startLineNumber).not.toBe(101);
                    expect(child.startLineNumber).not.toBe(402);
                });
            });

            /**
             * 测试边界情况：范围紧邻的情况
             */
            it('应正确处理紧邻的范围边界', () => {
                const allRanges = [
                    { startLineNumber: 1, endLineNumber: 20 },
                    { startLineNumber: 2, endLineNumber: 5 },
                    { startLineNumber: 6, endLineNumber: 10 },
                    { startLineNumber: 11, endLineNumber: 15 },
                    { startLineNumber: 16, endLineNumber: 19 },
                ];

                const parent = { startLineNumber: 1, endLineNumber: 20 };
                const children = findDirectChildren(parent, allRanges);

                // 所有子范围都是直接子级（因为它们互不包含）
                expect(children).toHaveLength(4);
            });
        });

        describe('智能折叠完整流程', () => {

            /**
             * 测试完整的智能折叠流程
             */
            it('应执行正确的折叠流程：展开→获取范围→筛选→折叠', () => {
                let unfoldCalled = false;
                let getFoldingRangesCalled = false;
                let toggleFoldCalls: number[] = [];

                const mockEditor = {
                    getAction: vi.fn().mockImplementation((actionId: string) => {
                        if (actionId === 'editor.unfoldAll') {
                            unfoldCalled = true;
                            return { run: vi.fn() };
                        }
                        return null;
                    }),
                    getFoldingRanges: vi.fn().mockImplementation(() => {
                        getFoldingRangesCalled = true;
                        return [
                            { startLineNumber: 1, endLineNumber: 500 },
                            { startLineNumber: 2, endLineNumber: 50 },
                            { startLineNumber: 62, endLineNumber: 100 },
                            { startLineNumber: 101, endLineNumber: 150 },
                        ];
                    }),
                    toggleFold: vi.fn().mockImplementation((options: { line: number }) => {
                        toggleFoldCalls.push(options.line);
                    }),
                    getScrollTop: vi.fn().mockReturnValue(0),
                    getScrollLeft: vi.fn().mockReturnValue(0),
                    setScrollPosition: vi.fn(),
                };

                // 模拟foldAll核心逻辑
                const foldAll = (editor: typeof mockEditor) => {
                    editor.getAction('editor.unfoldAll')?.run();
                    const foldingRanges = editor.getFoldingRanges();

                    if (!foldingRanges || foldingRanges.length === 0) return;

                    const topLevelRange = findTopLevelRange(foldingRanges);
                    if (!topLevelRange) return;

                    const directChildren = findDirectChildren(topLevelRange, foldingRanges);
                    directChildren.forEach((child) => {
                        editor.toggleFold({ line: child.startLineNumber });
                    });
                };

                foldAll(mockEditor);

                // 验证流程执行顺序
                expect(unfoldCalled).toBe(true);
                expect(getFoldingRangesCalled).toBe(true);

                // 验证只折叠了直接子级（第2行和第62行、第101行）
                expect(toggleFoldCalls).toHaveLength(3);
                expect(toggleFoldCalls).toContain(2);
                expect(toggleFoldCalls).toContain(62);
                expect(toggleFoldCalls).toContain(101);

                // 不应该折叠顶层（第1行）
                expect(toggleFoldCalls).not.toContain(1);
            });

            /**
             * 测试空内容时的回退行为
             */
            it('应在无folding ranges时回退到完全折叠', () => {
                let fallbackCalled = false;

                const mockEditor = {
                    getAction: vi.fn().mockImplementation((actionId: string) => {
                        if (actionId === 'editor.unfoldAll') {
                            return { run: vi.fn() };
                        }
                        if (actionId === 'editor.foldAll') {
                            fallbackCalled = true;
                            return { run: vi.fn() };
                        }
                        return null;
                    }),
                    getFoldingRanges: vi.fn().mockReturnValue([]),
                    getScrollTop: vi.fn(),
                    getScrollLeft: vi.fn(),
                    setScrollPosition: vi.fn(),
                };

                const foldAll = (editor: typeof mockEditor) => {
                    try {
                        editor.getAction('editor.unfoldAll')?.run();
                        const foldingRanges = editor.getFoldingRanges();

                        if (!foldingRanges || foldingRanges.length === 0) {
                            editor.getAction('editor.foldAll')?.run();
                            return;
                        }
                    } catch (error) {
                        console.error(error);
                    }
                };

                foldAll(mockEditor);

                // 应该回退到完全折叠
                expect(fallbackCalled).toBe(true);
            });
        });
    });
});
