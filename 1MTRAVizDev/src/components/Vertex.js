//PLEASE NOTE THIS IS ORIGINAL WORK BY STEFAN JANICKE SEE ATTACHED LICENCE AND NOTE THAT MANY SECTIONS HAVE BEEN COPIED OR ONLY SLIGHTLY MODIFIED

/**
 * -------------------------------------------------------
 * CLASS MTRAVizVertex
 * -------------------------------------------------------
 * Represents a vertex object in the graph.
 * Each vertex corresponds to a token in the text variant graph and holds connections to its predecessors and its successors.
 * Has been reverted severely back to the original!
 */
class MTRAVizVertex {
    /**
     * Constructor for the Vertex
     * @param {Object} graph - The graph of the vertex
     * @param {number} index - The index of the vertex, in the graph
     * @param {string} token - The token of the particular vertex
     */
    constructor(graph, index, token) {
        this.graph = graph;             
        this.token = token;             
        this.successors = [];           
        this.predecessors = [];         
        this.count = 1;                 //frequency of the vertex
        this.traced = false;            
        this.linked = true;             
        this.sources = [];              // Array of sources associated with the vertex
        this.index = index;             //vertex index in the graph
     
    }

    /**
     * Removes a successor vertex from the successors list.
     * @param {number} suc - The index of the successor to remove.
     */
    removeSuccessor(suc) {
        //console.log(`MTVrS - before removal: ${this.token} (index: ${this.index}), successors:`, this.successors, 'Attempting to remove:', suc);
        for (let i = 0; i < this.successors.length; i++) {
            if (this.successors[i] === suc) {
                this.successors.splice(i, 1);
                //console.log(`MTVrS  after : ${this.token} (index: ${this.index}), successors:`, this.successors);
                return;
            }
        }
    }

    /**
     * Removes a predecessor vertex from the predecessors list.
     * @param {number} pred - The index of the predecessor to remove.
     */
    removePredecessor(pred) {
        for (let i = 0; i < this.predecessors.length; i++) {
            if (this.predecessors[i] === pred) {
                this.predecessors.splice(i, 1);
                return;
            }
        }
    }

    /**
     * Adds a successor vertex to the successors list.
     * Ensures that the successor is not added if it already exists.
     * @param {number} suc - The index of the successor to add.
     */
    addSuccessor(suc) {
        let found = false;
        for (let i = 0; i < this.successors.length; i++) {
            if (suc === this.successors[i]) {
                found = true;
                break;
            }
        }
        if (!found) {
            this.successors.push(suc);
        }
    }

    /**
     * Adds a predecessor vertex to the predecessors list.
     * Ensures that the predecessor is not added if it already exists.
     * @param {number} pred - The index of the predecessor to add.
     */
    addPredecessor(pred) {
        let found = false;
        for (let i = 0; i < this.predecessors.length; i++) {
            if (pred === this.predecessors[i]) {
                found = true;
                break;
            }
        }
        if (!found) {
            this.predecessors.push(pred);
        }
    }
}


export {
    MTRAVizVertex
};
