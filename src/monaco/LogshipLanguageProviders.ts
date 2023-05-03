import { CancellationToken, Position, editor, languages } from "monaco-editor";

export class LogshipInlineCompletionsProvider implements languages.InlineCompletionsProvider {
    provideInlineCompletions(model: editor.ITextModel, position: Position, context: languages.InlineCompletionContext, token: CancellationToken): languages.ProviderResult<languages.InlineCompletions<languages.InlineCompletion>> {
        return {items: [{insertText: 'where timestamp > $__timeInterval', }]};
    }

    
    freeInlineCompletions(completions: languages.InlineCompletions<languages.InlineCompletion>): void {
        // noop
    }
    
    // async provideInlineCompletions(model: editor.ITextModel, position: Position, context: any, token: CancellationToken): ProviderResult<T> {
    //     await new Promise((resolve) => setTimeout(resolve, 100));
    //     return {items: [{insertText: 'hellooooooo!'}]};
    // }
    // freeInlineCompletions() {}
}

export class LogshipSignatureHelpProvider implements languages.SignatureHelpProvider {
    signatureHelpTriggerCharacters?: ['(', ')'];
    signatureHelpRetriggerCharacters?: readonly string[] | undefined;
    provideSignatureHelp(model: editor.ITextModel, position: Position, token: CancellationToken, context: languages.SignatureHelpContext): languages.ProviderResult<languages.SignatureHelpResult> {
        return { value: {
            activeSignature: 0,
            activeParameter: 0,
            signatures: [{
                label: 'ago(timespan)',
                parameters: [
                    { 
                       label: 'timespan'
                    }
                ]
            }],
        }, dispose: () => { } };
    }
}
