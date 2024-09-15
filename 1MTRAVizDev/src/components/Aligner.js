//PLEASE NOTE THIS IS ORIGINAL WORK BY STEFAN JANICKE SEE ATTACHED LICENCE AND NOTE THAT MANY SECTIONS HAVE BEEN COPIED OR ONLY SLIGHTLY MODIFIED

import {MTRAVizVertex} from './Vertex.js';

/**
 * Implementation of an own sentence alignment algorithm
 * requires the graph and the configuration object
 */

class MTRAVizAligner{
    constructor(graph, config) {
        this.graph = graph;
        this.config = config;
        
    }

    // method of MTRAVizAligner: normalizing sentences
    normalize(sentence) {
        // stripping tags
        const tempEl = document.createElement('div');
        tempEl.innerHTML = sentence;
        //with or without tags - return sentence with no tags
        sentence = tempEl.textContent || tempEl.innerText || "";

        if (this.config.options.normalize) {
            // Regex: Normalize the sentence by pattern match and replace 
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
            sentence = sentence.replace(/!/g, ""); //added - was not in SJ's original - might there be a reason? what about "?"

            //removing whitespace at the end of sentence
            if(sentence.lastIndexOf(" ") === sentence.length - 1) {
                sentence = sentence.substring(0, sentence.length -1);
            }
        }
        // Replace multiple spaces with a single space no matter if config normalize is chosen
        sentence = sentence.replace(/ {2}/g, " ");
        //console.log('sentence normalized: ', { sentence });
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

        let words = [];           // Store all words from all sentences
        let wordVertices = [];    //Store the vertices belonging to  each word
        let tokenized = [];       //Store tokenized sentences
        let wordList = [];        //store word OBJECTS for each sentence
        let preferenceMerge = []; //to handle merging-preferences based on the ids topkens
        let lastVertex;           //variable to track last processed vertex - ensure order

        //Loop through each sentence to process words and create vertices
        sentences.forEach((sentence, i) => {
            let sword = [];
            lastVertex = undefined;
            //console.log('MTAaS - sentence before normalise:', sentence);
            sentence = this.normalize(sentence); //normalizing the sentence
            //console.log('MTAaS - nromalized sentence:', sentence);

            const tokens = sentence.split(" ");  //divde sentence into tokens
            //console.log('MTAaS - tokens after split:', tokens);

            let t = []; //array to store token objects for the current sentence

            tokens.forEach((token, j) => {
                let contentToken = token;
                let id = false;

                //ensure token contains an id ( <id>token</id>)
                if (token.indexOf("<>") !== -1) {
                    id = token.substring(1, token.indexOf('>'));
                    contentToken = token.substring(token.indexOf('>') + 1);
                    contentToken = contentToken.substring(0, contentToken.indexOf('<'));
                    token = token.substring(0, token.indexOf('>') + 1) + "<>";
                }

                //Create a word object with the ids related to it
                const word = {
                    id: `${i}-${j}`,  // Unique identifier combining sentence and word index
                    word: token,       //token (word)
                    sid: i,            //sentence index
                    wid: j,            // word index within the sentence
                    gid: words.length  // Global index in the words array
                };
                //console.log('MTAaS - word created as object:', word);
                
                words.push(word); //add word to global words array
                //console.log('MTAaS - words array', words);
                sword.push(word); //add word to sentence-specific word array
                //console.log('MTAaS - sentence sepific word array', sword);
                t.push(word);     //addd word to tokenized array for the current sentence
                //console.log('MTAaS - tokenized array', t);
                //console.log('word pushed to stentence array: ', t);

                //Create a new vertex for the current word
                //console.log('MTAaS - what is v before creating v: ', token);
                let v = new MTRAVizVertex(this.graph, this.config.getVertexIndex(), token);
                //console.log('MTAaS - vertex created', v);
                //console.log('MTAaS - v created from MTV this.graph: ', this.graph);
                
                //IF the token has an id, handle preference merging
                if (id) {
                    v.preferenceId = id;
                    if (typeof preferenceMerge[id] === 'undefined') {
                        preferenceMerge[id] = { vertices: [v], tokens: [contentToken] };
                    } else {
                        preferenceMerge[id].vertices.push(v);
                        preferenceMerge[id].tokens.push(contentToken);
                    }
                }

                //Add source information to the vertex
                v.sources.push({ sourceId: i, token: token });

                // dd the vertex to the graph
                //console.log('MTAaS - Before adding vertex', v);
                this.graph.addVertex(v);
                //console.log('MTAaS - verrtex added to graph', v);
                //console.log('MTAaaS - after adding vertix: ', this.graph.vertices);
                //console.log('MTAaS - vertexMap status: ', this.graph.vertexMap);

                //<link the CURRENT vertex with the LAST vertex in the sentence
                if (lastVertex) {
                    lastVertex.addSuccessor(v.index);
                    v.addPredecessor(lastVertex.index);
                    //console.log('MTAaS - linking 1) last vertex to 2) current vertex', lastVertex, v);
                }

                lastVertex = v;                //udating: the last vertex to the current one
                wordVertices[word.id] = v;     // Mappting: the word id to its vertex
            });

            wordList.push(sword);   //ad the sentence-specific word array to wordList
            //console.log('MTA show wordlist: ', wordList);
            tokenized.push(t);      //Add the tokenized sentence to the tokenized array
        });
        //console.log('show me your tokens: ', tokenized);

        //Function to sort word pairs by size
        const sortBySize = (s1, s2) => s2.length - s1.length;

        let pairs = [];  // array - store matching word pairs
        let wordMatches = Array(words.length).fill().map(() => []); //Initialize wordMatches array
        let nodes = Array(words.length).fill(false);   //Initialize nodes array
        let assignments = Array(words.length).fill(false); //Initialize assignments array

        //Loop through sentences to find matching word pairs
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

        //Optimize alignment using  evaluation of word pair relationships
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

        //Merge vertices by preference
        preferenceMerge.forEach(preference => {
            preference.vertices.forEach((vertex, index) => {
                vertex.token = preference.tokens[index];
            });
        });

        //check if merge will becausing a cycle
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

        //Merge word pairs based on preference IDs
        pairs.forEach(pair => {
            let { w1, w2 } = pair.pair;
            let v1 = this.graph.getVertex(wordVertices[w1.id].index);
            let v2 = this.graph.getVertex(wordVertices[w2.id].index);
            if (v1.preferenceId && v1.preferenceId === v2.preferenceId) {
                checkMerge(w1, w2);
                pair.mark = true;
            }
        });

        //Merge the left word pairs
        pairs.forEach(pair => {
            if (!pair.mark) {
                checkMerge(pair.pair.w1, pair.pair.w2);
            }
        });

        //Create the sentence paths by linking vertices from the start to the end vertex
        let sentencePaths = wordList.map(wordArray => {
            let path = [this.graph.startVertex];
            //console.log('MTAaS - path from graph startVertex', path);
            wordArray.forEach((word, j) => {
                let vertex = wordVertices[word.id];
                //console.log('MTAaS:  word being in sentence path creation: ', word, vertex);
                if (j === 0) {
                    this.graph.startVertex.addSuccessor(vertex.index);
                    vertex.addPredecessor(this.graph.startVertex.index);
                }
                if (j === wordArray.length - 1) {
                    vertex.addSuccessor(this.graph.endVertex.index);
                    this.graph.endVertex.addPredecessor(vertex.index);
                }
                //console.log('MTAaS - puhshing vertices: ', vertex);
                path.push(vertex);
            });
            path.push(this.graph.endVertex);
            return path;
        });
        //console.log('MTA-AS: sentencePaths: ', sentencePaths);
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

        // If one of the strings is empty, return the length of the other
        if (a.length === 0) {
            return b.length;
        }
        if (b.length === 0) {
            return a.length;
        }

        // Initialize the matrix with the first row and column filled
        const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // Fill the matrix based on edit operations (substitution, insertion, deletion)
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1]; // No operation needed if characters match
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        // The edit distance is found in the bottom-right cell of the matrix
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

        //Initialize an array to store token matches between s(entence)1 and s(entence)2
        const matches = s1.map(token1 => 
            s2.filter(token2 => {
                //if edit distance option is enabled, calculate the Levenshtein distance
                if (this.config.options.editDistance) {
                    const ld = this.getEditDistance(token1.word, token2.word);
                    const red = (2 * ld) / (token1.word.length + token2.word.length);
                    return red <= this.config.options.editDistance;
                } else {
                    //it not enabled simply compare tokens for exact match
                    return token1.word === token2.word;
                }
            })
        );

        //initialize an array to store all possible paths of aligned tokens
        let paths = [];

        //process mathces by set - building paths
        matches.forEach((matchArray, i) => {
            let newPaths = [];

            //this function adds a path to newPaths, checking for  duplications  and length
            const addPath = (path1) => {
                const lNode1 = path1[path1.length - 1];
                let found = false;
                let np = [];

                // Iterate for mathces, and length 
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

            //now grow extisting paths by matching tokens and creating new paths
            paths.forEach(path => {
                addPath(path);
                const lNode = path[path.length - 1].w2;

                matchArray.forEach(node => {
                    if (node.wid > lNode.wid) {
                        addPath(path.concat([{ w1: s1[i], w2: node }]));
                    }
                });
            });

            //new paths for tokens that haven't been matched
            matchArray.forEach(node => {
                addPath([{ w1: s1[i], w2: node }]);
            });

            paths = newPaths;
        });

        //console.log('MTA-pA - paths aligned by pair: ', paths);

        return paths;
    }



    /**
     * Computes all shortest strongest paths with a given sentencePath that is placed on layer 0.
     * This method uses an iterative approach to maximize overlap between paths while accounting for path strength.
     * 
     * @param {Array} sentencePath - The initial sentence path placed on layer 0.
     * @param {Array} sentencePaths - All sentence paths.
     * @returns {Array} - An array of paths representing the shortest strongest paths in the graph.
     */
    getPathsByEdition(sentencePath, sentencePaths) {

        //Create Copy of sentencePaths exclude the first sentencePath
        let spcopy = sentencePaths.filter(path => path !== sentencePath);
        //console.log('GPBE- first spcopy:', spcopy);
    
        //Set all vertecies, as not traced 
        this.graph.vertices.forEach(vertex => {
            vertex.traced = false;
        });
    
        // set the vertices in the first sentencePath as traced
        sentencePath.forEach(vertex => {
            vertex.traced = true;
        });
    
        let paths = [sentencePath];
        //console.log('GPBE first paths:', paths);
    
        while (spcopy.length > 0) {
            //console.log('GPBE- processing spcopy:', spcopy);
    
            let overlap = 0;
            let id = -1;
            let strength = 0;
    
            //find path with the maximum overlap and strength set id
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
    
            //console.log('GPBE Selected path id:', id, 'with overlap:', overlap, 'and strength:', strength);
    
            //process this best path
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
    
            //now remove the processed path from spcopy
            spcopy.splice(id, 1);
            //console.log('GPBE spcopy after splice:', spcopy);
    
            //console.log('GBPE updated paths:', paths);
        }
    
        return paths;
    }
       
}

export {
    MTRAVizAligner
};
