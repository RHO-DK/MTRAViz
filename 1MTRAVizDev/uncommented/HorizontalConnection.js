
/**
 * -------------------------------------------------------
 * CLASS MTRAVizHorizontalConnection 
 * -------------------------------------------------------
 * Represents a horizontal connection.
 * Following a path, x1 is closer to the source vertex and x2 is closer to the sink vertex.
 */
class MTRAVizHorizontalConnection {
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



export {
    MTRAVizHorizontalConnection
}

