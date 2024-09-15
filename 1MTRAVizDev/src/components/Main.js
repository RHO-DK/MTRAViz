//PLEASE NOTE THIS IS ORIGINAL WORK BY STEFAN JANICKE SEE ATTACHED LICENCE AND NOTE THAT MANY SECTIONS HAVE BEEN COPIED OR ONLY SLIGHTLY MODIFIED

import { MTRAVizGraph } from './Graph.js';
import { MTRAVizVertex } from './Vertex.js';
import { MTRAVizConfig } from './Config.js';
import { MTRAVizConnection} from './Connection.js';
import { MTRAVizHorizontalConnection } from './HorizontalConnection.js';
import { MTRAVizVerticalConnection } from './VerticalConnection.js';
import { MTRAVizAligner } from './Aligner.js';
import { 
    translateToken,
    growSynonyms
 } from './Utilities.js';




/** 
 * Main component of the system.
 * Requires the id of a <div> and optional individual configurations in the form of a JSON object <options>.
 * Holds the graph and implements its visualization.
 */
class MTRAViz {
    /**
     * Creates an instance of MTRAViz.
     * @param {string} div - id of div element which holds the visualization.
     * @param {Object} options - Optional configurations - see "Config.js"
     */
    constructor(div, options) {
        this.div = div;
        this.config = new MTRAVizConfig(options);
        this.curveRadius = this.config.options.curveRadius;
        this.graph = new MTRAVizGraph(this.config);
        this.originGraph = new MTRAVizGraph(this.config);
        this.startVertex = new MTRAVizVertex(this.graph, 'first', '');
        this.graph.addVertex(this.startVertex);
        this.endVertex = new MTRAVizVertex(this.graph, 'last', '');
        this.graph.addVertex(this.endVertex);
        this.graph.startVertex = this.startVertex;
        this.graph.endVertex = this.endVertex;
   

        this.edgeGroups = [];
        this.connections = [];
        this.vertexConnections = [];
        this.horizontalSlots = [];
        this.basicConnections = [];
        this.layers = [];
        this.layout = [];

    }

    /**
     * Initializes the SVG element within the specified container div.
     * Ensures that the container div exists before attempting to create the SVG element.
     * Sets up the basic structure of the SVG - width, height, and any required groups for different visual elements.
     * This function is a CRITICAL element in the modernized code - moving from Raphäel which could "intialize an svg on the fly"
     */
    initSvg() {
        //make sure the container div exists
        const container = document.getElementById(this.div);
        if (!container) {
            console.error(`Div with id ${this.div} does not exist`);
            return;
        }

        //detect and assign the container's dimensions
        const width = container.clientWidth;
        const height = container.clientHeight;
        //console.log(`initSvg - container-width: ${width}, -height: ${height}`);

        //initialize SVG element with the deteted and assigned dimension, widht and height
        this.svg = d3.select(`#${this.div}`)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

    }


    /**
     * Triggers the alignment of the given sources that evolves the Text Variant Graph.
     * @param {Array} sources - Array of source objects, each containing an edition, text, and optionally an id.
     * Each source objectmiust  have the following structure:
     * {
     *   id: {string},      //unique identifier for the edition (optional)
     *   edition: {string}, //edition name or identifier
     *   text: {string}     //text content of the edition
     * }
     */
    align(sources) {
        //Global structure to store vertices by language is initialized if it doesn't exist
        if (!window.languageVertices) {
            window.languageVertices = {
                EN: [], //create more suitable names if these keyas ore not relevant - 
                DE: [], 
                ES: []  
            };

            //console.log(window.languageVertices);

        }

        //now continue with the orginal soruce code alignment
        this.editions = [];
        this.sentences = [];
        this.colorMap = [];
    
    
        const colors = this.config.getColors(sources.length);
    
        sources.forEach((source, i) => {
            this.editions.push(source.edition);
            this.sentences.push(source.text);
            source.color = colors[i];
            this.colorMap[source.edition] = colors[i];
        });
    
        this.mainBranch = this.editions[0];
        this.aligner = new MTRAVizAligner(this.graph, this.config);
    
        this.sentencePaths = this.aligner.alignSentences(this.sentences);
    
        this.sentencePathHash = {};
        this.editions.forEach((edition, i) => {
            this.sentencePathHash[edition] = this.sentencePaths[i];
        });
    
        //Oopulate this.vertices
        this.vertices = this.graph.vertices;
        console.log('this.vertices local:', this.vertices);
    
        //determine the language based on the suffix of the edition
        const languageSuffix = this.getLanguageSuffix(this.editions[0]); //ALL editions MUST have a similar suffix (_EN, _DE, _ES)
        //console.log('align: languagesuffix: ', languageSuffix);
    
        //ad tokens from this.vertices to the corresponding language array in window.languageVertices
        if (languageSuffix && window.languageVertices[languageSuffix]) {
            window.languageVertices[languageSuffix].push(...this.vertices); //here: push vertices to the specific language array
        }
        //console.log('global tokens: ', window.languageVertices);

        
        this.vertices.forEach((vertex, index) => {
            let tokenCount = {};
            let maxToken = '';
            let maxCount = 0;
    
            vertex.sources.forEach(source => {
                const token = source.token;
                if (!tokenCount[token]) {
                    tokenCount[token] = 0;
                }
                tokenCount[token]++;
                if (tokenCount[token] > maxCount) {
                    maxToken = token;
                    maxCount = tokenCount[token];
                }
            });
    
            vertex.token = maxToken;
        });
    
        this.originGraph = this.graph.clone();
    
        this.originSentencePaths = [];
        this.sentencePaths.forEach(path => {
            this.originSentencePaths.push([...path]);
        });

    }

    // Helper function to extract the language suffix (_EN, _DE, _ES)
    //used in align method above  should be moved to utility function
    getLanguageSuffix(edition) {
        const match = edition.match(/_(EN|DE|ES)$/);
        return match ? match[1] : null; //return the matched language suffix (EN, DE, ES) or null if not found - measn process cointinues also without returned suffix
    };
    
 
    /**
     * resets the graph after succesfull merge - called in visualize
     * Resets the graph and sentence paths to their original states.
     * Removes dummy vertices, clears predecessor and successor links, and reassigns the graph vertices.
     */
    reset() {

        //splice all dummy vertices from the sentence paths
        this.sentencePaths.forEach(path => {
            for (let j = path.length - 1; j >= 0; j--) {
                if (path[j].dummy) {
                    path.splice(j, 1);
                }
            }
        });

        //clear links -  all predecessor and successor in the original graph vertices
        this.originGraph.vertices.forEach(vertex => {
            vertex.predecessors = [];
            vertex.successors = [];
        });

        //confirm - predecessor and successor links in the original graph are based on the sentence paths, as was
        this.sentencePaths.forEach(path => {
            for (let j = 0; j < path.length - 1; j++) {
                const currentVertex = this.originGraph.getVertex(path[j].index);
                const nextVertex = this.originGraph.getVertex(path[j + 1].index);
                currentVertex.addSuccessor(nextVertex.index);
                nextVertex.addPredecessor(currentVertex.index);
            }
        });

        //clone the original graph to reset the current graph
        this.graph = this.originGraph.clone();
        this.aligner.graph = this.graph;
        this.vertices = this.graph.vertices;
        this.startVertex = this.graph.getVertex("first");
        this.endVertex = this.graph.getVertex("last");

        //Update sentence paths to point to the new graph vertices
        this.sentencePaths.forEach(path => {
            for (let j = path.length - 1; j >= 0; j--) {
                path[j] = this.graph.getVertex(path[j].index);
            }
        });

        //layer information and tokens updating in the graph pobject vertices
        this.vertices.forEach(vertex => {
            vertex.layer = undefined;
            vertex.originLayer = undefined;

            let mostCommonToken = "";
            let maxCount = 0;
            const tokenNameHash = [];

            vertex.sources.forEach(source => {
                const token = source.token;
                let found = false;

                for (let k = 0; k < tokenNameHash.length; k++) {
                    if (tokenNameHash[k].t === token) {
                        tokenNameHash[k].c++;
                        found = true;

                        if (tokenNameHash[k].c > maxCount) {
                            mostCommonToken = token;
                            maxCount = tokenNameHash[k].c;
                        }
                        break;
                    }
                }

                if (!found) {
                    tokenNameHash.push({
                        t: token,
                        c: 1
                    });

                    if (maxCount === 0) {
                        mostCommonToken = token;
                        maxCount = 1;
                    }
                }
            });

            vertex.token = mostCommonToken;
        });
    }

    
    /**
     * Overwrites the colormap
     * @param {Object} colorMap - An object representing the new colormap
     */
    setColorMap(colorMap) {
        this.colorMap = colorMap;
    }


    /**
     * Initializes visual connections for each adjacent vertex pair.
     * Depending on the layers of the corresponding vertices, a different connection type is assigned.
     */
    prepareConnections() {

        this.connections = [];
        let horizontalSlots = this.layers.map(layer => ({
            height: 0,
            paths: [],
            index: layer.index
        }));

        
         //Adds a horizontal connection to the appropriate slot in horizontalSlots.
        const putHorizontalSlot = (layer, hc) => {
            for (let i = 0; i < horizontalSlots.length; i++) {
                if (horizontalSlots[i].index === layer) {
                    horizontalSlots[i].paths.push(hc);
                    break;
                }
            }
        };

        const sal = this;

        /**
         * Calculates and sets the heights for each horizontal slot based on path grouping.
         */
        const setSlotHeights = () => {
            let x_min = Number.MAX_SAFE_INTEGER, x_max = 0;

            //determine the minimum and maximum x-coordinates of vertices
            sal.layout.forEach(v => {
                if (v.x1 < x_min) x_min = v.x1;
                if (v.x2 > x_max) x_max = v.x2;
            });

            
            //Checks if two groups of paths are equal.
            const equalGroups = (g1, g2) => {
                if (g1.length !== g2.length) return false;
                for (let i = 0; i < g1.length; i++) {
                    if (g1[i] !== g2[i]) return false;
                }
                return true;
            };

            //Computes height for each slot by the maximum number of overlapping paths
            horizontalSlots.forEach(slot => {
                let groups = [];
                for (let j = x_min; j < x_max; j++) {
                    let group = [];
                    slot.paths.forEach(path => {
                        if (path.v1.x2 < j && path.v2.x1 > j) {
                            group.push(path);
                        }
                    });
                    if (group.length > 0 && (groups.length === 0 || !equalGroups(groups[groups.length - 1], group))) {
                        groups.push(group);
                    }
                }
                let max = 0;
                groups.forEach(group => {
                    if (group.length > max) max = group.length;
                });
                slot.height = max * 3 + 2 * sal.curveRadius;
                slot.groups = groups;
            });
        };

        // Iterate through all vertices to establish connections by the successors of the veritices
        this.vertices.forEach(v1 => {
            v1.successors.forEach(successorIndex => {
                const v2 = this.graph.getVertex(successorIndex);

                //skip connections due configuration about circle and rect start and end
                if (!this.config.options.startAndEnd && (v1 === this.startVertex || v2 === this.endVertex)) {
                    return;
                }

                if (v1.token === '' && v2.token === '' && !v2.linebreak && v2 !== this.endVertex) {
                    return;
                }

                if (v1.layer === v2.layer) {
                    //same-layer connections
                    let overlaps = this.vertices.some(v => 
                        v !== v1 && v !== v2 && v.layer === v1.layer && v1.x1 < v.x1 && v.x1 < v2.x1
                    );

                    if (overlaps) {
                        let con = new MTRAVizConnection(v1, v2, 0);
                        let vc1 = new MTRAVizVerticalConnection(v1, v2, 'source');
                        let hc = new MTRAVizHorizontalConnection(v1, v2, 0);
                        let vc2 = new MTRAVizVerticalConnection(v1, v2, 'sink');
                        this.connections.push(con);
                        con.addLink(vc1);
                        con.addLink(hc);
                        con.addLink(vc2);
                        putHorizontalSlot(v1.layer, hc);
                    } else {
                        this.connections.push(new MTRAVizConnection(v1, v2, -1));
                    }
                } else {
                    //cross-layer connections
                    let con = new MTRAVizConnection(v1, v2, 3);
                    this.connections.push(con);
                    let vc1 = new MTRAVizVerticalConnection(v1, v2, 'source');
                    let hc = new MTRAVizHorizontalConnection(v1, v2, 3);
                    let vc2 = new MTRAVizVerticalConnection(v1, v2, 'sink');

                    if (Math.abs(v1.layer) > Math.abs(v2.layer)) {
                        if (v1.layer < 0) {
                            putHorizontalSlot(v1.layer + 1, hc);
                        } else {
                            putHorizontalSlot(v1.layer, hc);
                        }
                    } else {
                        if (v2.layer < 0) {
                            putHorizontalSlot(v2.layer + 1, hc);
                        } else {
                            putHorizontalSlot(v2.layer, hc);
                        }
                    }

                    con.addLink(vc1);
                    con.addLink(hc);
                    con.addLink(vc2);
                }
            });
        });

        setSlotHeights();
        this.horizontalSlots = horizontalSlots;
    }

    
    /**
     * Adds the given edge {h, t} to its corresponding group.
     * @param {Object} h - The head vertex of the edge.
     * @param {Object} t - The tail vertex of the edge.
     * @param {Object} e - The edge to be added.
     * @param {Array} ids - The ids associated with the edge.
     */
    addEdgeToGroup(h, t, e, ids) {
        //console.log('addETG - starting to add edge to group');
        //console.log('adegt: initial edgeGroups:', this.edgeGroups);
        //console.log('addEGT: parameters - h:', h, 't:', t, 'e:', e, 'ids:', ids);

        //Is edgegropu found?
        let found = false;

        //Iterate through existing edge groups to find the matching one
        for (let group of this.edgeGroups) {
            //console.log(`aETG Checking group with h:${group.h} and t:${group.t}`);

            if (group.h === h && group.t === t) {
                group.edges.push(e);
                group.ids = group.ids.concat(ids);
                found = true;
                //console.log('AETG group with new edge and ids.', group);
                break;
            }
        }

        //If the edge group not found, create new 
        if (!found) {
            const newGroup = {
                h: h,
                t: t,
                edges: [e],
                ids: ids
            };
            this.edgeGroups.push(newGroup);
            //console.log('aETG: new groupcreated :', newGroup);
        }

        //console.log('aETG - final edgeGroups:', this.edgeGroups);
    }

    /**
     * Computes and assigns edge labels with tooltips to the edges in edgeGroups.
     * Tooltips display the editions associated with each edge.
     * depends on isCorrectEdgeForEdition above to decide the correct edge across different divs - must also be appended to by - not to div
     */
    computeEdgeLabels() {
        //console.log('Starting computeEdgeLabels');
        
        const body = d3.select('body');
    
        for (let i = 0; i < this.edgeGroups.length; i++) {
            const group = this.edgeGroups[i];
            //console.log('processing edge group:', i);
    
            let tiptext = "";
            for (let j = 0; j < group.ids.length; j++) {
                const editionId = group.ids[j];
                //console.log('cel editionId: ', editionId);
                const editionColor = this.colorMap[this.editions[editionId]];
                const editionText = this.editions[editionId];
                //console.log('cel editionText: ', editionText);
                tiptext += `<div class="tooltip-text edge-tooltip-text" style="color:${editionColor};">${editionText}</div>`;
            }
            //console.log('tooltip text:', tiptext);
    
            for (let j = 0; j < group.edges.length; j++) {
                const edgeNode = group.edges[j].node();
                //console.log('edge node', j, 'in group', i, 'is:', edgeNode);
    
                if (edgeNode) {
                    //attaching mouse event listeners to show or hide the tooltip
                    d3.select(edgeNode)
                        .on("mouseenter", function(event) {
                            //append the tooltip div to the body and position it
                            body.append("div")
                                .attr("class", "tooltip tooltip-edge edge-tooltip")
                                .html(tiptext)
                                .style("left", `${event.pageX + 10}px`) //positioned by pixel distance to mus psition dynamic positioning
                                .style("top", `${event.pageY + 10}px`) //dynamic - se line above 
                                .style("visibility", "visible");
                        })
                        .on("mousemove", function(event) {
                            //udate tooltip position when mouse moves
                            d3.select(".edge-tooltip")
                                .style("left", `${event.pageX + 10}px`)
                                .style("top", `${event.pageY + 10}px`);
                        })
                        .on("mouseleave", function() {
                            //Remove the tooltip when the mouse leaves the edge
                            d3.selectAll(".edge-tooltip").remove();
                        });
                } else {
                    console.warn(`Edge node ${j} in group ${i} is undefined or null!`);
                }
            }
        }
    
        //console.log('Finished cel');
    }
    
    
    /**
     * For DISPLAY/rendering
     * Draws joined connections.
     * Iterates over the connections array, generates paths, and adds them to the SVG display
     * Ensures vertices are brought to the front based on configuration options.
     */
    generalConnections() {
        //console.log('GC: Starting');

        //clear existing connections
        this.basicConnections = [];
        //console.log('GC: cleared this.basicConnections');
    
        // Iterate over the connections to draw paths
        this.connections.forEach((connection, index) => {
            console.log('gC this.connections: ', this.connections);
            //genrate path for particular connection
            const path = this.generatePath(connection, 0, 0);
            //console.log(`GC: pat for connection ${index}`, path);
    
            //NOW - create an SVG path element with D3
            const pvis = this.svg.append('path')
                .attr('d', path)
                .attr('stroke', this.config.options.baseColor)
                .attr('stroke-width', 3)
                .attr('stroke-linecap', 'round')
                .attr('opacity', 0.8);
            
                
            //and add this to basicConnections array
            //console.log('GC (New): Created path', pvis);
            this.basicConnections.push(pvis);
            
        });
    
        //bring specific rect or token elements forward depending on  config
        this.vertices.forEach((vertex, index) => {
            if (vertex === this.startVertex || vertex === this.endVertex || vertex.token === '') {
                return;
            }
            if (this.config.options.vertexBackground) {
                d3.select(vertex.rect).raise();

            }
            if (vertex.count > this.config.options.collapseLabels) {
                d3.select(vertex.textNode).raise();

            }
        });
        //console.log('GC: completed');
    }
    

    /**
     * Adjusts vertical connections for the graph.
     * This method calculates and positions all required vertical connections,
     * and adjusts their positions to avoid overlap.
     */
    adjustVerticalConnections() {

        //store all vertical connections in an array
        let verticals = [];

        //iterate over all connections and determine vertical links
        for (let i = 0; i < this.connections.length; i++) {
            let c = this.connections[i];
            let x1 = c.v1.x2;
            let x2 = c.v2.x1;
            let xc = (x1 + x2) / 2;
            let y1 = (c.v1.y1 + c.v1.y2) / 2;
            let y2 = (c.v2.y1 + c.v2.y2) / 2;

            //handle connection types
            if (c.type === 1) {
                //type 1 connection (straight)
                let vy1, vy2;
                if (y1 > y2) {
                    vy1 = y1 - this.curveRadius;
                    vy2 = y2 + this.curveRadius;
                } else {
                    vy1 = y1 + this.curveRadius;
                    vy2 = y2 - this.curveRadius;
                }
                let vc = c.links[0];
                vc.position(xc, vy1, vy2);
                verticals.push(vc);
            } else if (c.type === 0 || c.type === 3) {
                //type 0 or type 3 connection (curved)
                let h = c.links[1];
                let v1x = x1 + this.curveRadius;
                let v1y1, v1y2;
                if (c.v1.layer >= c.v2.layer) {
                    v1y1 = y1 - this.curveRadius;
                    v1y2 = h.y1 + this.curveRadius;
                } else {
                    v1y1 = y1 + this.curveRadius;
                    v1y2 = h.y1 - this.curveRadius;
                }
                let vc1 = c.links[0];
                vc1.position(v1x, v1y1, v1y2);
                verticals.push(vc1);

                let v2x = x2 - this.curveRadius;
                let v2y1, v2y2;
                if (c.v1.layer <= c.v2.layer) {
                    v2y1 = h.y1 + this.curveRadius;
                    v2y2 = y2 - this.curveRadius;
                } else {
                    v2y1 = h.y1 - this.curveRadius;
                    v2y2 = y2 + this.curveRadius;
                }
                let vc2 = c.links[c.links.length - 1];
                vc2.position(v2x, v2y1, v2y2);
                verticals.push(vc2);
            }
        }

        //store the vertical connections
        this.verticals = verticals;

        //sor the connections the X position
        verticals.sort(function (v1, v2) {
            if (v1.x1 < v2.x1) return -1;
            if (v1.x1 === v2.x1 && v1.yMax() > v2.yMax()) return -1;
            return 1;
        });

        //group vertical connections
        let groups = [];
        for (let j = 0; j < verticals.length; j++) {
            let sourceFound = false;
            let sinkFound = false;
            for (let k = 0; k < groups.length; k++) {
                //group verticals by "source and sink"
                if ((verticals[j].type === 'source' || verticals[j].type === 1) && groups[k].source === verticals[j].v1) {
                    sourceFound = true;
                    groups[k].paths.push(verticals[j]);
                    groups[k].y1 = Math.min(groups[k].y1, verticals[j].yMin());
                    groups[k].y2 = Math.max(groups[k].y2, verticals[j].yMax());
                }
                if ((verticals[j].type === 'sink' || verticals[j].type === 1) && groups[k].sink === verticals[j].v2) {
                    sinkFound = true;
                    groups[k].paths.push(verticals[j]);
                    groups[k].y1 = Math.min(groups[k].y1, verticals[j].yMin());
                    groups[k].y2 = Math.max(groups[k].y2, verticals[j].yMax());
                }
            }
            //If no source or sink found, creates a new group
            if (!sourceFound && verticals[j].type !== 'sink') {
                groups.push({
                    vertex: verticals[j].v1,
                    source: verticals[j].v1,
                    paths: [verticals[j]],
                    y1: verticals[j].yMin(),
                    y2: verticals[j].yMax(),
                    x: verticals[j].v1.x2 + this.curveRadius,
                });
            }
            if (!sinkFound && verticals[j].type !== 'source') {
                groups.push({
                    vertex: verticals[j].v2,
                    sink: verticals[j].v2,
                    paths: [verticals[j]],
                    y1: verticals[j].yMin(),
                    y2: verticals[j].yMax(),
                    x: verticals[j].v2.x1 - this.curveRadius,
                });
            }
        }

        //sort groups by their number of paths and by inital/origin layer
        groups.sort(function (g1, g2) {
            if (g1.paths.length > g2.paths.length) return 1;
            if (g1.paths.length === g2.paths.length && Math.abs(g1.vertex.originLayer) < Math.abs(g2.vertex.originLayer))
                return 1;
            return -1;
        });

        //groop ordering
        let groupsToPlace = [];
        while (groups.length > 0) {
            let g1 = groups.pop();
            let ng1 = [];
            for (let k = 0; k < g1.paths.length; k++) {
                if (!g1.paths[k].placed) {
                    ng1.push(g1.paths[k]);
                }
            }
            //if paths are found without connections then keep pathgropu
            if (ng1.length < g1.paths.length) {
                if (ng1.length === 0) {
                    continue;
                }
                g1.paths = ng1;
                groups.sort(function (g1, g2) {
                    if (g1.paths.length > g2.paths.length) return 1;
                    if (
                        g1.paths.length === g2.paths.length &&
                        Math.abs(g1.vertex.originLayer) < Math.abs(g2.vertex.originLayer)
                    )
                        return 1;
                    return -1;
                });
                groups.push(g1);  //and re-process - iterating until all optimal placements are found
                continue;
            }
            //then flag  paths as placed and add the group to the list of groups to place
            for (let k = 0; k < g1.paths.length; k++) {
                g1.paths[k].placed = true;
            }
            groupsToPlace.push(g1);
        }

        //sort groups by X position and size
        groupsToPlace.sort(function (g1, g2) {
            if (g1.x < g2.x) return 1;
            if (g1.x === g2.x && g1.paths.length > g2.paths.length && g1.source) return 1;
            return -1;
        });

        //place the groups and avoid creating overlaps
        let placedGroups = [];
        while (groupsToPlace.length > 0) {
            let g1 = groupsToPlace.pop();  //process last group from the list

            //Adjust position of group if it has a source or sink
            if (typeof g1.source !== 'undefined') {
                let ox = g1.x;
                let nx = g1.paths[0].v1.x2 + this.curveRadius;
                if (ox !== nx) {
                    g1.x = nx;
                    groupsToPlace.sort(function (g1, g2) {
                        if (g1.x < g2.x) return 1;
                        if (g1.x === g2.x && g1.paths.length > g2.paths.length && g1.source) return 1;
                        return -1;
                    });
                    groupsToPlace.push(g1);
                    continue;
                }
            }
            if (typeof g1.sink !== 'undefined') {
                let ox = g1.x;
                let nx = g1.paths[0].v2.x1 - this.curveRadius;
                if (ox !== nx) {
                    g1.x = nx;
                    groupsToPlace.sort(function (g1, g2) {
                        if (g1.x < g2.x) return 1;
                        if (g1.x === g2.x && g1.paths.length > g2.paths.length && g1.source) return 1;
                        return -1;
                    });
                    groupsToPlace.push(g1);
                    continue;
                }
            }

            // djust group positions avoiding overlaps
            let overlap;
            do {
                overlap = false;
                for (let k = 0; k < placedGroups.length; k++) {
                    let g2 = placedGroups[k];
                    if (
                        Math.abs(g1.x - g2.x) < this.config.options.edgeGap &&
                        !(g1.y1 > g2.y2 || g2.y1 > g1.y2)
                    ) {
                        overlap = true;
                        g1.x += this.config.options.edgeGap - Math.abs(g1.x - g2.x);
                    }
                }
            } while (overlap);

            //place paths in the group at the positions found by adjustment
            for (let k = 0; k < g1.paths.length; k++) {
                let p = g1.paths[k];
                p.x1 = g1.x;
                p.x2 = g1.x;
                p.gc = g1.paths.length;
                let v = p.v2;
                if (v.x1 - g1.x < this.curveRadius) {
                    let s = this.curveRadius - (v.x1 - g1.x);
                    v.x1 += s;
                    v.x2 += s;
                    let pairs = [];
                    for (let m = 0; m < v.successors.length; m++) {
                        if (v.level === this.graph.getVertex(v.successors[m]).level) {
                            pairs.push({
                                head: v,
                                tail: this.graph.getVertex(v.successors[m]),
                            });
                        }
                    }
                    while (pairs.length > 0) {
                        let pairsNew = [];
                        for (let m = 0; m < pairs.length; m++) {
                            let v1 = pairs[m].head;
                            let v2 = pairs[m].tail;
                            if (v2.x1 - v1.x2 < 4 * this.curveRadius) {
                                let sh = 4 * this.curveRadius - (v2.x1 - v1.x2);
                                v2.x1 += sh;
                                v2.x2 += sh;
                                for (let n = 0; n < v2.successors.length; n++) {
                                    pairsNew.push({
                                        head: v2,
                                        tail: this.graph.getVertex(v2.successors[n]),
                                    });
                                }
                            }
                        }
                        pairs = pairsNew;
                    }
                }
            }
            placedGroups.push(g1);
        }
    }


    
    /**
     * Removes the specified vertical connection from the list of vertical connections.
     * Iterates through the vertical connections and removes the specified connection if found.
     * @param {Object} vertical - The vertical connection to remove.
     */
    removeVertical(vertical) {
    
        for (let i = 0; i < this.verticals.length; i++) {
            if (this.verticals[i] === vertical) {
                this.verticals.splice(i, 1);
                return;
            }
        }
    }


    /**
     * Removes overlaps between vertical connections and vertices.
     * Iterates through vertical connections and vertices to adjust positions and avoid overlaps.
     * also using an extensive algorithm for processing all possiblities
     */
    removeOverlaps() {

        // Function to sort vertical connections - invoked in visualize function
        const sortVerticals = (v1, v2) => {
            if (v1.x1 > v2.x1) return 1;
            if (v1.x1 === v2.x1) return 0;
            return -1;
        };

        //Iterate through vertical connections
        this.verticals.forEach(vertical => {
            // Iterate through vertices
            this.vertices.forEach(vertex => {
                if (vertex.token === '') return;

                const x11 = vertical.x1 - this.curveRadius;
                const x12 = vertical.x2 + this.curveRadius;
                const y11 = vertical.yMin() - this.curveRadius;
                const y12 = vertical.yMax() + this.curveRadius;
                const x21 = vertex.x1;
                const x22 = vertex.x2;
                const y21 = vertex.y1;
                const y22 = vertex.y2;

                //Check for overlap
                if (this.overlap(x11, x12, x21, x22, y11, y12, y21, y22)) {
                    let v1 = vertex;
                    let ml = Math.abs(vertex.x2 - x11);
                    let mr = Math.abs(v1.x1 - x12);
                    let moved = false;
                    let moveLeft = true;

                    //Check if moving left is possible
                    this.vertices.forEach(v0 => {
                        if (v1 === v0 || (v0 === this.startVertex && !this.config.options.startAndEnd)) return;
                        const con = this.getConnection(v0, v1);
                        if (!con || 
                            (con.type === 1 && con.links[0].x1 + this.curveRadius >= v1.x1 - ml) || 
                            (con.type === -1 && con.v2.x1 - con.v1.x2 - 3 * this.curveRadius < ml) || 
                            (con.type !== -1 && con.type !== 1)) {
                            moveLeft = false;
                        }
                    });

                    if (moveLeft) {
                        moved = true;
                        v1.x1 -= ml;
                        v1.x2 -= ml;
                    }

                    //Check if moving right is possible
                    if (!moved) {
                        let moveRight = true;
                        this.vertices.forEach(v2 => {
                            if (v1 === v2 || (v2 === this.endVertex && !this.config.options.startAndEnd)) return;
                            const con = this.getConnection(v1, v2);
                            if (!con || 
                                (con.type === 1 && con.links[0].x1 - this.curveRadius < v1.x2 + mr) || 
                                (con.type === -1 && con.v2.x1 - con.v1.x2 - 3 * this.curveRadius < mr) || 
                                (con.type !== -1 && con.type !== 1)) {
                                moveRight = false;
                            }
                        });

                        if (moveRight) {
                            moved = true;
                            v1.x1 += mr;
                            v1.x2 += mr;
                        }
                    }
                }
            });
        });
    }

    /**
     * Transforms edges of type 3 into edges of type 1, if possible.
     * This method checks for overlaps between connections, vertices, and verticals, and transforms
     * complex connections (type 3) into simpler connections (type 1) when it is safe to do so.
     * also a very exhaustive algortihm
     * 
     * @method transformEdgeTypes
     */
    transformEdgeTypes() {

        // Array to protions of horizontal connections for overlap checking
        let horizontalSnippets = [];
    
        //First pass- collect horizontal snippets for type 1 connections
        for (let i = 0; i < this.connections.length; i++) {
            const c = this.connections[i];
            //console.log('review this.connections: ', this.connections);

    
            if (c.type === 1) {
                const v = c.links[0];
                const y1 = (c.v1.y1 + c.v1.y2) / 2;
                const y2 = (c.v2.y1 + c.v2.y2) / 2;
    
                //Store horizontal snippets related to this.connection
                horizontalSnippets.push({
                    x1: c.v1.x2,
                    x2: v.x1,
                    y1: y1,
                    y2: y1,
                    v1: c.v1,
                    v2: c.v2
                });
    
                horizontalSnippets.push({
                    x1: v.x1,
                    x2: c.v2.x1,
                    y1: y2,
                    y2: y2,
                    v1: c.v1,
                    v2: c.v2
                });
            }
        }
    

        //console.log("tokens before sorting:");
        for (let i = 0; i < this.connections.length; i++) {
            const c = this.connections[i];
        }
    
        //Define the sorting function- an function internal to the method
        const sortConnections = function(c1, c2) {
            if (c1.v1.x2 > c2.v1.x2) {
                return 1;
            }
            return -1;
        };
    
        //sort connections by calling the internal sorting function
        this.connections.sort(sortConnections);
    
        //console.log("tokens after sorting:");
        for (let i = 0; i < this.connections.length; i++) {
            const c = this.connections[i];
        }
    
        //Second pass- adjust x-coordinates for type 0 and type 3 connections
        for (let i = 0; i < this.connections.length; i++) {
            const c = this.connections[i];
    
            if (c.type === 0 || c.type === 3) {
                const v1 = c.links[0];
                const h = c.links[1];
                const v2 = c.links[2];
    
                //Adjsting horizontal coordinates to accommodate the curve radius- a set property
                h.x1 = v1.x1 + this.curveRadius;
                h.x2 = v2.x1 - this.curveRadius;
            }
        }
    
        //third pass tansforming type 3 connections to type 1 when possibli
        for (let i = 0; i < this.connections.length; i++) {
            const c = this.connections[i];

            

            if (c.type === 3) {
                const h = c.links[1];
                //console.log(`Coordinates before transformation: v1 (${c.v1.x1}, ${c.v1.y1}), v2 (${c.v2.x1}, ${c.v2.y2}), h (${h.x1}, ${h.x2})`);
                const y1 = (c.v1.y1 + c.v1.y2) / 2;
                const y2 = (c.v2.y1 + c.v2.y2) / 2;
                const x11 = h.x1 - this.curveRadius;
                const x12 = h.x2 + this.curveRadius;
                const y111 = c.v1.y1;
                const y112 = c.v1.y2;
                const y121 = c.v2.y1;
                const y122 = c.v2.y2;

                let olV1 = false;
                let olV2 = false;

                //console.log(`final coordinates: v1 (${c.v1.x1}, ${c.v1.y1}), v2 (${c.v2.x1}, ${c.v2.y2})`);

                //check for overlap with vertices
                for (let j = 0; j < this.vertices.length; j++) {
                    const v = this.vertices[j];
                    const x21 = v.x1, x22 = v.x2;
                    const y21 = v.y1, y22 = v.y2;

                    if (this.overlap(x11, x12, x21, x22, y111, y112, y21, y22)) {
                        olV1 = true;
                        break;
                    }

                    //Additional overlap check, in and out... 
                    if (this.overlap(c.v2.x1 - 2 * this.curveRadius, c.v2.x1, x21, x22, Math.min(y1, y2), Math.max(y1, y2), y21, y22)) {
                        // olV1 = true;
                        // break;
                    }
                }

                //check for overlap with horizontal snippets
                for (let j = 0; j < horizontalSnippets.length; j++) {
                    const hSnippet = horizontalSnippets[j];
                    if (c.v1 === hSnippet.v1 || c.v2 === hSnippet.v2) {
                        continue;
                    }

                    if (this.overlap(x11, x12, hSnippet.x1, hSnippet.x2, y111, y112, hSnippet.y1, hSnippet.y2)) {
                        olV1 = true;
                        break;
                    }
                }

                //Check for overlap with verticals
                for (let j = 0; j < this.verticals.length; j++) {
                    const vert = this.verticals[j];
                    if (c.v2 === vert.v2) {
                        continue;
                    }

                    if (this.overlap(c.links[2].x1, c.links[2].x1, vert.x1 - this.config.options.edgeGap, vert.x2 + this.config.options.edgeGap, Math.min(y1, y2), Math.max(y1, y2), Math.min(vert.y1, vert.y2), Math.max(vert.y1, vert.y2))) {
                        olV1 = true;
                        break;
                    }
                }

                //Check for overlap with vertices again, now for the second vertex of the connection
                for (let j = 0; j < this.vertices.length; j++) {
                    const v = this.vertices[j];
                    const x21 = v.x1, x22 = v.x2;
                    const y21 = v.y1, y22 = v.y2;

                    if (this.overlap(x11, x12, x21, x22, y121, y122, y21, y22)) {
                        olV2 = true;
                        break;
                    }

                    //additional overlap check, previously commented out - important for results comparative to original
                    if (this.overlap(c.v1.x2, c.v1.x2 + 2 * this.curveRadius, x21, x22, Math.min(y1, y2), Math.max(y1, y2), y21, y22)) {
                        olV2 = true;
                        break;
                    }
                }

                //check for overlap with horizontal snippets for the second vertex of the connection
                for (let j = 0; j < horizontalSnippets.length; j++) {
                    const hSnippet = horizontalSnippets[j];
                    if (c.v1 === hSnippet.v1 || c.v2 === hSnippet.v2) {
                        continue;
                    }

                    if (this.overlap(x11, x12, hSnippet.x1, hSnippet.x2, y121, y122, hSnippet.y1, hSnippet.y2)) {
                        olV2 = true;
                        break;
                    }
                }

                //check for overlap with verticals again for the first vertex of the connection
                for (let j = 0; j < this.verticals.length; j++) {
                    const vert = this.verticals[j];
                    if (c.v1 === vert.v1) {
                        continue;
                    }

                    if (this.overlap(c.links[0].x1, c.links[0].x1, vert.x1 - this.config.options.edgeGap, vert.x2 + this.config.options.edgeGap, Math.min(y1, y2), Math.max(y1, y2), Math.min(vert.y1, vert.y2), Math.max(vert.y1, vert.y2))) {
                        olV2 = true;
                        break;
                    }
                }

                //determine whether to draw vertical connection for v1 or  for v2
                let draw1 = false, draw2 = false;

                if (olV1 && !olV2) {
                    draw1 = true;
                } else if (!olV1 && olV2) {
                    draw2 = true;
                } else if (!olV1 && !olV2 && c.links[0].gc > c.links[2].gc) {
                    draw1 = true;
                } else if (!olV1 && !olV2 && c.links[0].gc < c.links[2].gc) {
                    draw2 = true;
                } else if (!olV1 && !olV2 && Math.abs(c.v1.originLayer) < Math.abs(c.v2.originLayer)) {
                    draw1 = true;
                } else if (!olV1 && !olV2 && Math.abs(c.v1.originLayer) >= Math.abs(c.v2.originLayer)) {
                    draw2 = true;
                }

                //now change the ransform edge type based on overlap checks
                if (draw1) {
                    c.type = 1;
                    this.removeVertical(c.links[2]);
                    const vc = c.links[0];
                    vc.type = "source";
                    const medl = (vc.v1.layer + vc.v2.layer) / 2;
                    if (vc.v1.layer < medl) {
                        vc.y1 = y1 + this.curveRadius;
                        vc.y2 = y2 - this.curveRadius;
                    } else {
                        vc.y1 = y1 - this.curveRadius;
                        vc.y2 = y2 + this.curveRadius;
                    }
                    c.links = [vc];
                    horizontalSnippets.push({
                        x1: x11 - this.curveRadius,
                        x2: x12 + this.curveRadius,
                        y1: y121 - this.curveRadius,
                        y2: y122 + this.curveRadius,
                        v1: c.v1,
                        v2: c.v2
                    });
                }

                if (draw2) {
                    c.type = 1;
                    this.removeVertical(c.links[0]);
                    const vc = c.links[2];
                    vc.type = "sink";
                    const medl = (vc.v1.layer + vc.v2.layer) / 2;
                    if (vc.v1.layer < medl) {
                        vc.y1 = y1 + this.curveRadius;
                        vc.y2 = y2 - this.curveRadius;
                    } else {
                        vc.y1 = y1 - this.curveRadius;
                        vc.y2 = y2 + this.curveRadius;
                    }
                    c.links = [vc];
                    horizontalSnippets.push({
                        x1: x11 - this.curveRadius,
                        x2: x12 + this.curveRadius,
                        y1: y112 - this.curveRadius,
                        y2: y112 + this.curveRadius,
                        v1: c.v1,
                        v2: c.v2
                    });
                }
            }
        }
    }


 
    /**
     * Adjusts the horizontal connections for the graph based on the current positions of vertices.
     * Connections are positioned, paths are grouped, the groups are sorted, and are placed to avoid overlap.
     */
    adjustHorizontalConnections() {

        //iterate over horizontal slots to position connections
        this.horizontalSlots.forEach(slot => {
            const paths = slot.paths;

            this.positionConnections(paths, slot);

            paths.sort(this.orderPaths);

            let groups = this.groupPaths(paths);

            groups.sort(this.sortGroups);

            let placedGroups = [];
            this.placeGroups(groups, placedGroups);
        });
    }

    /**
     * Positioning horizontal connection within the slot.
     * utilized in adjustHorizontalConnections Method - could be moved to a utility function?
     * @param {Array} paths - Paths to be positioned.
     * @param {Object} slot - the slot in which paths are positioned.
     */
    positionConnections(paths, slot) {
        paths.forEach(hc => {
            const x1 = hc.v1.x2;
            const x2 = hc.v2.x1;
            const y = slot.yMax - 2;
            hc.position(x1 + 2 * this.curveRadius, x2 - 2 * this.curveRadius, y);
        });
    }

    /**
     * Orders paths based on type and coordinates.
     * @param {Object} p1 - First path.
     * @param {Object} p2 - Second path.
     * @returns {number} - Sorting order.
     */
    orderPaths(p1, p2) {
        if (p1.type === 0 && p2.type === 0) {
            return (p1.x2 - p1.x1 < p2.x2 - p2.x1) ? -1 : 1;
        }

        if (p1.type === 0) {
            return -1;
        }

        if (p2.type === 0) {
            return 1;
        }

        if (p1.x2 === p2.x2) {
            return (p1.x1 < p2.x1) ? -1 : 1;
        }

        return (p1.x2 < p2.x2) ? -1 : 1;
    }

    /**
     * Groups paths based on their sources and sinks.
     * @param {Array} paths - Paths to be grouped.
     * @returns {Array} - Grouped paths.
     */
    groupPaths(paths) {
        let groups = [];
        paths.forEach(path => {
            let sourceFound = false;
            let sinkFound = false;

            groups.forEach(group => {
                if (group.source === path.v1) {
                    sourceFound = true;
                    group.paths.push(path);
                    group.x1 = Math.min(group.x1, path.x1);
                    group.x2 = Math.max(group.x2, path.x2);
                }

                if (group.sink === path.v2) {
                    sinkFound = true;
                    group.paths.push(path);
                    group.x1 = Math.min(group.x1, path.x1);
                    group.x2 = Math.max(group.x2, path.x2);
                }
            });

            if (!sourceFound) {
                groups.push({
                    source: path.v1,
                    paths: [path],
                    x1: path.x1,
                    x2: path.x2,
                    y: path.y1
                });
            }

            if (!sinkFound) {
                groups.push({
                    sink: path.v2,
                    paths: [path],
                    x1: path.x1,
                    x2: path.x2,
                    y: path.y1
                });
            }
        });

        return groups;
    }

    /**
     * Sort groups by the number of paths they contain.
     * @param {Object} g1 - First group.
     * @param {Object} g2 - Second group.
     * @returns {number} - Sorting order.
     */
    sortGroups(g1, g2) {
        return g1.paths.length > g2.paths.length ? 1 : -1;
    }

    /**
     * Places groups to avoid overlaps.
     * @param {Array} groups - Groups to be placed.
     * @param {Array} placedGroups - Groups that have already been placed.
     */
    placeGroups(groups, placedGroups) {
        for (let j = groups.length; j > 0; j--) {
            let g1 = groups[j - 1];
            let ng1 = g1.paths.filter(path => !path.placed);

            if (ng1.length < g1.paths.length) {
                g1.paths = ng1;
                groups.sort(this.sortGroups);
                j = groups.length + 1;
                continue;
            }

            this.adjustGroupPosition(g1, placedGroups);

            g1.paths.forEach(path => {
                path.placed = true;
                path.y1 = g1.y;
                path.y2 = g1.y;
            });

            placedGroups.push(g1);
            groups.pop();
        }
    }

    /**
     * Adjusting position of group to avoid overlaps with groups that have already been placed.
     * @param {Object} g1 - Group to be placed.
     * @param {Array} placedGroups - Groups that have already been placed.
     */
    adjustGroupPosition(g1, placedGroups) {
        let overlap;
        do {
            overlap = false;
            placedGroups.forEach(g2 => {
                if (g1.y === g2.y && !(g1.x1 - this.curveRadius > g2.x2 || g2.x1 - this.curveRadius > g1.x2)) {
                    overlap = true;
                    g1.y -= this.config.options.edgeGap;
                }
            });
        } while (overlap);
    }


   /**
     * Displays line numbering when line breaks are used.
     * @param {number} width - The width of the line numbering.
     * @param {number} gap - The gap between the lines.
     */
    insertLineNumbering(width, gap) {

        let line = 1;
        const x1 = this.curveRadius;
        const x2 = width - this.curveRadius;

        let y = this.layers[0].yLevel - this.layers[0].height / 2 + 0.5 - Math.floor(gap / 2) - 26;

        //create the first line and text
        this.svg.append('path')
            .attr('d', `M ${+x1} ${+y} L ${+x2} ${+y}`)
            .attr('stroke', this.config.options.baseColor)
            .attr('stroke-width', 1)
            .attr('stroke-linecap', 'round')
            .attr('opacity', 1.0);

        this.svg.append('text')
            .attr('x', x1 + 7)
            .attr('y', y + 14)
            .attr('font-family', this.config.options.font)
            .attr('font-size', '14px')
            .attr('fill', this.config.options.baseColor)
            .attr('text-anchor', 'start')
            .attr('cursor', 'default')
            .text(`${this.config.options.lineNumberingText} ${line}`);

        line++;

        //lines and text for each layer that has a different level than the next one
        for (let i = 0; i < this.layers.length - 1; i++) {
            if (this.layers[i].level !== this.layers[i + 1].level) {
                y = this.layers[i].yLevel + this.layers[i].height / 2 + 0.5 + Math.floor(gap / 2);

                this.svg.append('path')
                    .attr('d', `M ${+x1} ${+y} L ${+x2} ${+y}`)
                    .attr('stroke', this.config.options.baseColor)
                    .attr('stroke-width', 1)
                    .attr('stroke-linecap', 'round')
                    .attr('opacity', 1.0);

                this.svg.append('text')
                    .attr('x', x1 + 7)
                    .attr('y', y + 14)
                    .attr('font-family', this.config.options.font)
                    .attr('font-size', '14px')
                    .attr('fill', this.config.options.baseColor)
                    .attr('text-anchor', 'start')
                    .attr('cursor', 'default')
                    .text(`${this.config.options.lineNumberingText} ${line}`);

                line++;
            }
        }

        //final line and text
        y = this.layers[this.layers.length - 1].yLevel + this.layers[this.layers.length - 1].height / 2 + 0.5 + Math.floor(gap / 2);

        this.svg.append('path')
            .attr('d', `M ${x1} ${y} L ${x2} ${y}`)
            .attr('stroke', this.config.options.baseColor)
            .attr('stroke-width', 1)
            .attr('stroke-linecap', 'round')
            .attr('opacity', 1.0);

        this.svg.append('text')
            .attr('x', x1 + 7)
            .attr('y', y + 14)
            .attr('font-family', this.config.options.font)
            .attr('font-size', '14px')
            .attr('fill', this.config.options.baseColor)
            .attr('text-anchor', 'start')
            .attr('cursor', 'default')
            .text(`${this.config.options.lineNumberingText} ${line}`);
    }

    /**
     * Computes the path of the given connection with the given vertical shifts s1 at the source vertex and s2 at the sink vertex. CPMMENTED WITH EXTENSIVE HELP FROM CHATGPT
     * @param {Object} connection - The connection object containing vertices and links.
     * @param {number} s1 - Vertical shift at the source vertex.
     * @param {number} s2 - Vertical shift at the sink vertex.
     * @returns {string} - The SVG path string.
     */
    generatePath(connection, s1, s2) {


        // Helper function to create a cubic Bezier curve segment in the SVG path
        const bezier = (x1, y1, xb, yb, x2, y2) => `C ${x1} ${y1} ${xb} ${yb} ${x2} ${y2} `;

        // Helper function to create a straight line segment in the SVG path
        const line = (x1, y1, x2, y2) => `L ${x1} ${y1} ${x2} ${y2} `;

        // Initialize the path string with the move-to command
        const c = connection;
        const x1 = c.v1.x2;
        const x2 = c.v2.x1;
        const y1 = (c.v1.y1 + c.v1.y2) / 2 + s1;
        const y2 = (c.v2.y1 + c.v2.y2) / 2 + s2;
        let path = `M ${x1} ${y1} `;

        // Handle simple Bezier curve for connection type -1 (default type)
        if (c.type === -1) {
            const xm = (x2 + x1) / 2; // Midpoint for the curve
            const ym = (y2 + y1) / 2; // Midpoint for the curve
            path += bezier(x1, y1, xm, y1, xm, ym);
            path += bezier(xm, ym, xm, y2, x2, y2);
        } 
        // Handle complex paths for connection types 0 and 3
        else if (c.type === 0 || c.type === 3) {
            const v1 = c.links[0];
            const h = c.links[1];
            const v2 = c.links[2];

            let v1x1 = v1.x1, v1x2 = v1.x2, v1y1 = v1.y1 + s1, v1y2 = v1.y2;
            const hx1 = h.x1, hx2 = h.x2, hy1 = h.y1, hy2 = h.y2;
            let v2x1 = v2.x1, v2x2 = v2.x2, v2y1 = v2.y1, v2y2 = v2.y2 + s2;
            let cr1 = this.curveRadius, cr2 = this.curveRadius;

            // Adjust curve radius based on the vertical distance between points
            if (Math.abs(hy1 - y1) < 2 * this.curveRadius) {
                cr1 = Math.abs(hy1 - y1) / 2;
                const y = (hy1 + y1) / 2;
                v1y1 = y;
                v1y2 = y;
            }

            if (Math.abs(hy1 - y2) < 2 * this.curveRadius) {
                cr2 = Math.abs(hy1 - y2) / 2;
                const y = (hy1 + y2) / 2;
                v2y1 = y;
                v2y2 = y;
            }

            // Adjust curve direction if the right-to-left option is enabled
            if (this.config.options.rtl) {
                cr1 *= -1;
                cr2 *= -1;
            }

            // Construct the complex path step by step
            path += line(x1, y1, v1x1 - cr1, y1);
            path += bezier(v1x1 - cr1, y1, v1x1, y1, v1x1, v1y1);
            path += line(v1x1, v1y1, v1x2, v1y2);
            path += bezier(v1x2, v1y2, v1x2, hy1, hx1, hy1);
            path += line(hx1, hy1, hx2, hy2);
            path += bezier(hx2, hy2, v2x1, hy2, v2x1, v2y1);
            path += line(v2x1, v2y1, v2x2, v2y2);
            path += bezier(v2x2, v2y2, v2x2, y2, v2x2 + cr2, y2);
            path += line(v2x2 + cr2, y2, x2, y2);
        } 
        // Handle connection type 1 with simpler connections
        else if (c.type === 1) {
            const cr = this.config.options.rtl ? -this.curveRadius : this.curveRadius;
            const link = c.links[0];
            path += line(x1, y1, link.x1 - cr, y1);
            path += bezier(link.x1 - cr, y1, link.x1, y1, link.x1, link.y1 + s1);
            path += line(link.x1, link.y1 + s1, link.x2, link.y2 + s2);
            path += bezier(link.x2, link.y2 + s2, link.x2, y2, link.x2 + cr, y2);
            path += line(link.x2 + cr, y2, x2, y2);
        }

        // Return the constructed SVG path string
        return path;
    }


    /**
     * Getter for specified connection between v1 and v2.
     * @param {Object} v1 - The first vertex.
     * @param {Object} v2 - The second vertex.
     * @returns {Object|boolean} - The connection object if found, otherwise false.
     */
    getConnection(v1, v2) {

        for (const connection of this.connections) {
            if (connection.v1 === v1 && connection.v2 === v2) {
                return connection;
            }
        }
        return false;
    }

    /**
     * NOTE: for visual display
     * Displays all paths that run through the given vertex.
     * @param {HTMLElement} node - The DOM element associated with the vertex.
     * @param {Object} vertex - The vertex for which to display connections.
     */
    displayVertexConnections(node, vertex, svg) {
    // console.log('displayVertexConnections: Starting for node and vertex', node, vertex);
  
    
        //Reset this.vertexConnections
        this.vertexConnections = [];
    
        //reset ins and outs for all vertices
        this.vertices.forEach(v => {
            v.ins = [];
            v.outs = [];
            // console.log('this.vertices in dvc: ', this.vertices);
        });
    
        //Populate ins and outs based on sentence paths
        this.sentencePaths.forEach((p, i) => {
            p.forEach((v, j) => {
                if (v === vertex) {
                    for (let k = 0; k < p.length; k++) {
                        if (k > 0) {
                            p[k].ins.push({ v: p[k - 1], id: i });
                        }
                        if (k < p.length - 1) {
                            p[k].outs.push({ v: p[k + 1], id: i });
                        }
                    }
                }
            });
        });
    
        //soring ins and outs for each vertex (an)
        this.vertices.forEach(v => {
            const yv = (v.y1 + v.y2) / 2;
    
            if (v.token === "" && (v.ins.length <= 1 || v.outs.length <= 1)) {
                v.ins = [{}];
                v.outs = [{}];
            }
    
            v.ins.sort((t1, t2) => {
                const y1 = (t1.v.y1 + t1.v.y2) / 2;
                const y2 = (t2.v.y1 + t2.v.y2) / 2;
                if (t1.v === t2.v && t1.id > t2.id) {
                    return 1;
                } else if (t1.v !== t2.v && y1 === y2 && t1.v.x2 > t2.v.x2) {
                    return 1;
                } else if (t1.v !== t2.v && y1 > y2) {
                    return 1;
                }
                return -1;
            });
    
            v.outs.sort((t1, t2) => {
                const y1 = (t1.v.y1 + t1.v.y2) / 2;
                const y2 = (t2.v.y1 + t2.v.y2) / 2;
                if (t1.v === t2.v && t1.id > t2.id) {
                    return 1;
                } else if (t1.v !== t2.v && y1 === y2 && t1.v.x2 < t2.v.x2) {
                    return 1;
                } else if (t1.v !== t2.v && y1 > y2) {
                    return 1;
                }
                return -1;
            });
        });
    
        //compute shifts for paths
        const getShift = (id, array) => {
            if (array.length === 1) {
                return 0;
            }
            for (let i = 0; i < array.length; i++) {
                if (array[i].id === id) {
                    return i * 3 - (array.length * 3) / 2;
                }
            }
        };
    
        const getShiftHeight = (id, array, height) => {
            if (array.length === 1) {
                return 0;
            }
            for (let i = 0; i < array.length; i++) {
                if (array[i].id === id) {
                    return ((i * 3 - (array.length * 3) / 2) / (array.length * 2)) * (height / 2);
                }
            }
        };
    
        //create paths for the vertex
        this.sentencePaths.forEach((p, i) => {
            for (let j = 1; j < p.length; j++) {
                if (p[j] === vertex) {
                    let path = "";
                    for (let k = 1; k < p.length; k++) {
                        const c = this.getConnection(p[k - 1], p[k]);
                        if (c) {
                            if (this.config.options.interpolateFontSize) {
                                path += this.generatePath(c, getShiftHeight(i, p[k - 1].outs, p[k - 1].boxHeight), getShiftHeight(i, p[k].ins, p[k].boxHeight));
                            } else {
                                path += this.generatePath(c, getShift(i, p[k - 1].outs), getShift(i, p[k].ins));
                            }
                        }
                    }
    
                    //console.log('created path:', path);

                    // Create the SVG path and then push it to this.vertexConnections (pvis)
                    const pvis = svg.append("path")  // Use the svg passed as a parameter, and assign to pvis
                        .attr("d", path)
                        .attr("stroke", this.colorMap[this.editions[i]])
                        .attr("stroke-width", 3)
                        .attr("stroke-linecap", "round")
                        .attr("opacity", 0.8)
                        .attr("class", `edition${i}-edgestyle`);

                    this.vertexConnections.push(pvis);

                   
                    //console.log('current this.vertexConnections:', this.vertexConnections);

                    break;
                }
            }
        });
    
        //adjust the display order of vertices
        this.vertices.forEach(v => {
            if (v === this.startVertex || v === this.endVertex || v.token === '') {
                return;
            }
    
            if (this.config.options.vertexBackground) {
                d3.select(v.rect).raise();
            }
    
            if (v.count > this.config.options.collapseLabels) {
                d3.select(v.textNode).raise();
            }
        });
    
        //console.log('displayVertexConnections - finished for vertex: ', vertex);
    }
    
    

    /**
     * Displays all connections and, in case of majority=true, all majority edges are bundled.
     * @param {boolean} majority - If true, bundle majority edges.
     */
    majorityConnections(majority) {

        let edges = [];

        //1: create edges with the initial weights and ids
        this.vertices.forEach((vertex, vIndex) => {
            //console.log(`MC: Processing vertex ${vIndex}:`, vertex);
            vertex.successors.forEach((successor, sIndex) => {
                const tailVertex = this.graph.getVertex(successor);
                edges.push({
                    head: vertex,
                    tail: tailVertex,
                    weight: 0,
                    ids: []
                });
                //console.log(`MC: Added edge from vertex ${vIndex} to successor ${sIndex}:`, tailVertex);
            });
        });

        //console.log('MC: first edges created:', edges);

        //2: define a function to increase edge weights - internal fucntion in method
        const weightEdge = (v1, v2, id) => {
            edges.forEach(edge => {
                if (edge.head === v1 && edge.tail === v2) {
                    edge.weight++;
                    edge.ids.push(id);
                    //console.log(`MC - weight adjusted for edge from ${v1.token} to ${v2.token}, weight:`, edge.weight);
                }
            });
        };

        //3: Increase weights for all sentence paths
        this.sentencePaths.forEach((path, pathIndex) => {
            //console.log(`MC: processing sentenceP ${pathIndex}:`, path);
            weightEdge(this.startVertex, path[0], pathIndex);
            weightEdge(path[path.length - 1], this.endVertex, pathIndex);
            for (let j = 0; j < path.length - 1; j++) {
                weightEdge(path[j], path[j + 1], pathIndex);
            }
        });

        //console.log('MC edges after weight computations:', edges);

        //4: reset ins and outs for all vertices
        this.vertices.forEach((vertex, vIndex) => {
            vertex.ins = [];
            vertex.outs = [];
            //console.log(`MC: Reset ins and outs for vertex ${vIndex}:`, vertex);
        });

        //5: populate ins and outs by edge weights and majority config - if majuoriy edge bundels
        edges.forEach((edge, eIndex) => {
           
            if (majority && edge.weight > this.sentencePaths.length * this.config.options.majorityPercentage) {
                edge.head.outs.push({ v: edge.tail, id: -1 });
                edge.tail.ins.push({ v: edge.head, id: -1 });
                
            } else {
                edge.ids.forEach(id => {
                    edge.head.outs.push({ v: edge.tail, id });
                    edge.tail.ins.push({ v: edge.head, id });
                    
                });
            }
        });

        //6: Sort ins and outs for each vertex
        const sortConnections = (connections) => {
            connections.sort((t1, t2) => {
                const y1 = (t1.v.y1 + t1.v.y2) / 2;
                const y2 = (t2.v.y1 + t2.v.y2) / 2;
                if (t1.v === t2.v && t1.id > t2.id) {
                    return 1;
                } else if (t1.v !== t2.v && y1 === y2 && t1.v.x2 > t2.v.x2) {
                    return 1;
                } else if (t1.v !== t2.v && y1 > y2) {
                    return 1;
                }
                return -1;
            });
        };

        this.vertices.forEach((vertex, vIndex) => {
            if (vertex.token === "" && (vertex.ins.length <= 1 || vertex.outs.length <= 1)) {
                vertex.ins = [{}];
                vertex.outs = [{}];
                
            }
            sortConnections(vertex.ins);
            sortConnections(vertex.outs);
            //console.log(`MC: Sorted ins and outs for vertex ${vIndex}.`);
        });

        //7: define helper functions for calculating shifts
        const getShift = (id, array) => {
            if (array.length === 1) {
                return 0;
            }
            for (let i = 0; i < array.length; i++) {
                if (array[i].id === id) {
                    return i * 3 - (array.length * 3) / 2;
                }
            }
        };

        const getShiftHeight = (id, array, height) => {
            if (array.length === 1) {
                return 0;
            }
            for (let i = 0; i < array.length; i++) {
                if (array[i].id === id) {
                    return ((i * 3 - (array.length * 3) / 2) / (array.length * 2)) * (height / 2);
                }
            }
        };

        //8: create and style paths for each edge
        const svg = this.svg; 

        edges.forEach((edge, eIndex) => {
            const connection = this.getConnection(edge.head, edge.tail);
            if (!connection) {
                //console.log(`MC: No connection found for edge ${eIndex}, returning`);
                return;
            }

            let path;
            if (majority && edge.weight > this.sentencePaths.length * this.config.options.majorityPercentage) {
                if (this.config.options.interpolateFontSize) {
                    path = this.generatePath(connection, getShiftHeight(-1, edge.head.outs, edge.head.boxHeight), getShiftHeight(-1, edge.tail.ins, edge.tail.boxHeight));
                } else {
                    path = this.generatePath(connection, getShift(-1, edge.head.outs), getShift(-1, edge.tail.ins));
                }
                const pvis = svg.append("path")
                    .attr("d", path)
                    .attr("stroke", this.config.options.baseColor)
                    .attr("stroke-width", 5)
                    .attr("stroke-linecap", "round")
                    .attr("opacity", 0.8)
                    .attr("class", "majority-edgestyle");
                //console.log(`MC - Majority path created for edge ${eIndex}, path:`, path);

                this.addEdgeToGroup(edge.head, edge.tail, pvis, edge.ids);
                this.basicConnections.push(pvis);
            } else {
                edge.ids.forEach(id => {
                    if (this.config.options.interpolateFontSize) {
                        path = this.generatePath(connection, getShiftHeight(id, edge.head.outs, edge.head.boxHeight), getShiftHeight(id, edge.tail.ins, edge.tail.boxHeight));
                    } else {
                        path = this.generatePath(connection, getShift(id, edge.head.outs), getShift(id, edge.tail.ins));
                    }
                    const pvis = svg.append("path")
                        .attr("d", path)
                        .attr("stroke", this.colorMap[this.editions[id]])
                        .attr("stroke-width", 3)
                        .attr("stroke-linecap", "round")
                        .attr("opacity", 0.8)
                        .attr("class", `edition${id}-edgestyle`);
                    //console.log(`MC - path created for edge ${eIndex} and edition ${id}, path:`, path);

                    this.addEdgeToGroup(edge.head, edge.tail, pvis, [id]);
                    this.basicConnections.push(pvis);
                });
            }
        });

        //9: Adjust vertex elements display order
        this.vertices.forEach((vertex, vIndex) => {
            if (vertex === this.startVertex || vertex === this.endVertex || vertex.token === '') {
                return;
            }

            if (this.config.options.vertexBackground) {
                d3.select(vertex.rect).raise();
                //console.log(`MC - vertex rect raised to front for vertex ${vIndex}`);
            }

            if (vertex.count > this.config.options.collapseLabels) {
                d3.select(vertex.textNode).raise();
                //console.log(`MC - vertex text  raised to front for vertex ${vIndex}`);
            }
        });

        //console.log('MC - Completed majorityConnections');
    }

    /**
     * Aligns all vertices horizontally, so that all overlaps are removed and a minimum gap between adjacent vertices is given.
     */
    setXFlow() {
    
        const gap = 4 * this.curveRadius;
        let edges = [];
    
        // 1: Initialize edges from the start vertex
        this.startVertex.successors.forEach(successor => {
            edges.push({
                head: this.startVertex,
                tail: this.graph.getVertex(successor)
            });
        });
    
        const widthS = this.startVertex.boxWidth;
        //console.log('setX: widthS: ', this.startVertex.boxWidth)
        this.startVertex.x1 = gap;
        this.startVertex.x2 = gap + widthS;
    
        //console.log('setX - what is startVertex:', { x1: this.startVertex.x1, x2: this.startVertex.x2 });
    
        //2: spread out in horizontal positions
        while (edges.length > 0) {
            let newEdges = [];
            edges.forEach(e => {
                const g = gap;
                if (e.tail.x1 < e.head.x2 + g) {
                    e.tail.x1 = e.head.x2 + g;
                    e.tail.x2 = e.head.x2 + g + e.tail.boxWidth;
                    //console.log('setX - give me adjusted tail:', { tail: e.tail, x1: e.tail.x1, x2: e.tail.x2 });
                    e.tail.successors.forEach(successor => {
                        newEdges.push({
                            head: e.tail,
                            tail: this.graph.getVertex(successor)
                        });
                    });
                }
            });
            edges = newEdges;
        }
    
        //3: adjust positions to remove overlaps
        let largestMove = 3;
        while (largestMove > 2) {
            largestMove = 0;
            this.vertices.forEach(v => {
                if (v === this.startVertex || v === this.endVertex) {
                    return;
                }
                const xOld = Math.floor((v.x2 + v.x1) / 2);
                const w = v.boxWidth;
                let xLeft, xRight;
    
                v.predecessors.forEach(pred => {
                    const vp = this.graph.getVertex(pred);
                    const xp = vp.x2;
                    if (vp === this.startVertex && !this.config.options.startAndEnd) {
                        xLeft = Math.floor(v.x1 - gap);
                    }
                    if (xLeft === undefined || xp > xLeft) {
                        xLeft = xp;
                    }
                });
    
                v.successors.forEach(succ => {
                    const vs = this.graph.getVertex(succ);
                    const xs = vs.x1;
                    if (vs === this.endVertex && !this.config.options.startAndEnd) {
                        xRight = Math.floor(v.x2 + gap);
                    }
                    if (xRight === undefined || xs < xRight) {
                        xRight = xs;
                    }
                });
    
                const xNew = Math.floor((xLeft + xRight) / 2);
                //console.log('setX the vertex being adjusted:', { vertex: v, xOld: xOld, xNew: xNew });
                if (!isNaN(xNew) && xNew !== xOld) {
                    v.x1 = xNew - w / 2;
                    v.x2 = v.x1 + w;
                    //console.log('setX the vertex adjusted to', { vertex: v, x1: v.x1, x2: v.x2 });
                    if (largestMove < Math.abs(xNew - xOld)) {
                        largestMove = Math.abs(xNew - xOld);
                    }
                }
            });
        }
        //console.log('setX  final positions of vertices:', this.vertices);
    }
    
    /**
     * Tests if the given bounds overlap each other.
     * @param {number} x1Min - Minimum x-coordinate of the first bound.
     * @param {number} x1Max - Maximum x-coordinate of the first bound.
     * @param {number} x2Min - Minimum x-coordinate of the second bound.
     * @param {number} x2Max - Maximum x-coordinate of the second bound.
     * @param {number} y1Min - Minimum y-coordinate of the first bound.
     * @param {number} y1Max - Maximum y-coordinate of the first bound.
     * @param {number} y2Min - Minimum y-coordinate of the second bound.
     * @param {number} y2Max - Maximum y-coordinate of the second bound.
     * @returns {boolean} - Returns true if the bounds overlap, otherwise false.
     */
    overlap(x1Min, x1Max, x2Min, x2Max, y1Min, y1Max, y2Min, y2Max) {
        //Check for overlap
        if (x1Min >= x2Max || x1Max <= x2Min || y1Min >= y2Max || y1Max <= y2Min) {
            return false;
        }
        return true;
    }
    
    /**
     * Getter for the layer with the given index.
     * @param {number} index - The index of the layer to retrieve.
     * @returns {Object|boolean} - Returns the layer object if found, else returns false.
     */
    getLayer(index) {
        // console.log('Searching for layer with index:', index);
        // console.log('Current layers:', this.layers);
    
        //Find and return the layer with the index paramter
        for (const layer of this.layers) {
            if (layer.index === index) {
                //console.log('Layer found:', layer); //note: this is an object 
                return layer; //returns object!
            }
        }
        
        //console.log('Layer not found for index:', index);
        return false;
    }
    

    /**
     * Getter for the array index of the layer with the given index.
     * @param {number} index - The index of the layer to retrieve.
     * @returns {number|boolean} - Returns the array index if found, otherwise false.
     */
    getLayerIndex(index) {
        // Find and return the array index of the layer with the index parameter
        for (let i = 0; i < this.layers.length; i++) {
            if (this.layers[i].index === index) {
                return i; //returns index
            }
        }
        return false;
    }


    /**
     * Computes all connections dependent on the current vertex positions.
     */
    setConnections() {
        //console.log('setC - before prepareConnections');
        this.prepareConnections();
        //console.log('setC - after prepareConnections');
        let y = 1000;

        //Iterate over layers to set up horizontal slots and vertices positions
        this.layers.forEach((layer, i) => {
            
            this.horizontalSlots[i].yMin = y + this.curveRadius;
            this.horizontalSlots[i].yMax = y - this.curveRadius + this.horizontalSlots[i].height;

            y += layer.height / 2 + this.horizontalSlots[i].height;
            layer.yLevel = y;

            //console.log(`setC: Updated y to ${y}`);

            layer.vertices.forEach(vertex => {
                //console.log(`setC: Processing vertex`, vertex);
                //console.log(`setC processing vertex ${vertex.token} in layer ${i}`, vertex);
                const heightN = vertex.boxHeight;
                //console.log(`setC heightN for vertex ${vertex.token}: ${heightN}`);
                vertex.y1 = y - heightN / 2;
                vertex.y2 = y + heightN / 2;
                //console.log(`setC updated vertex y1 to ${vertex.y1}, y2 to ${vertex.y2}`);
                //console.log(`setC updated vertex ${vertex.token} y1 to ${vertex.y1}, y2 to ${vertex.y2}`);
            });

            y += layer.height / 2;
            //console.log(`setC - finished processing layer ${i}`);
        });

        this.adjustHorizontalConnections();

        this.adjustVerticalConnections();
        
    }


    /**
     * In case of line breaks, dummies are inserted at the end and the start of a line to help connect vertices across lines
     */
    insertDummys() {
    
        const gap = 3 * this.curveRadius;
        const width = document.getElementById(this.div).offsetWidth;
    
        //sort vertices by x-coordinate

        this.vertices.sort((v1, v2) => v1.x1 < v2.x1 ? -1 : 1);
    
        //adjust x-coordinates for all vertices
        const initialShift = this.vertices[0].x1 - gap;
        this.vertices.forEach((vertex, index) => {

            vertex.x1 -= initialShift;
            vertex.x2 -= initialShift;
            vertex.x1Temp = vertex.x1;
            vertex.x2Temp = vertex.x2;

        });
    
        let verticesToCheck = [...this.vertices];
        let level = 0;
    
        //Process vertices to handle line break
        while (verticesToCheck.length > 0) {
            const newVerticesToCheck = [];
            let shift = 0;
            let tshift = 0;
    
            verticesToCheck.forEach((vertex, index) => {
                if (vertex.x2Temp + 2 * gap > width) {
                    
                    if (shift === 0) {
                        shift = 3 * gap - vertex.x1Temp;
                        vertex.x2Temp = vertex.x2Temp - vertex.x1Temp + 3 * gap;
                        vertex.x1Temp = 3 * gap;
                        tshift = (level + 1) * width - vertex.x1 + 3 * gap;
                    } else {
                        vertex.x1Temp += shift;
                        vertex.x2Temp += shift;
                    }
                    vertex.x1 += tshift;
                    vertex.x2 += tshift;
                    newVerticesToCheck.push(vertex);
                    
                } else {
                    vertex.level = level;
                    
                }
            });
    
            verticesToCheck = newVerticesToCheck;
            level++;
        }
    
        const dummys = {};
        const edges = [];
    
        // gathering edges from vertices
        this.vertices.forEach((vertex, vIndex) => {
            vertex.successors.forEach(successor => {
                edges.push({
                    head: vertex,
                    tail: this.graph.getVertex(successor)
                });
            });
            //console.log(`ID - gathered edges for vertex ${vIndex}, total edges: ${edges.length}`);
        });
    
        const paths = [];
    
        //now mange those edges and insert dummy vertices if needed
        edges.forEach((edge, eIndex) => {
            if (edge.tail.level !== edge.head.level) {
               
                let dvh, dvt;
                if (typeof dummys[edge.tail.index + ''] === 'undefined') {
                    dvh = new MTRAVizVertex(this.graph, this.config.getVertexIndex(), '');
                    dvh.dummy = true;
                    dvh.predecessors = [edge.head.index];
                    console.log(`MainiD - Before removeSuccessor - Head: ${edge.head.token} (index: ${edge.head.index}), Tail: ${edge.tail.token} (index: ${edge.tail.index})`);
                    edge.head.removeSuccessor(edge.tail.index);
                    console.log(`MainiD - After removeSuccessor - Head Successors: `, edge.head.successors);
                    edge.head.addSuccessor(dvh.index);
    
                    dvt = new MTRAVizVertex(this.graph, this.config.getVertexIndex(), '');
                    dvt.dummy = true;
                    dvt.successors = [edge.tail.index];
                    edge.tail.removePredecessor(edge.head.index);
                    edge.tail.addPredecessor(dvt.index);
    
                    dvh.addSuccessor(dvt.index);
                    dvt.addPredecessor(dvh.index);
    
                    dvh.boxWidth = 0;
                    dvh.boxHeight = 0;
                    dvt.boxWidth = 0;
                    dvt.boxHeight = 0;
                    dvh.x1Temp = width - gap;
                    dvh.x2Temp = width - gap;
                    dvt.x1Temp = gap;
                    dvt.x2Temp = gap;
                    dvh.x1 = (edge.head.level + 1) * width;
                    dvh.x2 = (edge.head.level + 1) * width;
                    dvt.x1 = (edge.head.level + 1) * width;
                    dvt.x2 = (edge.head.level + 1) * width;
    
    
                    const path = [edge.head, dvh, dvt, edge.tail];
                    paths.push(path);
    
                    this.graph.addVertex(dvh);
                    this.graph.addVertex(dvt);
    
                    dvh.level = edge.head.level;
                    dvt.level = edge.head.level + 1;
    
                    this.layout.push(dvh);
                    this.layout.push(dvt);
    
                    if (edge.head.token === "") {
                        dvh.linebreak = true;
                    }
    
                    if (edge.tail.level !== dvt.level) {
                        edges.splice(edges.indexOf(edge) + 1, 0, {
                            head: dvt,
                            tail: edge.tail
                        });
                    } else {
                        dummys[edge.tail.index + ''] = { h: dvh, t: dvt, path: path };
                    }
                } else {
                    dvh = dummys[edge.tail.index + ''].h;
                    dvt = dummys[edge.tail.index + ''].t;
                    edge.head.removeSuccessor(edge.tail.index);
                    edge.head.addSuccessor(dvh.index);
                    edge.tail.removePredecessor(edge.head.index);
                    edge.tail.addPredecessor(dvt.index);
                    dvh.addPredecessor(edge.head.index);
    
                    const path = dummys[edge.tail.index + ''].path;
                    if (Math.abs(edge.head.layer) < Math.abs(path[0].layer) ||
                        (Math.abs(edge.head.layer) === Math.abs(path[0].layer) && edge.head.x2 > path[0].x2)) {
                        path[0] = edge.head;
                    }
    
                }
    
                //inserting dummy vertices in pats
                this.sentencePaths.forEach((sentencePath, pathIndex) => {
                    for (let k = 0; k < sentencePath.length - 1; k++) {
                        if (sentencePath[k] === edge.head && sentencePath[k + 1] === edge.tail) {
                            sentencePath.splice(k + 1, 0, dvh, dvt);
                            //console.log(`ID: Dvertices inserted into sentence path at index ${pathIndex}`, { dvh, dvt, sentencePath });
                            break;
                        }
                    }
                });
            }
        });
    
        //Sort paths
        paths.sort((p1, p2) => {
            if (p1[0].level < p2[0].level) return -1;
            if (Math.abs(p1[0].layer + p1[3].layer) < Math.abs(p2[0].layer + p2[3].layer)) return -1;
            if (Math.abs(p1[0].layer + p1[3].layer) === Math.abs(p2[0].layer + p2[3].layer) && p1[3].x1 - p1[0].x2 < p2[3].x1 - p2[0].x2) return -1;
            return 1;
        });
    
        //Adjust layers for dummy vertices 
        paths.forEach((path, pathIndex) => {
            const layer = this.getYLayer(path[0].layer, path[3].layer, path[1], true);
            path[1].layer = layer;
            path[2].layer = layer;
            //console.log(`ID adjusted layers for path ${pathIndex}`, path);
        });
        //restoring  x-coordinates for vertices from temporary assingment
        this.vertices.forEach((vertex, vIndex) => {
            vertex.x1 = vertex.x1Temp;
            vertex.x2 = vertex.x2Temp;
            
        });
        //console.log("ID final vertices with dummies inserted:", this.vertices);
        this.vertices = this.graph.vertices;
    }

    /**
     * Computes the path of the given transposition between two vertices.
     * @param {Object} v1 - The first vertex.
     * @param {Object} v2 - The second vertex.
     * @returns {string} - The path string for the SVG.
     */
    generateTranspositionPath(v1, v2) {

        const bezier = function(x1, y1, xb, yb, x2, y2) {
            return `C ${x1} ${y1} ${xb} ${yb} ${x2} ${y2} `;
        };

        const line = function(x1, y1, x2, y2) {
            return `L ${x1} ${y1} ${x2} ${y2} `;
        };

        const x1 = v1.x, x2 = v2.x;
        let y1, y2, y3, y4, y5;
        const l1 = this.getLayer(v1.layer);
        const l2 = this.getLayer(v2.layer);
        const cr = Math.min(this.curveRadius, Math.abs(x1 - x2) / 2);

        if (l1 === l2) {
            y1 = v1.y2;
            y2 = (v1.y1 + v1.y2) / 2 + l1.height / 2;
            y3 = (v1.y1 + v1.y2) / 2 + l1.height / 2 + cr;
            y4 = (v2.y1 + v2.y2) / 2 + l1.height / 2;
            y5 = v2.y2;
        } else if (l1.index < l2.index) {
            const hsh = this.horizontalSlots[this.getLayerIndex(v1.layer) + 1].yMax - this.horizontalSlots[this.getLayerIndex(v1.layer) + 1].yMin;
            y1 = v1.y2;
            y2 = (v1.y1 + v1.y2) / 2 + l1.height / 2 + hsh / 2;
            y3 = (v1.y1 + v1.y2) / 2 + l1.height / 2 + hsh / 2 + cr;
            y4 = y3 + cr;
            y5 = v2.y1;
        } else if (l1.index > l2.index) {
            const hsh = this.horizontalSlots[this.getLayerIndex(v1.layer)].yMax - this.horizontalSlots[this.getLayerIndex(v1.layer)].yMin;
            y1 = v1.y1;
            y2 = (v1.y1 + v1.y2) / 2 - l1.height / 2 - hsh / 2;
            y3 = (v1.y1 + v1.y2) / 2 - l1.height / 2 - hsh / 2 - cr;
            y4 = y3 - cr;
            y5 = v2.y2;
        }

        let path = `M ${x1} ${y1} `;
        path += line(x1, y1, x1, y2);
        path += bezier(x1, y2, x1, y3, x1 + cr, y3);
        path += line(x1 + cr, y3, x2 - cr, y3);
        path += bezier(x2 - cr, y3, x2, y3, x2, y4);
        path += line(x2, y4, x2, y5);

        return path;
    }

    /**
     * Calculates minimum subgraphs for (potential) transpositions.
     */
    calculateTranspositions() {
        const groups = [];
    
        this.vertices.forEach(vertex => {
            if (vertex === this.startVertex || vertex === this.endVertex || vertex.token === '') {
                return;
            }
    
            vertex.x = (vertex.x1 + vertex.x2) / 2;
            let found = false;
    
            for (const group of groups) {
                if (group[0].token === vertex.token) {
                    group.push(vertex);
                    found = true;
                    break;
                }
            }
    
            if (!found) {
                groups.push([vertex]);
            }
        });
    
        groups.forEach(group => {
            if (group.length === 1) return;
    
            group.forEach((vertex, j) => {
                vertex.transpositions = [];  //to hold pasths
                vertex.transpositionGroup = group;  //rects
    
                group.forEach((target, k) => {
                    if (j === k) return;
    
                    //create the path connecting the two transposed vertices
                    const path = vertex.x < target.x
                        ? this.generateTranspositionPath(vertex, target)
                        : this.generateTranspositionPath(target, vertex);
                    
                    //create the path element and push it as node
                    const p = this.svg.append("path")
                        .attr("d", path)
                        .attr("stroke-width", 3)
                        .attr("stroke-dasharray", '3,3') //the dashed line
                        .attr("opacity", "1.0")
                        .style("display", "none"); //do not show til interaction
    
                    vertex.transpositions.push(p.node()); //stores a node
                });
    
                //ectangles are not styled by default
                group.forEach(v => {
                    if (v.rect && v.rect.node() instanceof SVGElement) {
                        d3.select(v.rect.node()).attr("class", null)
                            .attr("stroke", "none")
                            .attr("opacity", "0");//encircling
                    }
                });
            });
        });
    }

    /**
     * Collects and logs tokens across all graphs by hover
     */
    highlightCrossLanguageMatches(vertex) {
        const hoveredToken = vertex.token;
    
        //HoveredToken must be a string or abort and return,
        if (typeof hoveredToken !== 'string') {
            console.error('Invalid hovered token (not a string):', hoveredToken);
            return;
        }
        //console.log('hovered token:', hoveredToken);
    
        //1: fetch language-specific array based on edition of hovered vertex
        const languageSuffix = this.getLanguageSuffix(this.editions[0]);
        //cSonsole.log('languagesuffix:', languageSuffix);
    
        //2:Translate hovered token across all languages
        let translationCluster = translateToken(hoveredToken, languageSuffix);
        //console.log('Initial Translation Cluster:', translationCluster);
    
        //3: Growing synonyms in a more exhaustive search
        translationCluster = growSynonyms(translationCluster);
        //console.log('Expanded Translation Cluster:', translationCluster);
    
        //Hovered token itself shall be included in the source language array before push
        if (!translationCluster[languageSuffix].includes(hoveredToken)) {
            translationCluster[languageSuffix].push(hoveredToken);
        }
    
        //console.log('Translation Cluster after adding hovered token:', translationCluster); 

        //4 - now apply the highlighter by styles to the matching tokens, using D3
        Object.keys(translationCluster).forEach(language => {
            const matchingTokens = translationCluster[language];
    
            //check for matching tokens for the currentl languageparamter
            if (matchingTokens.length > 0) {
                window.languageVertices[language].forEach(vertex => {
                    if (matchingTokens.includes(vertex.token)) {
                        //apply highlights to the matching tokens
                        d3.select(vertex.rect.node()).style("fill", "lightgreen");
                        d3.select(vertex.textNode.node())
                            .style("font-weight", "400")
                            .style("fill", "darkgreen");
                    }
                });
            } else {
                console.log(`No matching tokens found for language: ${language}`);
            }
        });
    
        //console.log('final cluster:', translationCluster);
    }
    
    
    /**
     * Removes all cross-language highlighted tokens
     */
    resetCrossLanguageMatches() {
        //iterate over graphs and reset the style for token having been hightlighted
        Object.keys(window.languageVertices).forEach(language => {
            window.languageVertices[language].forEach((v) => {
                //make sure the rect before applying styles
                if (v.rect && v.rect.node()) {
                    d3.select(v.rect.node())
                        .style("fill", this.config.vertexBackground);  //use config backgrounds from before hightlight
                }
                //same with texts
                if (v.textNode && v.textNode.node()) {
                    d3.select(v.textNode.node())
                        .style("font-weight", "normal")
                        .style("fill", "");  //same - reset - no fill
                }
            });
        });
    }
    
    
    /**
     * Main function to be called to visualize the computed Text Variant Graph.
     */
    visualize() {

        this.initSvg();
    
        //dyynamically create the div with ID based on this.div
        const paperDivId = `MTRAVizPaperDiv${this.div}`;
        const containerDiv = document.getElementById(this.div);
    
        if (containerDiv) {
            //Clear previous content
            containerDiv.innerHTML = '';
    
            //and then: create a new div with the dynamic ID and append to the container
            const paperDiv = document.createElement('div');
            paperDiv.id = paperDivId;
            containerDiv.appendChild(paperDiv);

        }

        //   Remove old class .trailsQtip - it belongs to setTooltip and removes unwanted copying of the unlink links
        const qtips = document.querySelectorAll('.trailsQtip');
        qtips.forEach(qtip => {
            qtip.remove();
        });


        //calculate the gap based on the curve radius from the configuration
        const gap = 2 * this.curveRadius;
        //console.log('gap calculated: ', gap)

        // is a reference to 'this' stored in 'sal'
        const sal = this;
        //console.log('current object in full form: ', sal)

        // nitialize an empty array to store layer heights
        const layerHeights = [];

        // Retrieve paths by edition using the aligner
        const paths = this.aligner.getPathsByEdition(this.sentencePathHash[this.mainBranch], this.sentencePaths);
        //console.log('paths gotten by edition: ', paths );


        //  initialize an empty array to store heights
        const heights = [];

        //  initialize variables for x and y coordinates, with y starting at 1000
        let x;
        let y = 1000;


        //function to get mouse position
        const getMousePosition = (event = window.event) => {
            const mousePosition = {
                top: event.pageY || event.clientY,
                left: event.pageX || event.clientX
            };

            //console.log('mouse:', mousePosition);

            return mousePosition;
        };


        const dragNode = (evt, node, vertex) => {
            const startPos = getMousePosition(evt);
            const nodeX1 = vertex.x1;
            const nodeX2 = vertex.x2;
            const nodeY1 = vertex.y1;
            const nodeY2 = vertex.y2;
            let clone = null;
            let mergeNode = false, acyclic = false;
            let dragging = false;  //track for drag
            const dragThreshold = 5;  //this makes sure we have a movement and not for instance a click

            // Mouse-up handler
            const mouseUpHandler = () => {
                if (window.getSelection) {
                    const sel = window.getSelection();
                    if (sel.removeAllRanges) sel.removeAllRanges();
                } else if (document.selection && document.selection.empty) {
                    document.selection.empty();
                }
        
                //Clear mouse event listeners
                document.onmousemove = null;
                document.onmouseup = null;
        
                if (dragging) {  //codnition to only handle a drag, not just a click!
                    if (mergeNode && !acyclic) {
                        alert('Invalid merge attempt produced a circle in the graph!');
                        clone.attr({ fill: sal.config.options.baseColor });
                        mergeNode.textNode.attr({ fill: sal.config.options.baseColor });
        
                        //fade out and remove the clone
                        clone.node().style.transition = "opacity 1s ease";
                        clone.node().style.opacity = 0;
                        setTimeout(() => {
                            clone.remove();
                        }, 1000);
        
                    } else if (mergeNode && acyclic) {
                        const v = sal.originGraph.isAcyclicFromVertex(
                            sal.originGraph.getVertex(mergeNode.index),
                            sal.originGraph.getVertex(vertex.index)
                        );
        
                        for (let i = 0; i < sal.sentencePaths.length; i++) {
                            const path = sal.sentencePaths[i];
                            for (let j = 0; j < path.length; j++) {
                                if (path[j] === mergeNode || path[j] === vertex) {
                                    path[j] = v;
                                }
                            }
                        }
                        sal.reset();
                        sal.visualize();
                    } else {
                        //fade out and remove the clone
                        clone.node().style.transition = "opacity 1s ease";
                        clone.node().style.opacity = 0;
                        setTimeout(() => {
                            clone.remove();
                        }, 1000);
                    }
                }
            };
        
            //mouse-move handler
            const mouseMoveHandler = (e) => {
                const currentPos = getMousePosition(e);
                const dx = Math.abs(currentPos.left - startPos.left);
                const dy = Math.abs(currentPos.top - startPos.top);
        
                //Dragthreshold - decide if mouse was moved beyong, then a drag
                if (!dragging && (dx > dragThreshold || dy > dragThreshold)) {
                    dragging = true;
                }
        
                if (dragging) {
                    if (!clone) {
                        clone = sal.svg.append('text')
                            .attr('x', (vertex.x1 + vertex.x2) / 2)
                            .attr('y', (vertex.y1 + vertex.y2) / 2)
                            .attr('font-family', sal.config.options.font)
                            .attr('font-size', `${vertex.fs}px`)
                            .attr('fill', sal.config.options.baseColor)
                            .attr('text-anchor', 'middle')
                            .attr('cursor', 'pointer')
                            .style('opacity', 1)
                            .text(vertex.token);
                    }
        
                    if (window.getSelection) {
                        const sel = window.getSelection();
                        if (sel.removeAllRanges) sel.removeAllRanges();
                    } else if (document.selection && document.selection.empty) {
                        document.selection.empty();
                    }
        
                    const pos = getMousePosition(e);
                    clone.x1 = nodeX1 + pos.left - startPos.left;
                    clone.x2 = nodeX2 + pos.left - startPos.left;
                    clone.y1 = nodeY1 + pos.top - startPos.top;
                    clone.y2 = nodeY2 + pos.top - startPos.top;
                    clone.attr({ x: (clone.x1 + clone.x2) / 2, y: (clone.y1 + clone.y2) / 2 });
        
                    if (mergeNode) {
                        clone.attr({ fill: sal.config.options.baseColor });
                        mergeNode.textNode.attr({ fill: sal.config.options.baseColor });
                    }
                    mergeNode = false;
                    acyclic = false;
        
                    let d = 0;
                    for (let i = 0; i < sal.vertices.length; i++) {
                        const v1 = clone;
                        const v2 = sal.vertices[i];
        
                        if (vertex !== v2 && sal.overlap(v1.x1, v1.x2, v2.x1, v2.x2, v1.y1, v1.y2, v2.y1, v2.y2)) {
                            const x1 = (v1.x1 + v1.x2) / 2;
                            const x2 = (v2.x1 + v2.x2) / 2;
                            const y1 = (v1.y1 + v1.y2) / 2;
                            const y2 = (v2.y1 + v2.y2) / 2;
                            const dist = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
        
                            if (!mergeNode || (mergeNode && dist < d)) {
                                mergeNode = v2;
                                d = dist;
                            }
                        }
                    }
        
                    if (mergeNode) {
                        const g_test = sal.originGraph.clone();
                        acyclic = g_test.isAcyclicFromVertex(
                            sal.originGraph.getVertex(mergeNode.index),
                            sal.originGraph.getVertex(vertex.index)
                        );
                        const color = acyclic ? "#90EE90" : "#FF8AA7";
                        clone.attr({ fill: color });
                        mergeNode.textNode.attr({ fill: color });
                    }
                }
            };
        
            //Event listeners
            document.onmouseup = mouseUpHandler;
            document.onmousemove = mouseMoveHandler;
        };
        
        //createBranch a functionality of setTooltip functionality further below!
        const createBranch = (v, e) => {
            // first create a new vertex and add it to the origin graph
            const nv = new MTRAVizVertex(sal.originGraph, sal.originGraph.config.getVertexIndex(), "");
            //console.log('new vertex added to original graph: ', nv);

            sal.originGraph.addVertex(nv);
        
            //console.log('starting createbranch -  vertex sources:', v.sources);
            //console.log('branch edge (e):', e);
        
            //Move correct source from  old vertex to new vertex
            for (let i = 0; i < v.sources.length; i++) {
                if (v.sources[i].sourceId == e) {  // many problems with modernizations have lead to also equalities being loose similar to original code
                    //console.log('moving source from original vertex to new one:', v.sources[i]);
        
                    //push source to the newvertex, nv
                    nv.sources.push(v.sources[i]);
        
                    //Assign token after moving the source
                    nv.token = v.sources[i].token;
                    //console.log('assigned token to new vertex:', nv.token);
        
                    //remove the source fromoriginal vertex
                    v.sources.splice(i, 1);
                    break;
                }
            }
        
            //coundown - decrease the count for the original vertex
            v.count--;
            //console.log('new count for the original vertex:', v.count);
        
            //uppdating sentenceP for the parameter-edge
            const sp = sal.sentencePaths[e];
            for (let i = 0; i < sp.length; i++) {
                if (sp[i].index == v.index) {  //note: loose equality
                    sp[i] = nv;
                    //console.log('SP with new vertex: ', sp[i]);
                    break;
                }
            }
        
            sal.reset();
            //console.log('graph reset');
            sal.visualize();
        };

        //first in tooltip we get the edges appaering by vertex hover and the transpoistions right under that
        //then we get the split fucntions from split and merge
        //for split it sets a pop-up - which opens and closes by a button
        const setTooltip = (node, vertex, svg) => {
            let attachedLinks = false; //we only want links attached ONCE
            //console.log('STT links attached initially: ', attachedLinks);
        
            //select node using D3
            const selectedNode = d3.select(node);
            if (selectedNode.empty()) {
                console.error('Failed to select the node properly:', node);
                return;
            }
        
            //showConnections handles displaying vertex connections and transpositions
            const showConnections = () => {
                //hiding basic connections
                sal.basicConnections.forEach((conn) => {
                    const element = conn.node();
                    if (element instanceof SVGElement) {
                        d3.select(element).style('display', 'none').style('visibility', 'hidden');
                    }
                });
        
                //Remove existing vertex connections
                sal.vertexConnections.forEach((conn) => {
                    const element = conn.node();
                    if (element instanceof SVGElement) {
                        d3.select(element).remove();
                    }
                });
        
                //Display vertex connections for selectedNode
                sal.displayVertexConnections(selectedNode.node(), vertex, svg);

                //  IF cross-language hover is enabled in the configuration, then highlight all tokenmathces
                if (this.config.options.crossLanguageTokenMatch) {
                    this.highlightCrossLanguageMatches(vertex);
                }
        
                //Transpositions: Show both path and rect
                if (vertex.transpositions) {
                    vertex.transpositions.forEach((transpositionPath) => {
                        if (transpositionPath instanceof SVGElement) {
                            d3.select(transpositionPath)
                                .style('display', 'block')
                                .attr("stroke", "#000")
                                .attr("stroke-dasharray", "3,3")
                                .attr("opacity", "1.0");
                        } else {
                            console.warn('Skipping non-SVG transposition path:', transpositionPath);
                        }
                    });
        
                    vertex.transpositionGroup.forEach((transposition) => {
                        const rectNode = transposition.rect.node();
                        if (rectNode instanceof SVGElement) {
                            d3.select(rectNode)
                                .attr('stroke', "#000")
                                .attr('stroke-width', "1px")
                                .attr("opacity", "1.0");
                        }
                    });
                }
            };
        
            //hideConnections handles hiding vertex connections and transpositions
            const hideConnections = () => {
                // remove all vertex connections
                sal.vertexConnections.forEach((conn) => {
                    const element = conn.node();
                    if (element instanceof SVGElement) {
                        d3.select(element).remove();
                    }
                });
        
                //show all basic connections again
                sal.basicConnections.forEach((conn) => {
                    const element = conn.node();
                    if (element instanceof SVGElement) {
                        d3.select(element).style('display', 'block').style('visibility', 'visible');
                    }
                });

                //IFcross-language hover is enabled in the configuration
                if (this.config.options.crossLanguageTokenMatch) {
                    this.resetCrossLanguageMatches(); //reset hightlights
                }
        
                //hide transpositions for the vertex
                if (vertex.transpositions) {
                    vertex.transpositions.forEach((transpositionNode) => {
                        if (transpositionNode instanceof SVGElement) {
                            d3.select(transpositionNode).style('display', 'none');
                        }
                    });
        
                    vertex.transpositionGroup.forEach((transposition) => {
                        const rectNode = transposition.rect.node();
                        if (rectNode instanceof SVGElement) {
                            d3.select(rectNode)
                                .attr('class', null)
                                .attr("stroke", "none")
                                .attr("opacity", "0");
                        }
                    });
                }
            };
        
            //attach hover event to the show and hideConnection functions
            const mouseEnterHandler = (event) => {
                if (event.target === node) {
                    showConnections();
                }
            };
        
            const mouseLeaveHandler = (event) => {
                if (event.target === node) {
                    hideConnections();
                }
            };
        
            //Now attach the event listeners 
            document.addEventListener('mouseover', mouseEnterHandler);
            document.addEventListener('mouseout', mouseLeaveHandler);
        
            // Clean them up when not needed
            const removeListeners = () => {
                document.removeEventListener('mouseover', mouseEnterHandler);
                document.removeEventListener('mouseout', mouseLeaveHandler);
            };
        
            //Dragging the node
            if (sal.config.options.splitAndMerge) {
                selectedNode.on('mousedown', (evt) => {
                    dragNode(evt, selectedNode.node(), vertex);
                });
            }
        
            /**
             * Pop-up/trailsQtip Functionality
             */

            selectedNode.on('click', function (event) {
            //console.log('selectedNode outerHTML:', selectedNode.node().outerHTML);
            //console.log('selectedNode:', selectedNode);
        
            //remove any previous tooltip to prevent duplicates
            d3.selectAll('.custom-tooltip').remove();
        
            let tiptext = `
            <div class="tooltip-title">
                <span>"${vertex.token}": ${vertex.sources.length} occurrences</span>
                <span class="tooltip-close" onclick="document.querySelector('.custom-tooltip').style.display='none'">X</span>
            </div>
            <table>
                <tr><th style='text-align:right;'>edition</th><th style='text-align:left;'>token</th></tr>`;
            for (let i = 0; i < vertex.sources.length; i++) {
                const source = vertex.sources[i];
                tiptext += `
                    <tr>
                        <td style='text-align:right;color:${sal.colorMap[sal.editions[source.sourceId]]};'>${sal.editions[source.sourceId]}</td>
                        <td style='text-align:left;color:${sal.colorMap[sal.editions[source.sourceId]]};'>${source.token}</td>`;
                if (sal.config.options.splitAndMerge && vertex.sources.length > 1) {
                    tiptext += `<td><div title='Remove token and create new branch!' name="${source.sourceId}" class='unlink unlink${vertex.index}'></div></td>`;
                }
                tiptext += `</tr>`;
            }
            tiptext += `</table>`;
        
            //console.log('tooltip and content content:', tiptext);
        
            //tooltip dynamically reacting and created by click
            const customTooltip = d3.select("body").append("div")
            .attr("class", "custom-tooltip trailsQtip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .html(tiptext);

            customTooltip.style("visibility", "visible")
            .style("top", (event.pageY - 10) + "px")
            .style("left", (event.pageX + 10) + "px");

            //tooltip stays visible when interacting
            customTooltip.on('mouseenter', function () {
            customTooltip.style("visibility", "visible"); //stay visible til closed manually
            });

            //close when clicked
            d3.selectAll('.tooltip-close').on('click', function () {
            customTooltip.remove();  //rmove the tooltip ONLY when the button is clicked
            });

            //Event listeners to unlink elements for split/merge
            if (!attachedLinks) {
            const links = document.querySelectorAll(`.unlink${vertex.index}`);
            //console.log('unlink elements:', links);

            for (let i = 0; i < links.length; i++) {
                const link = links[i];
                //console.log('unlink element: ', link);

                d3.select(link).on('click', function () {
                    //console.log('unlink clicked at vertex index:', vertex.index, 'sourceId:', this.getAttribute('name'));

                    createBranch(sal.originGraph.getVertex(vertex.index), this.getAttribute('name'));

                    //remove the tooltip after unlink
                    customTooltip.remove();
                });
            }

            attachedLinks = true;

            }
        })
        }

            
        
        const helperDiv = d3.select("body").append("label").style("visibility", "hidden");
        const t1 = new Date();
        this.layout = [];
        let maxLabel = 0;

        //maximum label count
        this.vertices.forEach(vertex => {
            if (vertex.count > maxLabel) {
                maxLabel = vertex.count;
            }
        });

        //paths to set up layout information
        paths.forEach((path, i) => {
            x = 0;
            let j = 0, k = path.length;
            if (i > 0) {
                j++;
                k--;
            }
            let width = 0, height = 0;

            //possible font sizes
            const sizes = [12, 17, 23, 30, 38, 47, 57];

            //the vertices in the path - and below assign fontsize...
            for (j; j < k; j++) {
                const v = path[j];
                let fs = this.config.options.fontSizeMin + this.config.options.fontSizeIncrease * (v.count - 1);
                if (this.config.options.interpolateFontSize) {
                    fs = this.config.options.fontSizeMin + (v.count - 1) / (maxLabel - 1) * (this.config.options.fontSizeMax - this.config.options.fontSizeMin);
                }

                //Set text content and style for helperDiv to measure dimensions
                helperDiv.text(v.token).style("font", `${fs}px ${this.config.options.font}`);
            
                // Set vertex coordinates and dimensions
                v.x1 = x;

                if (v.count <= this.config.options.collapseLabels) {
                    helperDiv.text("M");
                }

                const widthN = helperDiv.node().offsetWidth + 6;
                const heightN = helperDiv.node().offsetHeight;

                //console.log('vis masured dimensions for token:', v.token, 'widthN:', widthN, 'heightN:', heightN);

                v.boxWidth = widthN;
                v.boxHeight = heightN;
                //console.log('Vis: x before v.x2 is set: ', x)
                v.x2 = widthN + x;
                //console.log('VisU: x after v.x2 is set: ', x)

                //onsole.log('visU y before set v.y1. and v.y2: ', y);
                v.y1 = y - heightN / 2;
                v.y2 = y + heightN / 2;
                //console.log('visU y after v.y1 and v.y2 is set: ', y);

                width += widthN;

                if (j > 0) {
                    width += gap;
                }

                if (heightN > height) {
                    height = heightN;
                }

                //puhs into layout
                this.layout.push(v);
            }

            //push height for path
            heights.push(height);
        });

        //reemove the helper div after use - now all values are set and pushed
        helperDiv.remove();

        this.setXFlow();

        //layour - layers and layerheight
        this.layout = [];
        this.layers = [];
        let lh = 0;

        //First path to set up layers and layout
        paths[0].forEach((vertex) => {
            this.layout.push(vertex);
            vertex.layer = 0;
            if (vertex.boxHeight > lh) {
                lh = vertex.boxHeight;
            }
        });

        //lh important at this point - determined above - vertex.boxHeidht if bigger than 0 (for a start)
        this.layers.push({
            index: 0,
            height: lh,
            vertices: []
        });

        //console.log("initial layer: ", this.layers[0]);

        //get  y-layer for a parameter-vertex 'v',  - places vertices related to other vertices without overlaps and in correct layer
        this.getYLayer = function(layer0, layerN, v, force = false) {
            let destination = Math.abs(layer0) > Math.abs(layerN) ? layer0 : layerN;
            const destinationStart = destination;

            const next = (add) => {
                if (typeof add !== "undefined") {
                    add = add > 0 ? add * -1 : add * -1 + 1;
                    destination = destinationStart + add;
                } else {
                    add = 0;
                }

                if (!force && destination === 0) {
                    next(add);
                } else {
                    let overlaps = false;

                    for (const layoutVertex of this.layout) {
                        if (layoutVertex.layer === destination) {
                            if (!(layoutVertex.x1 > v.x2 || v.x1 > layoutVertex.x2)) {
                                overlaps = true;
                                break;
                            }
                        }
                    }

                    if (overlaps) {
                        next(add);
                    }
                }
            };

            next();

            let layer = this.getLayer(destination);
            if (!layer) {
                layer = {
                    index: destination,
                    height: 0,
                    vertices: []
                };
                this.layers.push(layer);
            }

            const vertexHeight = Math.abs(v.y2 - v.y1);
            if (vertexHeight > layer.height) {
                layer.height = vertexHeight;
            }

            return destination;
        };

        for (let i = 1; i < paths.length; i++) {
            const path = paths[i];
            const startVertex = path[0];
            const endVertex = path[path.length - 1];
            const s1 = path[1];
            const e1 = path[path.length - 2];

            //ceate new vertex
            const vertex = new MTRAVizVertex(this.graph, this.graph.config.getVertexIndex(), s1.token);
            vertex.x1 = s1.x1 - gap;
            vertex.x2 = e1.x2 + gap;
            vertex.y1 = (startVertex.y1 + startVertex.y2) / 2 - heights[i] / 2;
            vertex.y2 = (startVertex.y1 + startVertex.y2) / 2 + heights[i] / 2;

            //decide layer for new vertex
            const determinedLayer = this.getYLayer(startVertex.layer, endVertex.layer, vertex);

            //setlayer for each vertex in path and push to layout
            for (let j = 1; j < path.length - 1; j++) {
                path[j].layer = determinedLayer;
                this.layout.push(path[j]);
                //console.log('visU -  push getYLayer - derminedLayer(y) and path: ', determinedLayer, path[j]);
            }
        }

        //chheck and insert dummys if line breaks
        if (this.config.options.lineBreaks) {
            this.insertDummys();
            console.log('VIS: Dummies inserted')
        }

        const ln = this.layers.length;

        this.vertices.forEach((v) => {
            //vertex must have a level property; default to 0 if undefined - layering precaution
            if (typeof v.level === "undefined") {
                v.level = 0;
            }
        
            //fetch old layer and set originLayer for vertex
            const oldLayer = this.getLayer(v.layer);
            v.originLayer = oldLayer.index;
        
            //then remove vertex from old layer's vertices array
            for (let j = 0; j < oldLayer.vertices.length; j++) {
                if (oldLayer.vertices[j] === v) {
                    oldLayer.vertices.splice(j, 1);
                    break;
                }
            }
        
            // uppdate vetexes layer based on level and on layer total
            v.layer += v.level * ln;
        
            //thus fetcht or set and push
            let layer = this.getLayer(v.layer);
            if (!layer) {
                layer = {
                    index: v.layer,
                    height: 0,
                    vertices: []
                };
                this.layers.push(layer);
            }
        
            //Fix height of the layer if necessary
            const vertexHeight = Math.abs(v.y2 - v.y1);
            if (vertexHeight > layer.height) {
                layer.height = vertexHeight;
            }
        
            //push vertex to new layer array
            layer.vertices.push(v);
        });
        

        //function to sort layers by their index
        const sortLayers = (l1, l2) => (l1.index < l2.index ? -1 : 1);

        //Sort layers
        this.layers.sort(sortLayers);

        let lastLevel = 0;

        //run over layers
        this.layers.forEach(layer => {
            if (layer.vertices.length > 0) {
                //setting level to the first vertexex level if vertices exists (larger than 0 in length)
                layer.level = layer.vertices[0].level;
                lastLevel = layer.level;
            } else {
                //Else, set the layer level last known level
                layer.level = lastLevel;
            }
        });

        this.setConnections();

        this.removeOverlaps();

        this.transformEdgeTypes();
        

        if (this.config.options.lineBreaks && this.config.options.lineNumbering) {
            //console.log("VisN: Before adjustment:");
            this.layout.forEach(v => {
                //console.log(`VisN processing - vertex: ${v.token}, Level: ${v.level}, y1: ${v.y1}, y2: ${v.y2}`);
            });
        
            this.layout.forEach(v => {
                v.y1 += (v.level + 1) * 26;
                v.y2 += (v.level + 1) * 26;
            });
        
            //console.log("VisN: After adjustment: ");
            this.layout.forEach(v => {
                //console.log(`VisN processing vertex: ${v.token}, Level: ${v.level}, y1: ${v.y1}, y2: ${v.y2}`);
            });
        

            //tune connection link positions
            this.connections.forEach(connection => {
                const v = connection.v1;
                connection.links.forEach(link => {
                    link.y1 += (v.level + 1) * 26;
                    link.y2 += (v.level + 1) * 26;
                });
            });

            //tune yLevel of layers
            this.layers.forEach(layer => {
                layer.yLevel += (layer.level + 1) * 26;
            });
        }

        let nXs = false;

        //determine  nXs value by looping through successors of the startVertex
        this.startVertex.successors.forEach(successorIndex => {
            const suc = this.graph.getVertex(successorIndex);
            if (!nXs || suc.x1 - 4 * this.curveRadius < nXs) {
                nXs = suc.x1 - 4 * this.curveRadius;
            }
        });

        //set position forstartVertex
        this.startVertex.x1 = nXs;
        this.startVertex.x2 = nXs;

        //Tune connection positions by calculated nXs value
        this.startVertex.successors.forEach(successorIndex => {
            const c = this.getConnection(this.startVertex, this.graph.getVertex(successorIndex));
            
            if (c.type === 1 && c.links[0].type === "source") {
                c.links[0].x1 = nXs + this.curveRadius;
                c.links[0].x2 = nXs + this.curveRadius;
            } else if (c.type === 3 || c.type === 0) {
                c.links[0].x1 = nXs + this.curveRadius;
                c.links[0].x2 = nXs + this.curveRadius;
                c.links[1].x1 = nXs + 2 * this.curveRadius;
            }
        });

        let nXe = 0;

        //looping through predecessors of the endVertex  - to determine the nXe value
        this.endVertex.predecessors.forEach(predecessorIndex => {
            const pred = this.graph.getVertex(predecessorIndex);
            if (pred.x2 + 4 * this.curveRadius > nXe) {
                nXe = pred.x2 + 4 * this.curveRadius;
            }
        });

        //position for endVertex
        this.endVertex.x1 = nXe;
        this.endVertex.x2 = nXe;

        //Tuning: connection positions based on the calculated nXe value
        this.endVertex.predecessors.forEach(predecessorIndex => {
            const c = this.getConnection(this.graph.getVertex(predecessorIndex), this.endVertex);
            
            if (c.type === 1 && c.links[0].type === "sink") {
                c.links[0].x1 = nXe - this.curveRadius;
                c.links[0].x2 = nXe - this.curveRadius;
            } else if (c.type === 3 || c.type === 0) {
                c.links[2].x1 = nXe - this.curveRadius;
                c.links[2].x2 = nXe - this.curveRadius;
                c.links[1].x2 = nXe - 2 * this.curveRadius;
            }
        });

        let x_min = false, x_max = false;
        let y_min = false, y_max = false;

        //console.log('Vis - initial x_min:', x_min, 'x_max:', x_max, 'y_min:', y_min, 'y_max:', y_max);

        //IF RTL configs then reversing x-coordinates in layout
        if (this.config.options.rtl) {
            this.layout.forEach(vertex => {
                vertex.x1 *= -1;
                vertex.x2 *= -1;
            });

            this.connections.forEach(connection => {
                connection.links.forEach(link => {
                    link.x1 *= -1;
                    link.x2 *= -1;
                });
            });
        }

        //find the min and max values for x and y
        this.layout.forEach(v => {
            if (x_min === false || v.x1 < x_min) {
                x_min = v.x1;
            }
            if (x_max === false || v.x2 > x_max) {
                x_max = v.x2;
            }
            if (y_min === false || v.y1 < y_min) {
                y_min = v.y1;
            }
            if (y_max === false || v.y2 > y_max) {
                y_max = v.y2;
            }

        });

        //Tune  y_min, y_max, x_min, and x_max by curveRadius and other set inputs
        y_min -= 3 * this.curveRadius;
        y_max += 3 * this.curveRadius + 40;
        x_min -= 3 * this.curveRadius;
        x_max += 3 * this.curveRadius;

        if (this.config.options.lineBreaks && this.config.options.lineNumbering) {
            y_min -= 26;
        }

        //console.log('Vis: Final valules: x_min:', x_min, 'x_max:', x_max, 'y_min:', y_min, 'y_max:', y_max);

        //Calculate width and height based on final values above
        let w = x_max - x_min;
        let h = y_max - y_min;

        //console.log('Vis: calculated width (w):', w, 'and height (h):', h);


        if (this.config.options.lineBreaks) {
            w = document.getElementById(this.div).clientWidth;
            //console.log('VisN LineBreaks true: clientWidth:', w);
        }
        
        //console.log(`VisN: initial width adjustment: width ${w}px, heighth ${h}px`);
    
        //svg with paperDiv
        this.svg = d3.select(`#${paperDivId}`)
            .append('svg')
            .attr('width', w)
            .attr('height', h);

        //console.log(`Vis: setting initial SVG width: ${w}, height: ${h}`);

        //adjusting layout - new values on coordinates
        this.layout.forEach(v => {
            v.y1 -= y_min;
            v.y2 -= y_min;
            if (!this.config.options.lineBreaks) {
                v.x1 -= x_min;
                v.x2 -= x_min;
            }
        });

        this.connections.forEach(connection => {
            connection.links.forEach(link => {
                link.y1 -= y_min;
                link.y2 -= y_min;
                if (!this.config.options.lineBreaks) {
                    link.x1 -= x_min;
                    link.x2 -= x_min;
                }
            });
        });

        //setting size of  SVG element
        this.svg
            .attr('width', `${w}px`)
            .attr('height', `${h}px`);

        //console.log(`Vis: setting the SVG final - same as old: width: ${w}, height: ${h}`);

        //adjust yLevel for each layer
        this.layers.forEach(layer => {
            layer.yLevel -= y_min;
        });

        //transpositions if option is true
        if (this.config.options.transpositions) {
            this.calculateTranspositions();
        }

        for (let i = 0; i < this.layout.length; i++) {
            let v = this.layout[i];

            if (v !== this.startVertex && v !== this.endVertex && v.token !== '' && this.config.options.vertexBackground) {
                let rectX = v.x1 - 5; //extend the rect to the left
                let rectY = v.y1 - 7; //move rect up
                let rectHeight = v.y2 - v.y1 + 6; //set height
                let rectWidth = v.x2 - v.x1 + 10;
                                
                let rect;

                if (v.count > this.config.options.collapseLabels) {
                    rect = this.svg.append('rect')
                        .attr('x', rectX)
                        .attr('y', rectY)
                        .attr('width', rectWidth)
                        .attr('height', rectHeight)
                        .attr('rx', 5)  
                        .attr('fill', this.config.options.vertexBackground)
                        .attr('stroke', 'none');
                } else {
                    rect = this.svg.append('rect')
                        .attr('x', rectX)
                        .attr('y', rectY)
                        .attr('width', rectWidth)
                        .attr('height', rectHeight)
                        .attr('rx', 5)
                        .attr('fill', this.config.options.vertexBackground)
                        .attr('stroke', 'none')
                        .append('title')
                        .text(v.token); 
                }

                //add a specified class if  vertex is part of a transposition group 
                if (v.transpositionGroup && v.transpositionGroup.length > 1) {
                    rect.classed('transposition-rect', true);
                }

                v.rect = rect;

                //Now that  is created make textNode creation
                if (v.count > this.config.options.collapseLabels) {
                    //compute font size based vertex count
                    let fs = this.config.options.fontSizeMin + this.config.options.fontSizeIncrease * (v.count - 1);
                    if (this.config.options.interpolateFontSize) {
                        fs = this.config.options.fontSizeMin + (v.count - 1) / (maxLabel - 1) * (this.config.options.fontSizeMax - this.config.options.fontSizeMin);
                    }
                    v.fs = fs;

                    //and crate the text element using D3
                    v.textNode = this.svg.append('text')
                        .attr('x', (v.x1 + v.x2) / 2)
                        .attr('y', (v.y1 + v.y2) / 2)
                        .attr('font-family', this.config.options.font)
                        .attr('font-size', `${fs}px`)
                        .attr('fill', this.config.options.baseColor)
                        .attr('text-anchor', 'middle')
                        .attr('cursor', 'pointer')
                        .text(v.token);
                }

                //use setTooltip function and add this to vertex in this svg
                setTooltip(v.textNode.node(), v, this.svg);

                //CSS properties to disable text selections and other invisibles... 
                d3.select(v.textNode.node()).style('user-select', 'none')
                    .style('-webkit-touch-callout', 'none')
                    .style('-webkit-user-select', 'none')
                    .style('-khtml-user-select', 'none')
                    .style('-moz-user-select', 'none')
                    .style('-ms-user-select', 'none');
            }
        }

        if (this.config.options.connectionType === 'majority') {
            this.majorityConnections(true);
        } else if (this.config.options.connectionType === 'all') {
            this.majorityConnections(false);
        } else {
            this.generalConnections();
        }

        if (this.config.options.editionLabels) {
            this.computeEdgeLabels();
        }

        //show start and end vetices as circle and rect if option true
        if (this.config.options.startAndEnd) {
            this.svg.append('circle')
                .attr('cx', this.startVertex.x1)
                .attr('cy', this.startVertex.y1)
                .attr('r', 4)
                .attr('fill', this.config.options.baseColor);

            this.svg.append('rect')
                .attr('x', this.endVertex.x1)
                .attr('y', this.endVertex.y1 - 4)
                .attr('width', 8)
                .attr('height', 8)
                .attr('fill', this.config.options.baseColor);
        }

        //Use line numbering if linebreaks and numbering are both true
        if (this.config.options.lineBreaks && this.config.options.lineNumbering) {
            this.insertLineNumbering(w, gap); 
        }

       // copyright
        d3.select(`#${this.div}`).append('a')
            .attr('class', 'TRAViz-copyright-link')
            .attr('target', '_blank')
            .attr('href', 'http://traviz.vizcovery.org')
            .append('div')
            .attr('class', 'TRAViz-copyright');     
        
    }
   

}

export {
    MTRAViz
};


