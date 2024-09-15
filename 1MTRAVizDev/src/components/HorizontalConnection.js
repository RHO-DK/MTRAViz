//PLEASE NOTE THIS IS ORIGINAL WORK BY STEFAN JANICKE SEE ATTACHED LICENCE AND NOTE THAT MANY SECTIONS HAVE BEEN COPIED OR ONLY SLIGHTLY MODIFIED

/**
 * -------------------------------------------------------
 * CLASS MTRAVizHorizontalConnection 
 * -------------------------------------------------------
 * Represents a horizontal connection.
 * Following a path, x1 is closer to the source vertex and x2 is closer to the sink vertex.
 */
class MTRAVizHorizontalConnection {

    /**
     * Create a HORISONTAL connection between two vertices.
     * @param {Object} v1 - The first vertex of the connection.
     * @param {Object} v2 - The second vertex of the connection.
     * @param {number} type - The type of connection can be 0, -1, 3 - se main method, mtraviz class
     */
    constructor(v1, v2, type) {

        this.v1 = v1;
        this.v2 = v2;
        this.type = type;
    }

    /**
     * Positions the horizontal connection.
     * @param {number} x1 - The x coordinate closer to the source.
     * @param {number} x2 - The x coordinate closer to the sink.
     * @param {number} y - The y coordinate for the connection.
     */
    position(x1, x2, y) {
        this.x1 = x1;
        this.x2 = x2;
        this.y1 = y;
        this.y2 = y;
    }
}

// Export the MTRAVizHorizontalConnection class

export {
    MTRAVizHorizontalConnection
}

