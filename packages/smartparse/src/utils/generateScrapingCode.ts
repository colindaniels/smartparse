import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ZodObject, ZodRawShape } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { extractCodeFromText } from "./extractCodeFromString";

import dotenv from 'dotenv'
dotenv.config();
const config = process.env;

interface Options {
    relevant_docs: string[],
    goal: string
    schema: ZodObject<ZodRawShape>
}


export async function generateScrapingCode(options: Options): Promise<any> {


    const systemPrompt = `
    {context}

    * You were given a few chunks of an html page that a RAG thought was relevant.
    * The user will give you a goal.
    * Your job is to create a javascript cheerio script that will scrape the entire html that aligns with the users goal.
    * Do not use regex ever.
    * Only provide the code, do not give any explination or comments.
    * The variable 'html' is already declared and contains the valid html of the entire page.
    * The data type must be a homogeneous array of objects.
    * The data will be flat. No nested objects.
    * Your only allowed to edit the 'input your code here' part, but still give the full code.

    Finish this code. Only change whats inside the: **:
    (() => {{
     const cheerio = require('cheerio');
     const $ = cheerio.load(html)
     const data = [];
     ** INPUT YOUR CODE HERE **
     return data
    }})();
`


    const promptTemplate = ChatPromptTemplate.fromMessages([
        {
            role: 'system',
            content: systemPrompt
        },
        {
            role: 'user',
            content: options.goal
        }
    ]);

    const context = options.relevant_docs.map(d => d += '\n\n...There is more hidden HTML here...\n\n').join()

    const prompt = await promptTemplate.invoke({
        context: context
    })

/*
    const llm = new ChatAnthropic({
        model: "claude-3-5-sonnet-20241022",
        temperature: 0,
        maxTokens: undefined,
        maxRetries: 2,
    });
*/
/*
    const llm = new ChatOpenAI({
        model: 'gpt-4o',
        temperature: 0
    })
*/

    const llm = new ChatOpenAI({
        model: 'gpt-4o',
        temperature: 0
    })

    const response = await llm.invoke(prompt);

    //@ts-ignore
    const answer: string = response.content.trim()


    const script = extractCodeFromText(answer)
    return script
}