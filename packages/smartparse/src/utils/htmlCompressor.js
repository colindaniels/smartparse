import { load } from 'cheerio'
const PseudoHtmlCompressor = {
    public_elements_to_remove: new Set(['style', 'script', 'head', 'meta', 'link', 'base', 'noscript', 'font', 'center', 'marquee', 'bgsound', 'svg']),
    public_valid_attributes: new Set(['id', 'class', 'type', 'alt', 'name', 'href', 'src']),



    compressHtml(html) {
        var compressed_html = html
        compressed_html = this.removeElements(compressed_html, this.public_elements_to_remove)
        compressed_html = this.removeInvalidAttributes(compressed_html, this.public_valid_attributes)
        compressed_html = this.removeComments(compressed_html); // Added this line
        //compressed_html = this.handleRepeats(compressed_html)
        compressed_html = this.shortenLinks(compressed_html, 20);
        this.logCompression(html.length, compressed_html.length, 'Total Compression')
        return compressed_html
    },



    logCompression(initial, current, describer) {
        console.log(`${describer}: ${initial.toLocaleString()} -> ${current.toLocaleString()} (${((1 - (current / initial)) * 100).toFixed(2)}% Compression)`)
    },



    removeElements(html, elements_to_remove) {
        // Load the HTML as a fragment to avoid adding extra html and body tags
        const $ = load(html);

        elements_to_remove.forEach(tag => {
            $(tag).remove();
        });

        this.logCompression(html.length, $.html().length, 'Removed Elements');

        return $.html();
    },



    removeInvalidAttributes(html, valid_attributes) {
        const $ = load(html);

        // Iterate over all elements in the document
        $('*').each(function () {
            // Get the list of attributes for the current element
            const attributes = $(this).attr();

            // Remove invalid attributes and ensure only the first value of each attribute is kept
            Object.keys(attributes).forEach(attr => {
                if (!valid_attributes.has(attr)) {
                    $(this).removeAttr(attr);
                } else {
                    // Split the attribute value by spaces (if it's a space-separated list) and keep only the first value
                    const value = attributes[attr];
                    const firstValue = value.split(' ')[0];
                    $(this).attr(attr, firstValue);
                }
            });
        });

        // Return the modified HTML
        this.logCompression(html.length, $.html().length, 'Remove Invalid Attributes');
        return $.html();
    },


    removeComments(html) {
        const $ = load(html, { decodeEntities: false });

        // Remove all comment nodes
        $('*').contents().each(function () {
            if (this.type === 'comment') {
                $(this).remove();
            }
        });

        // Also remove comments that are direct children of the root
        $.root().contents().each(function () {
            if (this.type === 'comment') {
                $(this).remove();
            }
        });

        this.logCompression(html.length, $.html().length, 'Removed Comments');
        return $.html();
    },


    shortenLinks(html, maxLength = 50) {
        const $ = load(html);

        // Define attributes that may contain URLs
        const urlAttributes = ['href', 'src'];

        $('*').each(function () {
            urlAttributes.forEach(attr => {
                const attrValue = $(this).attr(attr);
                if (attrValue && attrValue.length > maxLength) {
                    $(this).attr(attr, attrValue.slice(0, maxLength) + '...');
                }
            });
        });

        this.logCompression(html.length, $.html().length, 'Shortened Links');
        return $.html();
    },

    handleRepeats(html) {
        const $ = load(html, { xmlMode: true });

        const compareNodesWithAttributes = (node1, node2) => {
            const attributes1 = $(node1).attr();
            const attributes2 = $(node2).attr();

            // Compare attribute names and values
            if (Object.keys(attributes1).length !== Object.keys(attributes2).length) return false;
            for (const key in attributes1) {
                if (attributes1[key] !== attributes2[key]) return false;
            }

            // Compare inner HTML content
            return $(node1).html() === $(node2).html();
        };

        // Keep a map to store elements we've already processed
        const processedTags = new Set();

        $('*').each((i, elem) => {
            const attributes = $(elem).attr();
            const tagName = elem.tagName;

            // Generate unique key for the tag and its attributes
            const uniquenessKey = `${tagName}-${JSON.stringify(attributes)}`;
            if (processedTags.has(uniquenessKey)) {
                return;
            }
            processedTags.add(uniquenessKey);

            const elements = [];
            $(`${tagName}`).each((index, el) => {
                if (compareNodesWithAttributes(elem, el)) {
                    elements.push(el);
                }
            });

            if (elements.length > 1) {
                const repeatCount = elements.length;
                $(elements[0]).replaceWith($(elem).clone().attr('REPEAT', repeatCount));
                for (let j = 1; j < elements.length; j++) {
                    $(elements[j]).remove();
                }
            }
        });
        this.logCompression(html.length, $.html().length, 'Handle Repeats')
        return $.xml();
    }
};

export function htmlCompressor(html) {
    return PseudoHtmlCompressor.compressHtml(html);
}