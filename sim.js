const RT3 = Math.sqrt(3);
var MIN_SCALE = 1/8;
var MAX_SCALE = 4;

const SIZE = 100; // Length of one edge of a hexagon.
const GRID_RADIUS = 128;
const CHUNK_SIZE = 256; // The size of a rendered image chunk in pixels.

const BUF_X = SIZE*RT3/2;
const BUF_Y = SIZE;

// Replace with Math.random() for a random seed.
const SEED = 1;
const defaultSimplex = new SimplexNoise(0+SEED);
const claySimplex = new SimplexNoise(1+SEED);
const siltSimplex = new SimplexNoise(2+SEED);
const sandSimplex = new SimplexNoise(3+SEED);
const gravelSimplex = new SimplexNoise(4+SEED);
const mineralSimplex = new SimplexNoise(5+SEED);

function limitScale(scale) {
    if (scale < MIN_SCALE) {
        return MIN_SCALE;
    }
    if (scale > MAX_SCALE) {
        return MAX_SCALE;
    }
    return scale;
}

function limitTranslate(translate, scale, windowLength, gridLength) {
    // Convert the gridLength into window scale.
    gridLength *= scale;
    if (windowLength >= gridLength) {
        // At the current scale, the window is longer than the grid.
        // Center the translation.
        return windowLength/2;
    }

    var maxTranslate = gridLength/2;
    var minTranslate = windowLength - maxTranslate;
    return Math.max(Math.min(translate, maxTranslate), minTranslate);
}

function remap(aVal, aMin, aMax, bMin, bMax) {
    var aRange = aMax - aMin;
    var valRatio = (aVal - aMin)/aRange;

    var bRange = bMax - bMin;
    var bVal = valRatio*bRange + bMin;
    return bVal;
}

function simplex3D(x, y, z, min, max, simplex) {
    if (simplex === undefined) {
        simplex = defaultSimplex;
    }
    // Simplex lib produces values between -1 and 1.
    var val = simplex.noise3D(x, y, z);
    return remap(val, -1, 1, min, max);
}

function axialToPx(q, r) {
    return new Point(
        SIZE * RT3 * (q + r/2),
        SIZE * 3/2 * r,
    );
}

function pxToCube(x, y) {
    var q = (RT3/3 * x - y/3) / SIZE;
    var r = (2/3 * y) / SIZE;
    return {x: q, y: -q-r, z: r};
}

function radialMag(x, y, z) {
    // Returns the magnitude of the distance of a hex cell from the center
    // of the grid, normalized to the max distance. The center cell will have
    // a magnitude of 0 while a cell at the edge of the grid will have a
    // magnitude of 1.
    return Math.max(Math.abs(x), Math.abs(y), Math.abs(z))/GRID_RADIUS;
}

class Hex {
    // constructs the hex from cube coordinates.
    constructor(x, y, z) {
        // cube coords.
        this.x = x;
        this.y = y;
        this.z = z;

        this.centerPixel = axialToPx(x, z);
        this.boxPosition = new Point(
            this.centerPixel.x - RT3/2*SIZE,
            this.centerPixel.y - SIZE,
        );
        this.vertexPixels = [
            axialToPx(x + 1/3, z - 2/3), // top
            axialToPx(x + 2/3, z - 1/3), // top-right
            axialToPx(x + 1/3, z + 1/3), // bottom-right
            axialToPx(x - 1/3, z + 2/3), // bottom
            axialToPx(x - 2/3, z + 1/3), // bottom-left
            axialToPx(x - 1/3, z - 1/3), // top-left
        ];

        // Each cell has multiple "layers" associated with the
        // natural qualities of that location:
        // - soil quality:
        //   - dimensions include gravel, clay, silt, and sand.
        //   - an even mix of clay, silt, and sand are better for
        //     soil fertility.
        //   - less gravel is better for farms while more gravel is
        //     better for forests.
        // - metal ore richness
        //   - determines the likelihood of a metal ore deposit being
        //     at a location.

        var clay = simplex3D(x/60, y/80, z/100, 0, 1, claySimplex);
        var silt = simplex3D(x/100, y/60, z/80, 0, 1, siltSimplex);
        var sand = simplex3D(x/80, y/100, z/60, 0, 1, sandSimplex);

        var clayRatio = clay/(clay+silt+sand);
        var siltRatio = silt/(clay+silt+sand);
        var sandRatio = sand/(clay+silt+sand);

        // Even ratios multiplied would give 1/27, so we remap from 0 to 1.
        // Note that this is like computing the dot-product, similar to how
        // simplex noise works to begin with.
        var soilFertility = clayRatio * siltRatio * sandRatio * 27;
        // It's kind of strange to have areas with zero fertility or 100% fertility
        // so we'll remap this to be between 20% and 90%.
        soilFertility = remap(soilFertility, 0, 1, 0.2, 0.9);

        var gravel = simplex3D(x/80, y/100, z/120, 0, 1, gravelSimplex);
        if (gravel < 0.3) { // Threshold for gravel at a location.
            gravel = 0;
        } else {
            // Remap from (threshhold, 1) to (0, 1).
            gravel = remap(gravel, 0.3, 1, 0, 1);
        }

        // More gravel makes the soil better for trees.
        var forestQuality = soilFertility * gravel;
        // But less good for other types of farming.
        var farmQuality = soilFertility - forestQuality;

        // The mineral value will be used to determine how much stone or
        // metal ore is at this location.
        var mineralValue = simplex3D(x/40, y/50, z/60, 0, 1, mineralSimplex);
        var stoneQuality = 0;
        var metalOreQuality = 0;
        if (mineralValue < 0.15) {
            // Need to shift this into a better range.
            stoneQuality = remap(mineralValue, 0.15, 0, 0.2, 0.9);
        } else if (mineralValue >= 0.85) {
            metalOreQuality = remap(mineralValue, 0.85, 1, 0.2, 0.9);
        }

        this.forestQuality = forestQuality;
        this.farmQuality = farmQuality;
        this.stoneQuality = stoneQuality;
        this.metalOreQuality = metalOreQuality;

        this.fillStyle = `rgb(${128-soilFertility*96}, ${128+soilFertility*32}, ${48})`;
    }

    cubeCoords() {
        return {x: this.x, y: this.y, z: this.z};
    }

    axialCoords() {
        // Axial coords (q, r);
        return {q: this.x, r: this.z};
    }

    radialMag() {
        return radialMag(this.x, this.y, this.z);
    }

    draw(ctx) {
        var vertices = this.vertexPixels;

        var path = new Path2D();
        path.moveTo(vertices[0].x, vertices[0].y);
        for (var i = 1; i < 6; i++) {
            path.lineTo(vertices[i].x, vertices[i].y);
        }
        path.closePath();

        ctx.fillStyle = this.fillStyle;
        ctx.fill(path);
        ctx.strokeStyle = "white";
        ctx.stroke(path);

        // Add coordinate numbers to cell.
        // ctx.fillStyle = "white";
        // var {x, y} = this.centerPixel;
        // ctx.fillText(`${this.x}, ${this.y}, ${this.z}, ${this.radialMag()}`, x-SIZE/2, y);
    }
}

class HexGridTable {
    // Implements hex grid storage via an array.
    constructor() {
        // Number of cells in a hex grid is 3(R(R+1))+1
        const R = GRID_RADIUS;
        this.cells = new Array(3*R*(R+1) + 1);

        var i = 0;
        // The first row has width R+1;
        for (var r = 0, width = R+1; r < 2*R + 1; r++) {
            var x, y;
            if (r < R) {
                x = -r;
                y = R;
            } else {
                x = -R;
                y = 2*R - r;
            }
            var z = r - R;

            for (var q = 0; q < width; q++) {
                this.cells[i++] = new Hex(x, y, z, R);
                x++, y--; // z does not change.
            }

            // A row's width increases by  R+1 to 2R+1 back to R+1.
            if (r < R) {
                width++;
            } else {
                width--;
            }
        }
    }

    _indexOf(q, r) {
        const R = GRID_RADIUS;
        if (r <= 0) {
            // Offset from beginning of cells array.
            r += R;
            q += r;
            return r*R + r*(r+1)/2 + q;
        }
        // Offset from end of cells array.
        var END = this.cells.length - 1;
        r = R-r;
        q = r-q;
        return END - (r*R + r*(r+1)/2 + q);
    }

    get(q, r) {
        return this.cells[this._indexOf(q, r)];
    }
}

function createOffscreenCanvas(width, height) {
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

class ViewChunk extends Rectangle {
    constructor(zoomLevel, chunkRect, cellsInView) {
        super(chunkRect.minX, chunkRect.minY, chunkRect.maxX, chunkRect.maxY);
        this.zoomLevel = zoomLevel;
        this.cellsInView = cellsInView;

        // Scaled length is actual rendered pixel length.
        this.scaled = this.scale(zoomLevel.scale);

        // We add an extra pixel in each directions so that the tiling
        // of chunks overlap slightly on the right and bottom edges.
        // NOTE: This should *always* be a square and *always* be equal to
        // CHUNK_SIZE+1;
        var canvasWidth = this.scaled.width()+1;
        var canvasHeight = this.scaled.height()+1
        if (canvasWidth !== canvasHeight || canvasWidth !== CHUNK_SIZE+1) {
            throw new Error(`chunk canvas dimensions: (${canvasWidth}, ${canvasHeight}) not equal to CHUNK_SIZE+1=${CHUNK_SIZE+1}`);
        }
        this.canvas = createOffscreenCanvas(canvasWidth, canvasHeight);

        this.renderReady = false;
        this.renderQueued = false;
    }

    // It would be nice if this could be done off the main thread.
    // Firefox does not currently have support for OffscreenCanvas.
    render() {
        var ctx = this.canvas.getContext("2d");
        ctx.resetTransform();
        ctx.scale(this.zoomLevel.scale, this.zoomLevel.scale);
        // Put top-left of view at top-left of canvas.
        // Note that we scale *then* translate
        ctx.translate(-this.minX, -this.minY);
        var pad = 1/this.zoomLevel.scale;
        ctx.clearRect(this.minX, this.minY, this.width()+pad, this.height()*pad);
        for (var cell of this.cellsInView) {
            cell.draw(ctx);
        }
        this.renderReady = true;
    }

    draw(relativeScaleCtx, redrawCallback) {
        if (this.cellsInView.isEmpty()) {
            return;
        }

        if (this.renderReady) {
            relativeScaleCtx.drawImage(this.canvas, this.scaled.minX, this.scaled.minY);
            return;
        }
        if (!this.renderQueued) {
            var chunk = this;
            this.renderQueued = true;
            setTimeout(function() {
                chunk.renderQueued = false;
                chunk.render();
                redrawCallback();
            });
        }
        
        // We should first try to find an already-rendered chunk at a different
        // zoom level and render that if it exists.

        // First, search up in zoom level for a lower-resolution chunk which can be cropped
        // and scaled up to stand in for this rendered chunk. Upper level chunks always cover
        // a larger world area than this level.
        var upperLevel = this.zoomLevel.up;
        while (upperLevel) {
            var upperChunk = upperLevel.getChunkAtWorldPos(this.minX+1, this.minY+1);
            if (upperChunk.renderReady) {
                // Find how far this chunk is into the upper chunk.
                // These deltas are in world dimensions (i.e., not scaled).
                // These are the *source offsets*.
                var sX = this.minX - upperChunk.minX;
                var sY = this.minY - upperChunk.minY;
                // Multiplying these deltas by the upper level's scale factor should give
                // its pixel position relative to the top-left of the upper chunk's
                // rendered image.
                sX *= upperLevel.scale;
                sY *= upperLevel.scale;
                // The source width and height will depend on the relative scale of this level
                // and the upper level. This should give some power of 2.
                var relativeScale = this.zoomLevel.scale / upperLevel.scale;
                var sWidth = upperChunk.canvas.width / relativeScale; // With extra padding pixel.
                var sHeight = upperChunk.canvas.height / relativeScale;
                relativeScaleCtx.drawImage(upperChunk.canvas, sX, sY, sWidth, sHeight, this.scaled.minX, this.scaled.minY, this.canvas.width, this.canvas.height);
                return;
            }
            upperLevel = upperLevel.up;
        }

        // Rendering is not ready. Draw a black rectangle instead.
        relativeScaleCtx.fillStyle = "black";
        relativeScaleCtx.fillRect(this.scaled.minX, this.scaled.minY, this.canvas.width, this.canvas.height);
    }

    drawOutline(relativeScaleCtx) {
        var path = new Path2D();
        path.moveTo(this.scaled.minX, this.scaled.maxY); // bottom-left
        path.lineTo(this.scaled.minX, this.scaled.minY); // top-left
        path.lineTo(this.scaled.maxX, this.scaled.minY); // top-right
        relativeScaleCtx.setLineDash([16, 16]);
        relativeScaleCtx.lineDashOffset = -8;
        relativeScaleCtx.strokeStyle = "rgb(64, 64, 64)";
        relativeScaleCtx.stroke(path);
    }
}

class ZoomLevel {
    // A zoom level renders the grid in chunks at a resolution proportional
    // to the given scale factor.
    constructor(parentZoomLevel, scale, boundingRect, hexQuadTree) {
        // Pointers to higher and lower zoom levels if they exist.
        // This means all zoom levels act as linked list nodes.
        this.up = parentZoomLevel;
        if (parentZoomLevel) {
            parentZoomLevel.down = this;
        }
        this.down = null;

        this.scale = scale;
        this.chunkSize = CHUNK_SIZE / scale;
        this.boundingRect = boundingRect;

        // Cut into chunks with width and length this.chunkSize;
        var numChunksX = Math.ceil(boundingRect.width()/this.chunkSize);
        var numChunksY = Math.ceil(boundingRect.height()/this.chunkSize);
        this.chunks = new Array(numChunksX*numChunksY);
        this.chunkTableWidth = numChunksX;
        for (var j = 0; j < numChunksY; j++) {
            var minY = boundingRect.minY + j*this.chunkSize;
            for (var i = 0; i < numChunksX; i++) {
                var minX = boundingRect.minX + i*this.chunkSize;

                var chunkViewRect = new Rectangle(minX, minY, minX+this.chunkSize, minY+this.chunkSize);
                var chunkPaddedViewRect = chunkViewRect.pad(BUF_X, BUF_Y);
        
                var cellsInView = hexQuadTree.itemsInRange(chunkPaddedViewRect);

                var chunk = new ViewChunk(this, chunkViewRect, cellsInView);
                this.putChunk(i, j, chunk);
            }
        }
    }

    // Return the rendered pixel position of the given world coordinates.
    // i.e., if we rendered the whole world at this zoom level resolution,
    // returns the pixel position of the given point relative to the center
    // of the world.
    renderedPos(x, y) {
        return new Point(x*this.scale, y*this.scale);
    }

    chunkCoord(x, y) {
        // Translate the grid's x, y coordinates to the top-left of the view.
        x -= this.boundingRect.minX;
        y -= this.boundingRect.minY;
        return [
            Math.floor(x/this.chunkSize),
            Math.floor(y/this.chunkSize),
        ];
    }

    getChunk(i, j) {
        return this.chunks[j*this.chunkTableWidth+i];
    }

    getChunkAtWorldPos(x, y) {
        var [i, j] = this.chunkCoord(x, y);
        return this.getChunk(i, j);
    }

    putChunk(i, j, chunk) {
        this.chunks[j*this.chunkTableWidth+i] = chunk;
    }

    renderAllChunks() {
        for (var chunk of this.chunks) {
            chunk.render();
        }
    }

    draw(relativeScaleCtx, viewRect, redrawCallback) {
        var minX = Math.max(viewRect.minX, this.boundingRect.minX);
        var maxX = Math.min(viewRect.maxX, this.boundingRect.maxX);
        var minY = Math.max(viewRect.minY, this.boundingRect.minY);
        var maxY = Math.min(viewRect.maxY, this.boundingRect.maxY);

        var chunks = new LinkedList();
        var [minI, minJ] = this.chunkCoord(minX, minY);
        var j = minJ;
        do {
            var i = minI;
            do {
                var chunk = this.getChunk(i, j);
                chunks.append(chunk);
                i++;
            } while (chunk.maxX < maxX);
            j++;
        } while (chunk.maxY < maxY);

        // Sort the chunks by distance to the center of the view.
        var i = 0;
        var orderedChunks = new Array(chunks.length);
        var viewCenterX = viewRect.minX + viewRect.width()/2;
        var viewCenterY = viewRect.minY + viewRect.height()/2;
        for (var chunk of chunks) {
            var chunkX = chunk.minX + chunk.width()/2;
            var chunkY = chunk.minY + chunk.height()/2;
            var dx = chunkX - viewCenterX;
            var dy = chunkY - viewCenterY;
            orderedChunks[i++] = {
                distanceSqrd: dx*dx + dy*dy,
                chunk: chunk,
            };
        }
        orderedChunks.sort(function(a, b) {
            return a.distanceSqrd - b.distanceSqrd;
        });

        for (var item of orderedChunks) {
            item.chunk.draw(relativeScaleCtx, redrawCallback);
        }
        // Un-comment block below to draw chunk outlines.
        // for (var item of orderedChunks) {
        //     item.chunk.drawOutline(relativeScaleCtx);
        // }
    }
}

class Simulation {
    constructor (canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Translation values are *always* in canvas length.
        this.translateX = window.innerWidth/2;
        this.translateY = window.innerHeight/2;

        this.hexGrid = new HexGridTable(GRID_RADIUS);

        var maxX = RT3 * SIZE * (GRID_RADIUS+1);
        var maxY = 3/2 * SIZE * (GRID_RADIUS+1);
        this.boundingRect = new Rectangle(-maxX, -maxY, maxX, maxY);
        
        var hexQuadTree = new QuadTree(-maxX, -maxY, maxX, maxY);
        for (var cell of this.hexGrid.cells) {
            hexQuadTree.insert(cell.centerPixel, cell);
        }

        // The zoom level scales follow the formula scale = Math.pow(2, idx-5) where x is the
        // index into the zoom levels array.
        // The inverse is a function which given a scale gives the index to
        // the zoom levels array:  idx = Math.round(Math.log2(scale)+4))
        this.zoomLevels = new Array(8);
        var upperLevel = null;
        for (var i = 0; i < this.zoomLevels.length; i++) {
            var scale = this.getZoomLevelScale(i);
            var zoomLevel = new ZoomLevel(upperLevel, scale, this.boundingRect, hexQuadTree);
            this.zoomLevels[i] = zoomLevel;
            upperLevel = zoomLevel;
        }

        this.minZoomLevel = this.zoomLevels[0];
        this.maxZoomLevel = this.zoomLevels[this.zoomLevels.length-1];
        this.minZoomLevel.renderAllChunks();

        // Scale value tracks the scale between canvas length
        // and world length.
        //   canvasLength = worldLength * scale;
        //   worldLength = canvasLength / scale;
        this.scale = 1/8;
        // Relative Scale value tracks the relative scale between
        // the current rendering zoom level and the scale value
        // above.
        //   scale = relativeScale * zoomLevel.scale;
        //   relativeScale = scale / zoomLevel.scale;
        // Sets the current zoom level and relative scale.
        this.adjustZoomLevel();
    }

    getZoomLevelScale(zoomLevelIndex) {
        return Math.pow(2, zoomLevelIndex-5);
    }

    getZoomLevelIndex(scale) {
        return Math.round(Math.log2(scale)+5);
    }

    adjustZoomLevel() {
        if (this.scale < this.minZoomLevel.scale) {
            this.currentZoomLevel = this.zoomLevels[0];
        } else if (this.scale < this.maxZoomLevel.scale) {
            var zoomLevelIndex = this.getZoomLevelIndex(this.scale);
            this.currentZoomLevel = this.zoomLevels[zoomLevelIndex];
        } else {
            this.currentZoomLevel = this.zoomLevels[this.zoomLevels.length-1];
        }

        this.relativeScale = this.scale / this.currentZoomLevel.scale;
    }

    // Returns the current view in canvas dimensions, i.e., in pixels.
    getCurrentCanvasViewRect() {
        var x0 = -this.translateX;
        var y0 = -this.translateY;
        var x1 = x0 + this.canvas.width;
        var y1 = y0 + this.canvas.height;

        return new Rectangle(x0, y0, x1, y1);
    }

    // Returns the rectangle which should currently be viewable in
    // world dimensions.
    getCurrentWorldViewRect() {
        return this.getCurrentCanvasViewRect().scale(1/this.scale);
    }

    // Returns the rectangle which should currently be viewable in
    // current zoom level dimensions.
    getCurrentZoomLevelViewRect() {
        return this.getCurrentCanvasViewRect().scale(1/this.relativeScale);
    }

    draw(redrawCallback) {
        this.clearCurrentZoomLevelView()
        // Pad the current view by half a chunk.
        var padding = this.currentZoomLevel.chunkSize/2;
        var view = this.getCurrentWorldViewRect().pad(padding, padding);
        this.currentZoomLevel.draw(this.ctx, view, redrawCallback);
    }

    clearCurrentZoomLevelView() {
        var view = this.getCurrentZoomLevelViewRect();
        this.ctx.clearRect(view.minX, view.minY, view.width(), view.height());
    }

    resetTransform() {
        this.ctx.resetTransform();
        this.ctx.translate(this.translateX, this.translateY);
        this.ctx.scale(this.relativeScale, this.relativeScale);
    }

    resize() {
        var width = window.innerWidth;
        var height = window.innerHeight;
        document.body.style.width = width + "px";
        document.body.style.height = height + "px";
        this.canvas.width = width;
        this.canvas.height = height;

        MIN_SCALE = Math.min(height/this.boundingRect.height(), width/this.boundingRect.width());
        MAX_SCALE = Math.min(height/(3*SIZE), width/(3*RT3/2*SIZE));
        this.scale = limitScale(this.scale);
        this.adjustZoomLevel();

        this.resetTransform();
    }

    rescale(x, y, mag) {
        // Find point under cursor.
        var offsetX = (x - this.translateX)/this.scale;
        var offsetY = (y - this.translateY)/this.scale;

        var newScale = limitScale(this.scale*(1 - 0.01*mag));
        var deltaScale = newScale - this.scale;

        this.translateX += -(offsetX * deltaScale);
        this.translateY += -(offsetY * deltaScale);
        this.scale = newScale;
        this.adjustZoomLevel();

        this.translateX = limitTranslate(this.translateX, this.scale, window.innerWidth, this.boundingRect.width());
        this.translateY = limitTranslate(this.translateY, this.scale, window.innerHeight, this.boundingRect.height());

        this.resetTransform();
    }

    translate(dx, dy) {
        this.translateX += dx;
        this.translateY += dy;

        this.translateX = limitTranslate(this.translateX, this.scale, window.innerWidth, this.boundingRect.width());
        this.translateY = limitTranslate(this.translateY, this.scale, window.innerHeight, this.boundingRect.height());

        this.resetTransform();
    }

    pointerDown(e, onMove) {
        var lastX = e.clientX;
        var lastY = e.clientY;
        this.canvas.setPointerCapture(e.pointerId);

        const sim = this;
        var onPointerMove = function(e) {
            sim.translate(e.clientX - lastX, e.clientY - lastY);
            lastX = e.clientX;
            lastY = e.clientY;
            onMove();
        };

        var onPointerUp = function(e) {
            sim.canvas.releasePointerCapture(e.pointerId);
            sim.canvas.removeEventListener("pointermove", onPointerMove);
            sim.canvas.removeEventListener("pointerup", onPointerUp);
        };

        this.canvas.addEventListener("pointermove", onPointerMove);
        this.canvas.addEventListener("pointerup", onPointerUp);
    }

    run() {
        const sim = this;

        var drawQueued = false;
        // draw() requests an animation frame if one is not
        // already queued.
        var draw = function() {
            if (drawQueued) {
                // A draw is already scheduled.
                return;
            }

            drawQueued = true;
            requestAnimationFrame(function(ts) {
                drawQueued = false;
                sim.draw(draw);
            });
        };

        window.addEventListener("resize", function() {
            sim.resize();
            draw();
        });

        this.canvas.addEventListener("wheel", function(e) {
            e.preventDefault();
            sim.rescale(e.clientX, e.clientY, e.deltaY);
            draw();
        });

        this.canvas.addEventListener("pointerdown", function(e) {
            sim.pointerDown(e, draw);
        });

        // Report where in the world coordinates the click is.
        // this.canvas.addEventListener("click", function(e) {
        //     var x = (e.clientX - sim.translateX)/sim.scale;
        //     var y = (e.clientY - sim.translateY)/sim.scale;
        //     console.log(`click at (${x}, ${y})`);
        // });

        this.resize();
        draw();
    }
}