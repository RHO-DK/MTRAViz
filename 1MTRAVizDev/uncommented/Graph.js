
import {MTRAVizVertex} from './Vertex.js'

/**
 * graph structure implementation
 * requires the <config>uration object to retrieve unique vertex indices
 */
class MTRAVizGraph {
    constructor(config) {

        this.config = config;
        this.vertices = [];
        this.vertexMap = [];

    }

    /**
     * Getter for vertex with the given <index>
     */
    getVertex(index) {
        return this.vertexMap[index];
    }

    /**
     * Removes the vertex with the given <index> from the graph
     */
    removeVertex(index) {

        const v = this.vertexMap[index];

        if (!v) {
            console.error('MTGrV - Vertex not found for index:', index);
            return; 
        }
    
        const predecessorTokens = v.predecessors.map(predecessorIndex => this.vertexMap[predecessorIndex]?.token);

        const successorTokens = v.successors.map(successorIndex => this.vertexMap[successorIndex]?.token);

        v.successors.forEach(successorIndex => {

            this.vertexMap[successorIndex].removePredecessor(index);
        });
    

        v.predecessors.forEach(predecessorIndex => {

            this.vertexMap[predecessorIndex].removeSuccessor(index);
        });
    

        const vertexIndex = this.vertices.indexOf(v);
        if (vertexIndex !== -1) {

            this.vertices.splice(vertexIndex, 1);
        }
    
        delete this.vertexMap[index];
    }
    
    /**
     * Adds a vertex <v> to the graph
     */
    addVertex(v) {

        this.vertices.push(v);
        
        this.vertexMap[v.index] = v;

    }

    
    /**
     * Clones the graph structure
     */
    clone() {

        const cg = new MTRAVizGraph(this.config);

        this.vertices.forEach(v => {

            cg.addVertex(new MTRAVizVertex(cg, v.index, v.token));
        });

        this.vertices.forEach((v, i) => {
            const vc = cg.vertices[i];
            vc.count = v.count;

            v.sources.forEach(source => vc.sources.push(source));

            v.successors.forEach(successorIndex => {
                vc.addSuccessor(successorIndex);
                cg.vertexMap[successorIndex].addPredecessor(vc.index);
            });

            v.predecessors.forEach(predecessorIndex => {
                vc.addPredecessor(predecessorIndex);
                cg.vertexMap[predecessorIndex].addSuccessor(vc.index);
            });

        });
        return cg;
    }

    isAcyclicFromVertex(v1, v2) {

        const v = new MTRAVizVertex(this, this.config.getVertexIndex(), v1.token);
        
        this.addVertex(v);

        v.count = v1.count + v2.count;
        v.sources.push(...v1.sources, ...v2.sources);
    

        for (let i = 0; i < v1.predecessors.length; i++) {
            let predId = v1.predecessors[i];
            if (predId === v1.index || predId === v2.index) {
                predId = v.index;
            }

            v.addPredecessor(predId);
            this.vertexMap[predId].addSuccessor(v.index);
        }
    
        for (let i = 0; i < v2.predecessors.length; i++) {
            let predId = v2.predecessors[i];
            if (predId === v1.index || predId === v2.index) {
                predId = v.index;
            }
            v.addPredecessor(predId);
            this.vertexMap[predId].addSuccessor(v.index);
        }
    
        for (let i = 0; i < v1.successors.length; i++) {
            let succId = v1.successors[i];
            if (succId === v1.index || succId === v2.index) {
                succId = v.index;
            }
            v.addSuccessor(succId);
            this.vertexMap[succId].addPredecessor(v.index);
        }
    
        for (let i = 0; i < v2.successors.length; i++) {
            let succId = v2.successors[i];
            if (succId === v1.index || succId === v2.index) {
                succId = v.index;
            }
            v.addSuccessor(succId);
            this.vertexMap[succId].addPredecessor(v.index);
        }
    
        for (let i = 0; i < this.vertices.length; i++) {
            const vertex = this.vertices[i];
            vertex.visited = 0;
            vertex.limit = vertex.predecessors.length;
            for (let j = 0; j < vertex.predecessors.length; j++) {
                if (vertex.predecessors[j] === v1.index || vertex.predecessors[j] === v2.index) {
                    vertex.limit--;
                }
            }
        }
    
        v.visited = v.limit;
    
        let edges = [];
        for (let i = 0; i < v.successors.length; i++) {
            const succId = v.successors[i];
            if (succId !== v1.index && succId !== v2.index) {
                edges.push({ head: v, tail: this.getVertex(succId) });
            }
        }
    
        while (edges.length > 0) {
            let newEdges = [];

            for (let i = 0; i < edges.length; i++) {
                const e = edges[i];
                e.tail.visited++;

                if (e.tail.visited > e.tail.limit) {
                    this.removeVertex(v.index);
                    return false;
                }

                for (let j = 0; j < e.tail.successors.length; j++) {
                    const succId = e.tail.successors[j];

                    if (e.tail.visited === 1 && succId !== v1.index && succId !== v2.index) {
                        newEdges.push({ head: e.tail, tail: this.getVertex(succId) });
                    }
                }
            }
            edges = newEdges;
        }
    
        this.removeVertex(v1.index);
        this.removeVertex(v2.index);
    
        return v;
    }
    

    /**
     * Prints all edges of the graph to the console
     */
    printVertices() {

        this.vertices.forEach(v => {

            v.successors.forEach(successorIndex => {
                const successorVertex = this.getVertex(successorIndex);
                console.info(`${v.id} ---> ${successorVertex.id} : ${v.token} ---> ${successorVertex.token}`);
            });
        });
    }
}

export {
    MTRAVizGraph
};

