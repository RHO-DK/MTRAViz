
/**
 * -------------------------------------------------------
 * CLASS MTRAVizVerticalConnection 
 * -------------------------------------------------------
 * Represents a vertical connection.
 * Following a path, y1 is closer to the source vertex and y2 is closer to the sink vertex.
 */
class MTRAVizVerticalConnection {
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


export {
    MTRAVizVerticalConnection
}

