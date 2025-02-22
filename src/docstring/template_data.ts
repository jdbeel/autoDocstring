/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
    Argument,
    Decorator,
    DocstringParts,
    Exception,
    KeywordArgument,
    Return,
    Yield,
} from "../docstring_parts";

export class TemplateData {
    public name: string;
    public decorators: Decorator[];
    public args: Argument[];
    public kwargs: KeywordArgument[];
    public exceptions: Exception[];
    public returns: Return[];
    public yields: Yield[];

    private includeName: boolean;
    private includeExtendedSummary: boolean;

    constructor(
        docstringParts: DocstringParts,
        guessTypes: boolean,
        includeName: boolean,
        includeExtendedSummary: boolean,
    ) {
        this.name = docstringParts.name;
        this.decorators = docstringParts.decorators;
        this.args = docstringParts.args;
        this.kwargs = docstringParts.kwargs;
        this.exceptions = docstringParts.exceptions;
        this.returns = docstringParts.returns;
        this.yields = docstringParts.yields;

        this.includeName = includeName;
        this.includeExtendedSummary = includeExtendedSummary;

        if (!guessTypes) {
            this.removeTypes();
        }

        this.addDefaultTypePlaceholders("_type_");
    }

    public placeholder() {
        return (text: string, render: (_: string) => string): string => {
            return "${@@@:" + render(text) + "}";
        };
    }

    public summaryPlaceholder(): string {
        if (this.includeName) {
            return this.name + " ${@@@:_summary_}";
        }

        return "${@@@:_summary_}";
    }

    public extendedSummaryPlaceholder(): string {
        if (this.includeExtendedSummary) {
            return "${@@@:_extended_summary_}";
        }

        return "";
    }

    public typePlaceholder(): string {
        // Need to ignore rules because this.type only works in
        // the context of mustache applying a template
        // @ts-ignore
        return "${@@@:" + this.type + "}";
    }

    public descriptionPlaceholder(): string {
        return "${@@@:_description_}";
    }

    public argsExist(): boolean {
        return this.args.length > 0;
    }

    public kwargsExist(): boolean {
        return this.kwargs.length > 0;
    }

    public parametersExist(): boolean {
        return this.args.length > 0 || this.kwargs.length > 0;
    }

    public exceptionsExist(): boolean {
        return this.exceptions.length > 0;
    }

    public returnsExist(): boolean {
        return this.returns.length > 0;
    }

    public yieldsExist(): boolean {
        return this.yields.length > 0;
    }

    private removeTypes(): void {
        for (const arg of this.args) {
            arg.type = undefined;
        }

        for (const kwarg of this.kwargs) {
            kwarg.type = undefined;
        }

        for (const _yield of this.yields) {
            _yield.type = undefined;
        }

        for (const _return of this.returns) {
            _return.type = undefined;
        }
    }

    private addDefaultTypePlaceholders(placeholder: string): void {
        for (const arg of this.args) {
            if (arg.type === undefined) {
                arg.type = placeholder;
            }
        }

        for (const kwarg of this.kwargs) {
            if (kwarg.type === undefined) {
                kwarg.type = placeholder;
            }
        }

        for (const _return of this.returns) {
            if (_return.type === undefined) {
                _return.type = placeholder;
            }
        }

        for (const _yield of this.yields) {
            if (_yield.type === undefined) {
                _yield.type = placeholder;
            }
        }
    }
}
