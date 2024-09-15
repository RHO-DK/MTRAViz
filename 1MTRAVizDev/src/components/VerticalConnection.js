//PLEASE NOTE THIS IS ORIGINAL WORK BY STEFAN JANICKE SEE ATTACHED LICENCE AND NOTE THAT MANY SECTIONS HAVE BEEN COPIED OR ONLY SLIGHTLY MODIFIED
/**
 * -------------------------------------------------------
 * CLASS MTRAVizVerticalConnection 
 * -------------------------------------------------------
 * Represents a vertical connection.
 * Following a path, y1 is closer to the source vertex and y2 is closer to the sink vertex.
 */
class MTRAVizVerticalConnection {

    /**
     * Create a VETICAL connection between two vertices.
     * @param {Object} v1 - The first vertex of the connection.
     * @param {Object} v2 - The second vertex of the connection.
     * @param {string} type - The type of connection (string or number - sink or source)
     */
    constructor(v1, v2, type) {

        this.v1 = v1;
        this.v2 = v2;
        this.type = type;
    }

    /**
     * Positions the vertical connection.
     * @param {number} x - The x coordinate.
     * @param {number} y1 - The y coordinate closer to the source.
     * @param {number} y2 - The y coordinate closer to the sink.
     */
    position(x, y1, y2) {
        this.x1 = x;
        this.x2 = x;
        this.y1 = y1;
        this.y2 = y2;
    }

    /**
     * Returns the minimum y value.
     * @returns {number} - The minimum y coordinate.
     */
    yMin() {
        return Math.min(this.y1, this.y2);
    }

    /**
     * Returns the maximum y value.
     * @returns {number} - The maximum y coordinate.
     */
    yMax() {
        return Math.max(this.y1, this.y2);
    }
}

// Export the MTRAVizVerticalConnection class

export {
    MTRAVizVerticalConnection
}

