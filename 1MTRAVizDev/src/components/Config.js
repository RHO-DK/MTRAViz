//PLEASE NOTE THIS IS ORIGINAL WORK BY STEFAN JANICKE SEE ATTACHED LICENCE AND NOTE THAT MANY SECTIONS HAVE BEEN COPIED OR ONLY SLIGHTLY MODIFIED

/**
 * -------------------------------------------------------
 * CLASS MTRAVizConfig 
 * -------------------------------------------------------
 * Configuration of the visualization
 * The preconfigured options can be overwritten by a JSON object with individual configurations
 */
class MTRAVizConfig {
    /**
     * Constructor to initialize the configuration with default or provided options.
     * @param {Object} options - Custom configuration options to override the defaults.
     */
    constructor(options = {}) {
        this.options = {

            /* General Configuration Options */
            /////////////////////////////////

            // Array of colors used to identify the various edition flows
            colors: ["red", "blue", "green", "rgb(230,230,0)", "orange", "#996600", "purple", "#FF00FF", "#66FFFF", "#339999"],
            
            // If true, sentences will be normalized (remove special characters)
            normalize: true,
            
            // If true, line breaks are allowed (only the width of the given div is used)
            lineBreaks: true,
            
            // If true, line numbers are shown when lineBreaks are used
            lineNumbering: true,
            
            // Text prefix for line numbers
            lineNumberingText: "Line ",
            
            // If true, labels will be drawn from right to left (for languages like Arabic, Hebrew)
            rtl: false,
            
            // Header label to be shown in the popup window
            popupLabel: "occurrences",
            
            // Computes a better alignment at the expense of runtime
            optimizedAlignment: true,
            
            // If true, edition labels are shown in a popup when hovering edges
            editionLabels: true,


            /* Text Vertices Configuration Options */
            ///////////////////////////////////////////////
            
            // Color used for text and joined connections
            baseColor: '#3E576F',
            
            // CSS color for the text backgrounds (false or a color value)
            vertexBackground: 'rgba(242,242,242,0.75)', //rgb - plus opacity - which here is 0.75 - its a light grey
            
            // Text font
            font: 'Georgia',
            
            // If true, start and end vertices are shown and linked to all paths
            startAndEnd: true,
            
            // Text labels are only shown for vertices with more than the given value
            collapseLabels: 0,
            
            // If true, the font size of the vertices is interpolated between 'fontSizeMin' and 'fontSizeMax'
            interpolateFontSize: false,
            
            // Minimum font size
            fontSizeMin: 10,
            
            // Maximum font size
            fontSizeMax: 50,
            
            // The number of pixels the labels grow by edition if interpolateFontSize = false
            fontSizeIncrease: 4,


            /* Connections Configuration Options */
            //////////////////////////////////////
            
            // Minimum gap between two connections; required when adjusting the connections horizontally and vertically
            edgeGap: 5,
            
            // Radius of the curves
            curveRadius: 10,
            
            // How the connections shall be displayed: 
            // 'all' for displaying each individual stream, 
            // 'joined' to merge all parallel connections, or 
            // 'majority' to merge only if more than half of the edges are routed between the same vertices
            connectionType: 'all',
            
            // An edge becomes a majority edge when the given percentage of editions passes it
            majorityPercentage: 0.5,

            // False (or 0) if only exact matches between two words shall be merged or edit distance dependent on the word lengths computed with the formula 2*editDistance/(|word1|+|word2|)
            editDistance: 0.5,

            // If true, the user is allowed to interactively split vertices or merge via drag&drop
            splitAndMerge: true,
            
            // If true, transpositions shall be determined and visualized on mouseover
            transpositions: true,

            // It true, cross language similarity tokens will be higlighted by mouseover
            crossLanguageTokenMatch: true
        };

        // Merge the provided options with the default options
        this.options = { ...this.options, ...options };

        // Initialize the vertex index
        this.vid = 0;
    }

    /**
     * Getter for a unique vertex index (required for vertex hash in the graph)
     * @returns {number} - A unique vertex index
     */
    getVertexIndex() {
        return ++this.vid;
    }

    /**
     * Converts HSV to RGB.
     * Adapted from http://jsres.blogspot.de/2008/01/convert-hsv-to-rgb-equivalent.html BUT: // updated with switch instead of if-else
     * @param {number} h - Hue (0-1)
     * @param {number} s - Saturation (0-1)
     * @param {number} v - Value (0-1)
     * @returns {string} - The RGB equivalent in the format "rgb(r,g,b)"
     */
    Hsv2rgb(h, s, v) {
        let r, g, b;
        const var_h = h * 6;

        if (var_h === 6) {
            var_h = 0;
        }

        const var_i = Math.floor(var_h);
        const var_1 = v * (1 - s);
        const var_2 = v * (1 - s * (var_h - var_i));
        const var_3 = v * (1 - s * (1 - (var_h - var_i)));

        switch (var_i) {
            case 0:
                r = v;
                g = var_3;
                b = var_1;
                break;
            case 1:
                r = var_2;
                g = v;
                b = var_1;
                break;
            case 2:
                r = var_1;
                g = v;
                b = var_3;
                break;
            case 3:
                r = var_1;
                g = var_2;
                b = v;
                break;
            case 4:
                r = var_3;
                g = var_1;
                b = v;
                break;
            default:
                r = v;
                g = var_1;
                b = var_2;
        }

        return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    }

     /**
     * Getter for an arbitrary number of colors.
     * If the requested number of colors exceeds the predefined array, 
     * randomly generated saturated colors are added.
     * @param {number} num - The number of colors needed.
     * @returns {string[]} - An array of color strings.
     */
     getColors(num) {
        const colors = [];
        for (let i = 0; i < num; i++) {
            if (i >= this.options.colors.length) {
                colors.push(this.Hsv2rgb(((Math.random() * 360) + 1) / 360, 1, (25 + (Math.random() * 50) + 1) / 100));
            } else {
                colors.push(this.options.colors[i]);
            }
        }
        return colors;
    }
}

export {
    MTRAVizConfig
};
