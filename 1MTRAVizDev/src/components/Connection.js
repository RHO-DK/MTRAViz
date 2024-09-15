//PLEASE NOTE THIS IS ORIGINAL WORK BY STEFAN JANICKE SEE ATTACHED LICENCE AND NOTE THAT MANY SECTIONS HAVE BEEN COPIED OR ONLY SLIGHTLY MODIFIED


/**
 * -------------------------------------------------------
 * CLASS MTRAVizConnection
 * -------------------------------------------------------
 * Represents a general connection between two vertices.
 * This class handles the basic structure of a connection and its associated links.
 */
class MTRAVizConnection {
     /**
     * Create a connection between two vertices.
     * @param {Object} v1 - The first vertex of the connection.
     * @param {Object} v2 - The second vertex of the connection.
     * @param {number} type - The type of connection
     */
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

// Export the MTRAVizConnection class

export {
    MTRAVizConnection
}
