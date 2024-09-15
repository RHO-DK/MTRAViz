

/**
 * -------------------------------------------------------
 * CLASS MTRAVizConnection
 * -------------------------------------------------------
 * Represents a general connection between two vertices.
 * This class handles the basic structure of a connection and its associated links.
 */
class MTRAVizConnection {
    constructor(v1, v2, type) {
        

        this.v1 = v1;
        this.v2 = v2;
        this.type = type;
        this.links = [];
    }
    
    /**
     * Adds a link vertical or horisontal to the connection.
     * @param {Object} link - The link to be added.
     */
    addLink(link) {
        this.links.push(link);
    }
}



export {
    MTRAVizConnection
}
