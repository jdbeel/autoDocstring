import * as vs from "vscode";
import { extensionID } from "../constants";

import { strict } from "assert";
import { guessType } from ".";
import {
    Argument,
    Decorator,
    DocstringParts,
    Exception,
    KeywordArgument,
    Return,
    Yield,
} from "../docstring_parts";

export function parseParameters(
    parameterTokens: string[],
    body: string[],
    functionName: string,
): DocstringParts {
    return {
        name: functionName,
        decorators: parseDecorators(parameterTokens),
        args: parseArguments(parameterTokens),
        kwargs: parseKeywordArguments(parameterTokens),
        returns: parseReturns(parameterTokens, body),
        yields: parseYields(parameterTokens, body),
        exceptions: parseExceptions(body),
    };
}

function parseDecorators(parameters: string[]): Decorator[] {
    const decorators: Decorator[] = [];
    const pattern = /^@(\w+)/;

    for (const param of parameters) {
        const match = param.trim().match(pattern);

        if (match == null) {
            continue;
        }

        decorators.push({
            name: match[1],
        });
    }

    return decorators;
}

function parseArguments(parameters: string[]): Argument[] {
    const args: Argument[] = [];
    const excludedArgs = ["self", "cls"];
    const pattern = /^(\w+)/;

    for (const param of parameters) {
        const match = param.trim().match(pattern);

        if (match == null || param.includes("=") || inArray(param, excludedArgs)) {
            continue;
        }

        args.push({
            var: match[1],
            type: guessType(param),
        });
    }

    return args;
}

function parseKeywordArguments(parameters: string[]): KeywordArgument[] {
    const kwargs: KeywordArgument[] = [];
    const pattern = /^(\w+)(?:\s*:[^=]+)?\s*=\s*(.+)/;

    for (const param of parameters) {
        const match = param.trim().match(pattern);

        if (match == null) {
            continue;
        }

        kwargs.push({
            var: match[1],
            default: match[2],
            type: guessType(param),
        });
    }

    return kwargs;
}

function parseReturns(parameters: string[], body: string[]): Return[] {
    const returnType = parseReturnFromDefinition(parameters);

    return returnType;
}

function parseYields(parameters: string[], body: string[]): Yield[] {
    const returnType = parseReturnFromDefinition(parameters);
    const yieldInBody = parseFromBody(body, /yield /);

    if (returnType != null && yieldInBody != null) {
        return returnType as Yield[];
    } else {
        const emptyYield: Yield[] = [];
        return emptyYield
    } 
}

function parseReturnFromDefinition(parameters: string[]): Return[] | null {
    const pattern = /^->\s*(["']?)(['"\w\[\], |\.]*)\1/;

    for (const param of parameters) {
        const match = param.trim().match(pattern);

        if (match == null) {
            continue;
        }

        // Skip "-> None" annotations
        if (match[2] === "None") {
            return []
        } else {
            let return_types = parseHint(match[2], true);
            let returns = [];
            if (Array.isArray(return_types)){
                for (const return_type of return_types) {
                    returns.push({type : return_type})
                }
            } else {
                returns.push({type : return_types})
            }
            return returns;
        }
    }

    return [];
}

export function parseHint(hint: string, is_return: boolean = false): string | string[] {
    const parent_pattern = /(['"\.\w]+)\[(.*)\]\]*/;
    let config = vs.workspace.getConfiguration(extensionID);

    let result = "";
    if (hint.includes("[")) {
        const parent_match = hint.match(parent_pattern);

        if (parent_match == null) {
            return "";
        }

        let parent = parent_match[1].toLowerCase();
        const child_match = parseChildren(parent_match[2])

        if (is_return === true && (parent === "tuple" || parent === "iterable" || parent === "generator")) {
            let return_types = [];
            for (const child of child_match.slice(0, -1)) {
                return_types.push(parseHint(child, false))
            }
            return return_types
        }
        if (parent === "dict") {
            result += "dict mapping "
            result += parseHint(child_match[0]) + config.get("dictMapString").toString()
            result += parseHint(child_match[1])
        } else {
            if (parent != "optional")
                result += parent + " of "
            if (child_match.length == 2) {
                result += parseHint(child_match[0]) + " and ";
                result += parseHint(child_match[1]);
            } else if (child_match.length == 1) {
                result += parseHint(child_match[0])
            } else {
                for (const child of child_match.slice(0, -1)) {
                    result += parseHint(child) + ", "
                }
                result += "and " + parseHint(child_match.slice(-1)[0]);
            }
        }
    } else {
        var numUpper = hint.replace(/[^A-Z]/g, '').length;
        if (numUpper > 1) result = hint;
        else result = hint.toLowerCase();
    }

    return result;
}

function parseChildren(childrenString: string): string[] {
    let result = [], item = '', depth = 0;
    function push() { if (item) result.push(item); item = ''; }
    for (let i = 0,  c; c = childrenString[i], i < childrenString.length; i++) {
        if (c === ' ' && !depth) continue;
        if (!depth && c === ',') push();
        else {
            item += c;
            if (c === '[') depth++;
            if (c ===']') depth--;
        }
    }

    push();
    return result;
}

function parseExceptions(body: string[]): Exception[] {
    const exceptions: Exception[] = [];
    const pattern = /(?<!#.*)raise\s+([\w.]+)/;

    for (const line of body) {
        const match = line.match(pattern);

        if (match == null) {
            continue;
        }

        exceptions.push({ type: match[1] });
    }

    return exceptions;
}

export function inArray<type>(item: type, array: type[]) {
    return array.some((x) => item === x);
}

function parseFromBody(body: string[], pattern: RegExp): Return | Yield {
    for (const line of body) {
        const match = line.match(pattern);

        if (match == null) {
            continue;
        }

        return { type: undefined };
    }

    return undefined;
}
