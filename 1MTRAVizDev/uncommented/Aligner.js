
import {MTRAVizVertex} from './Vertex.js';


/**
 * Implementation of an own sentence alignment algorithm
 * requires the graph and the configuration object
 * Constructor to initialize the configuration with default or provided options.
 * @param {Object} graph 
 * @param {Object} config 
 */

class MTRAVizAligner{
    constructor(graph, config) {
        this.graph = graph;
        this.config = config;
    }

    normalize(sentence) {
        const tempEl = document.createElement('div');
        tempEl.innerHTML = sentence;
        sentence = tempEl.textContent || tempEl.innerText || "";

        if (this.config.options.normalize) {
            sentence = sentence.toLowerCase();
            sentence = sentence.replace(/--/g, "");
            sentence = sentence.replace(/,/g, "");
            sentence = sentence.replace(/\./g, "");
            sentence = sentence.replace(/;/g, "");
            sentence = sentence.replace(/:/g, "");
            sentence = sentence.replace(/\(/g, "");
            sentence = sentence.replace(/\)/g, "");
            sentence = sentence.replace(/\[/g, "");
            sentence = sentence.replace(/\]/g, "");
            sentence = sentence.replace(/'/g, "");
            sentence = sentence.replace(/"/g, "");
            sentence = sentence.replace(/´/g, "");
            sentence = sentence.replace(/`/g, "");
            sentence = sentence.replace(/“/g, "");
            sentence = sentence.replace(/”/g, "");
            sentence = sentence.replace(/!/g, ""); 


            if(sentence.lastIndexOf(" ") === sentence.length - 1) {
                sentence = sentence.substring(0, sentence.length -1);
            }
        }

        sentence = sentence.replace(/ {2}/g, " ");

        return sentence;
    }


    /**
     * Aligns multiple sentences into a graph structure by creating vertices for each word
     * and connecting them based on the sentence structure.
     * 
     * @param {Array<string>} sentences - Array of sentences to be aligned.
     * @returns {Array<Array<MTRAVizVertex>>} - Array of sentence paths represented by arrays of vertices.
     */
    alignSentences(sentences) {

        let words = [];          
        let wordVertices = [];    
        let tokenized = [];       
        let wordList = [];        
        let preferenceMerge = []; 
        let lastVertex;           

        
        sentences.forEach((sentence, i) => {
            let sword = [];
            lastVertex = undefined;
            sentence = this.normalize(sentence);

            const tokens = sentence.split(" ");

            let t = [];

            tokens.forEach((token, j) => {
                let contentToken = token;
                let id = false;


                if (token.indexOf("<>") !== -1) {
                    id = token.substring(1, token.indexOf('>'));
                    contentToken = token.substring(token.indexOf('>') + 1);
                    contentToken = contentToken.substring(0, contentToken.indexOf('<'));
                    token = token.substring(0, token.indexOf('>') + 1) + "<>";
                }

                const word = {
                    id: `${i}-${j}`,  
                    word: token,      
                    sid: i,            
                    wid: j,            
                    gid: words.length 
                };

                words.push(word); 

                sword.push(word); 

                t.push(word);

                let v = new MTRAVizVertex(this.graph, this.config.getVertexIndex(), token);

                if (id) {
                    v.preferenceId = id;
                    if (typeof preferenceMerge[id] === 'undefined') {
                        preferenceMerge[id] = { vertices: [v], tokens: [contentToken] };
                    } else {
                        preferenceMerge[id].vertices.push(v);
                        preferenceMerge[id].tokens.push(contentToken);
                    }
                }

                v.sources.push({ sourceId: i, token: token });

                this.graph.addVertex(v);

                if (lastVertex) {
                    lastVertex.addSuccessor(v.index);
                    v.addPredecessor(lastVertex.index);
                }

                lastVertex = v;                
                wordVertices[word.id] = v;     
            });

            wordList.push(sword);  

            tokenized.push(t); 
        });

        const sortBySize = (s1, s2) => s2.length - s1.length;

        let pairs = []; 
        let wordMatches = Array(words.length).fill().map(() => []);
        let nodes = Array(words.length).fill(false); 
        let assignments = Array(words.length).fill(false); 


        for (let i = 0; i < tokenized.length - 1; i++) {
            for (let j = i + 1; j < tokenized.length; j++) {
                let matches = this.pairAlignment(tokenized[i], tokenized[j], []);
                if (matches.length === 0) continue;

                matches.sort(sortBySize);

                matches[0].forEach(match => {
                    pairs.push({ pair: match, value: 2 });

                    let { w1, w2 } = match;
                    wordMatches[w1.gid].push(w2);
                    wordMatches[w2.gid].push(w1);
                });
            }
        }


        if (this.config.options.optimizeAlignment) {
            pairs.forEach(pair => {
                let { w1, w2 } = pair.pair;
                wordMatches[w1.gid].forEach(wm1 => {
                    if (wm1 === w2) return;
                    wordMatches[w2.gid].forEach(wm2 => {
                        if (wm2 === w1) return;
                        if (wm2 === wm1) pair.value++;
                    });
                });
            });

            pairs.sort((p1, p2) => p2.value - p1.value);
        }


        preferenceMerge.forEach(preference => {
            preference.vertices.forEach((vertex, index) => {
                vertex.token = preference.tokens[index];
            });
        });

 
        const checkMerge = (w1, w2) => {
            let v1 = this.graph.getVertex(wordVertices[w1.id].index);
            let v2 = this.graph.getVertex(wordVertices[w2.id].index);
            if (v1 === v2) return;

            let mergedVertex = this.graph.isAcyclicFromVertex(v1, v2);
            if (mergedVertex) {
                words.forEach(word => {
                    if (wordVertices[word.id] === v1 || wordVertices[word.id] === v2) {
                        wordVertices[word.id] = mergedVertex;
                    }
                });
            }
        };


        pairs.forEach(pair => {
            let { w1, w2 } = pair.pair;
            let v1 = this.graph.getVertex(wordVertices[w1.id].index);
            let v2 = this.graph.getVertex(wordVertices[w2.id].index);
            if (v1.preferenceId && v1.preferenceId === v2.preferenceId) {
                checkMerge(w1, w2);
                pair.mark = true;
            }
        });


        pairs.forEach(pair => {
            if (!pair.mark) {
                checkMerge(pair.pair.w1, pair.pair.w2);
            }
        });

  
        let sentencePaths = wordList.map(wordArray => {
            let path = [this.graph.startVertex];

            wordArray.forEach((word, j) => {
                let vertex = wordVertices[word.id];

                if (j === 0) {
                    this.graph.startVertex.addSuccessor(vertex.index);
                    vertex.addPredecessor(this.graph.startVertex.index);
                }
                if (j === wordArray.length - 1) {
                    vertex.addSuccessor(this.graph.endVertex.index);
                    this.graph.endVertex.addPredecessor(vertex.index);
                }

                path.push(vertex);
            });
            path.push(this.graph.endVertex);
            return path;
        });

        return sentencePaths;
        
    }

    /**
     * Computes the Levenshtein distance (edit distance) between two words.
     * The Levenshtein distance is the minimum number of single-character edits
     * (insertions, deletions, or substitutions) required to change one word into another.
     * 
     * Algorithm source: http://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Levenshtein_distance
     * 
     * @param {string} a - The first word.
     * @param {string} b - The second word.
     * @returns {number} - The edit distance between the two words.
     */
    getEditDistance(a, b) {


        if (a.length === 0) {
            return b.length;
        }
        if (b.length === 0) {
            return a.length;
        }


        const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }


        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1]; 
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, 
                        matrix[i][j - 1] + 1,     
                        matrix[i - 1][j] + 1     
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Computes all possible paths with aligned tokens in the correct order between two sentences.
     * 
     * @param {Array} s1 - The first sentence as an array of token objects.
     * @param {Array} s2 - The second sentence as an array of token objects.
     * @returns {Array} - An array of paths, where each path is an array of objects containing aligned tokens.
     */
    pairAlignment(s1, s2) {


        const matches = s1.map(token1 => 
            s2.filter(token2 => {

                if (this.config.options.editDistance) {
                    const ld = this.getEditDistance(token1.word, token2.word);
                    const red = (2 * ld) / (token1.word.length + token2.word.length);
                    return red <= this.config.options.editDistance;
                } else {
                    
                    return token1.word === token2.word;
                }
            })
        );

        let paths = [];


        matches.forEach((matchArray, i) => {
            let newPaths = [];


            const addPath = (path1) => {
                const lNode1 = path1[path1.length - 1];
                let found = false;
                let np = [];


                for (let j = newPaths.length - 1; j >= 0; j--) {
                    const path2 = newPaths[j];
                    const lNode2 = path2[path2.length - 1];

                    if (lNode1.w2 === lNode2.w2 && path1.length !== path2.length) {
                        if (path1.length <= path2.length) {
                            np.push(path2);
                            found = true;
                        }
                    } else if (lNode1.w2 === lNode2.w2 && path1.length === path2.length) {
                        np.push(path2);
                        found = true;
                    } else {
                        np.push(path2);
                    }
                }

                if (!found) {
                    np.push(path1);
                }
                newPaths = np;
            };


            paths.forEach(path => {
                addPath(path);
                const lNode = path[path.length - 1].w2;

                matchArray.forEach(node => {
                    if (node.wid > lNode.wid) {
                        addPath(path.concat([{ w1: s1[i], w2: node }]));
                    }
                });
            });


            matchArray.forEach(node => {
                addPath([{ w1: s1[i], w2: node }]);
            });

            paths = newPaths;
        });


        return paths;
    }



    /*
     * Computes all shortest strongest paths with a given sentencePath that is placed on layer 0.
     * This method uses an iterative approach to maximize overlap between paths while accounting for path strength.
     * 
     * @param {Array} sentencePath - The initial sentence path placed on layer 0.
     * @param {Array} sentencePaths - All sentence paths.
     * @returns {Array} - An array of paths representing the shortest strongest paths in the graph.
     */
    getPathsByEdition(sentencePath, sentencePaths) {

        let spcopy = sentencePaths.filter(path => path !== sentencePath);

        this.graph.vertices.forEach(vertex => {
            vertex.traced = false;
        });

        sentencePath.forEach(vertex => {
            vertex.traced = true;
        });
    
        let paths = [sentencePath];

    
        while (spcopy.length > 0) {
    
            let overlap = 0;
            let id = -1;
            let strength = 0;
    

            spcopy.forEach((path, index) => {
                let ol = 0;
                let str = 0;
    
                path.forEach(vertex => {
                    if (vertex.traced) {
                        ol++;
                    } else {
                        str += vertex.count;
                    }
                });
    
                if (!overlap || ol > overlap || (ol === overlap && str > strength)) {
                    overlap = ol;
                    id = index;
                    strength = str;
                }
            });
    

            let pi = null;
            let bestPath = spcopy[id];
    
            bestPath.forEach((vertex, index) => {
                if (!pi && !vertex.traced) {
                    pi = [bestPath[index - 1], vertex];
                } else if (pi && vertex.traced) {
                    pi.push(vertex);
                    paths.push(pi);
                    pi = null;
                } else if (pi && !vertex.traced) {
                    pi.push(vertex);
                }
                vertex.traced = true;
            });
    
            if (pi) {
                paths.push(pi);
            }
    
            spcopy.splice(id, 1);

        }
    
        return paths;
    }
       
}

export {
    MTRAVizAligner
};
