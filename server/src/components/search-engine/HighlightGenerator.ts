// Highlight Generator for Search Results
// Generates highlighted snippets for document previews

export interface HighlightConfig {
    fragmentSize?: number;
    numberOfFragments?: number;
    preTag?: string;
    postTag?: string;
}

export interface HighlightResult {
    documentId: string;
    highlights: string[];
    fieldHighlights: {
        content?: string[];
        filename?: string[];
    };
}

export class HighlightGenerator {
    private config: Required<HighlightConfig>;

    constructor(config: HighlightConfig = {}) {
        this.config = {
            fragmentSize: config.fragmentSize || 150,
            numberOfFragments: config.numberOfFragments || 3,
            preTag: config.preTag || '<mark>',
            postTag: config.postTag || '</mark>'
        };
    }

    /**
     * Generate highlights from Elasticsearch hit
     */
    generateFromHit(hit: any): HighlightResult {
        const documentId = hit._source?.id || hit._id;
        const highlights: string[] = [];
        const fieldHighlights: HighlightResult['fieldHighlights'] = {};

        if (hit.highlight) {
            // Extract content highlights
            if (hit.highlight.content) {
                fieldHighlights.content = hit.highlight.content;
                highlights.push(...hit.highlight.content);
            }

            // Extract filename highlights
            if (hit.highlight['metadata.filename']) {
                fieldHighlights.filename = hit.highlight['metadata.filename'];
                highlights.push(...hit.highlight['metadata.filename']);
            }
        }

        return {
            documentId,
            highlights,
            fieldHighlights
        };
    }

    /**
     * Generate highlights manually (for non-Elasticsearch sources)
     */
    generateManual(text: string, searchTerms: string[]): string[] {
        const highlights: string[] = [];
        const textLower = text.toLowerCase();

        for (const term of searchTerms) {
            const termLower = term.toLowerCase();
            let startIndex = 0;

            while (startIndex < text.length) {
                const index = textLower.indexOf(termLower, startIndex);
                
                if (index === -1) break;

                // Calculate fragment boundaries
                const fragmentStart = Math.max(0, index - Math.floor(this.config.fragmentSize / 2));
                const fragmentEnd = Math.min(text.length, index + term.length + Math.floor(this.config.fragmentSize / 2));

                // Extract fragment
                let fragment = text.substring(fragmentStart, fragmentEnd);

                // Add ellipsis if not at boundaries
                if (fragmentStart > 0) fragment = '...' + fragment;
                if (fragmentEnd < text.length) fragment = fragment + '...';

                // Highlight the term
                const highlightedFragment = this.highlightTerm(fragment, term);
                highlights.push(highlightedFragment);

                // Move to next occurrence
                startIndex = index + term.length;

                // Limit number of fragments
                if (highlights.length >= this.config.numberOfFragments) {
                    break;
                }
            }

            if (highlights.length >= this.config.numberOfFragments) {
                break;
            }
        }

        return highlights;
    }

    /**
     * Highlight a term in text
     */
    private highlightTerm(text: string, term: string): string {
        const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
        return text.replace(regex, `${this.config.preTag}$1${this.config.postTag}`);
    }

    /**
     * Escape special regex characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Get configuration
     */
    getConfig(): Required<HighlightConfig> {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<HighlightConfig>): void {
        this.config = {
            ...this.config,
            ...config
        };
    }
}
