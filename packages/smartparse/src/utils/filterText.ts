import { Document } from 'langchain/document';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from "@langchain/openai";
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { htmlToMarkdown } from './htmlToMarkdown';


const config = process.env;

interface Options {
    text: string,
    goal: string
}

export async function filterText(options: Options): Promise<any> {

    const chunkSize = 5000; // Maximum characters per chunk
    const similarity_threshold = 0.0;
    const top_k = 20;

    //const query = `Retrieve relevant data from the page using this goal: ${options.goal}`;
    const query = options.goal
    // Load HTML content into Cheerio
    const $ = cheerio.load(options.text);

    // Function to collect elements into chunks without breaking HTML tags
    function getChunks() {
        const chunks = [];
        let currentChunk = '';
        let currentLength = 0;

        // Recursive function to process nodes
        function processNode(node: any) {
            const html = $.html(node);
            const length = html.length;

            if (length > chunkSize) {
                // Node is larger than chunkSize, process its children
                if (node.children && node.children.length > 0) {
                    node.children.forEach((child: any) => {
                        processNode(child);
                    });
                } else {
                    // Node is too big and has no children (unlikely for HTML)
                    // Decide whether to include it or skip
                    console.warn('Skipping oversized node with no children:', node);
                }
            } else {
                // Node fits into the chunk
                if (currentLength + length > chunkSize && currentLength > 0) {
                    // Current chunk is full, start a new one
                    chunks.push(currentChunk);
                    currentChunk = html;
                    currentLength = length;
                } else {
                    // Add node to current chunk
                    currentChunk += html;
                    currentLength += length;
                }
            }
        }

        // Start processing from the root's children to avoid including the entire document
        const rootChildren = $('html').children().toArray();
        rootChildren.forEach((elem: any) => {
            processNode(elem);
        });

        // Push any remaining content as the last chunk
        if (currentChunk) {
            chunks.push(currentChunk);
        }

        return chunks;
    }

    // Get the chunks of HTML content
    const chunks = getChunks();

    console.log('Number of chunks:', chunks.length);




    // Process each chunk to extract text content and maintain a mapping to the original HTML
    var processedChunks = await Promise.all(
        chunks.map(async (htmlChunk, index) => {
            const markdownContent = await htmlToMarkdown(htmlChunk)

            return new Document({
                pageContent: markdownContent,
                metadata: {
                    htmlContent: htmlChunk,
                    chunkIndex: index
                }
            });
        })
    )


    // Filter out null values from the processedChunks array
    processedChunks = processedChunks.filter(chunk => chunk.pageContent !== '');



    // Create embeddings using the text content
    const vectorStore = await MemoryVectorStore.fromDocuments(
        processedChunks,
        new OpenAIEmbeddings({
            apiKey: config.OPENAI_API_KEY
        })
    );


    
    
    
        const embeddings = new OpenAIEmbeddings({
            apiKey: config.OPENAI_API_KEY,
        });
    
    
    
    
        const queryEmbedding = await embeddings.embedQuery(query);
    
        // Perform similarity search with scores
        const results = await vectorStore.similaritySearchVectorWithScore(queryEmbedding, top_k);
    
        // Filter results based on the similarity threshold
        const filteredResults = results.filter(([_doc, similarity]) => {
            console.log('Similarity:', similarity);
            return similarity >= similarity_threshold;
        });
    
        filteredResults.sort((a, b) => {
            const indexA = a[0].metadata.chunkIndex;
            const indexB = b[0].metadata.chunkIndex;
            return indexA - indexB;
        });
    
        // Extract the original HTML content from the filtered results
        const htmlResults = filteredResults.map(([doc, _similarity]) => doc.metadata.htmlContent);
    
        console.log('Number of retrieved documents after filtering:', htmlResults.length);
        return htmlResults; // Return the relevant HTML snippets
    
}