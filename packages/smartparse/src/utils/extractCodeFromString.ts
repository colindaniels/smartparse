function isValidJavaScript(code_string: string) {
    try {
        // Attempt to create a new function with the code string
        new Function(code_string);
        return true; // Code is valid if no error is thrown
    } catch (error) {
        return false; // Code is invalid if an error is thrown
    }
}


export function extractCodeFromText(code_string: string): string {
    // Extract the javascript``` * CODE * ```
    const match = code_string.match(/```.*?\n([\s\S]*?)```/);
    if (match && match[1]) return match[1];

    // if the full string is runnable valid
    if (isValidJavaScript(code_string)) return code_string;

    console.log('INVALID JAVASCRIPT')
    return ''

}



