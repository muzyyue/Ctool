import loader from "@monaco-editor/loader";
import ContextMenu from "./contextMenu";
import lineInfo from "./lineInfo";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import "./style.css";

/**
 * Monaco Editor Worker 环境配置
 * 根据编辑器语言类型返回对应的 Worker 实例
 */
self.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === "json") {
            return new jsonWorker();
        }
        if (label === "css" || label === "scss" || label === "less") {
            return new cssWorker();
        }
        if (label === "html" || label === "handlebars" || label === "razor") {
            return new htmlWorker();
        }
        if (label === "typescript" || label === "javascript") {
            return new tsWorker();
        }
        return new editorWorker();
    },
};

/**
 * 获取 Monaco Editor 实例
 * @returns Monaco Editor 实例或 undefined
 */
const monacoInstance = () => {
    return loader.__getMonacoInstance();
};

/**
 * Monaco Editor 初始化状态标志
 * 用于防止重复初始化导致的 "Unexpected usage" 错误
 */
let isInitialized = false;
let initPromise: Promise<typeof monaco> | null = null;

/**
 * 初始化 Monaco Editor
 * 确保 loader.config() 和 loader.init() 只执行一次，避免重复初始化错误
 * @param params - loader 配置参数
 * @returns Promise<typeof monaco> - Monaco Editor 实例
 */
const monacoInit = (params: Parameters<typeof loader.config>[0] = {}) => {
    // 如果已经初始化，直接返回缓存的 Promise
    if (isInitialized && initPromise) {
        return initPromise;
    }

    // 标记为已初始化
    isInitialized = true;
    
    // 配置 loader（只执行一次）
    loader.config({
        monaco,
        ...params
    });
    
    // 缓存 init Promise，避免重复调用
    initPromise = loader.init();
    return initPromise;
};

export { monacoInit, ContextMenu, monacoInstance, monacoEditor, lineInfo };
