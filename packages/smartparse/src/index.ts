const { htmlCompressor } = require('./utils/htmlCompressor') as {
    htmlCompressor: (html: string) => string;
};

import { filterText } from './utils/filterText';
import { generateScrapingCode } from './utils/generateScrapingCode';
import { runCode } from './utils/runCode';
import { ZodObject, ZodRawShape } from "zod";




export async function parseWithAI(html: string, query: string, schema?: ZodObject<ZodRawShape>): Promise<any> {
    const compressed = htmlCompressor(html);

    const docs = await filterText({
        goal: query,
        text: compressed
    })

    const generatedCode = await generateScrapingCode({
        relevant_docs: docs,
        goal: query,
        schema: schema!
    })

    const structuredOutput = await runCode({
        html: html,
        code: generatedCode
    })

    return JSON.parse(JSON.stringify(structuredOutput));
}

