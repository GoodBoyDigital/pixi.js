var math = require('../math'),
    Rectangle = math.Rectangle;

/**
 * 'Builder' pattern for bounds rectangles
 * Axis-Aligned Bounding Box
 * It is not a shape! Its mutable thing, no 'EMPTY' or that kind of problems
 *
 * @class
 * @memberof PIXI
 */
function BoundsBuilder()
{
    /**
     * @member {number}
     * @default 0
     */
    this.minX = Infinity;

    /**
     * @member {number}
     * @default 0
     */
    this.minY = Infinity;

    /**
     * @member {number}
     * @default 0
     */
    this.maxX = -Infinity;

    /**
     * @member {number}
     * @default 0
     */
    this.maxY = -Infinity;
}

BoundsBuilder.prototype.constructor = BoundsBuilder;
module.exports = BoundsBuilder;

BoundsBuilder.prototype.isEmpty = function()
{
    return this.minX > this.maxX || this.minY > this.maxY;
};

BoundsBuilder.prototype.clear = function()
{
    this.minX = Infinity;
    this.minY = Infinity;
    this.maxX = -Infinity;
    this.maxY = -Infinity;
};

/**
 * Can return Rectangle.EMPTY constant, either construct new rectangle, either use your rectangle
 * It is not guaranteed that it will return tempRect
 * @param tempRect {PIXI.Rectangle} temporary object will be used if AABB is not empty
 * @returns {PIXI.Rectangle}
 */
BoundsBuilder.prototype.getRectangle = function(tempRect)
{
    if (this.minX > this.maxX || this.minY > this.maxY) {
        return Rectangle.EMPTY;
    }
    tempRect = tempRect || new Rectangle(0, 0, 1, 1);
    tempRect.x = this.minX;
    tempRect.y = this.minY;
    tempRect.width = this.maxX - this.minX;
    tempRect.height = this.maxY - this.minY;
    return tempRect;
};

/**
 * This function should be inlined when its possible
 * @param point {PIXI.Point}
 */
BoundsBuilder.prototype.addPoint = function (point)
{
    this.minX = Math.min(this.minX, point.x);
    this.maxX = Math.max(this.maxX, point.x);
    this.minY = Math.min(this.minY, point.y);
    this.maxY = Math.max(this.maxY, point.y);
};

/**
 * Adds a quad, not transformed
 * @param vertices {Float32Array}
 * @returns {PIXI.BoundsBuilder}
 */
BoundsBuilder.prototype.addQuad = function(vertices)
{
    var minX = this.minX, minY = this.minY, maxX = this.maxX, maxY = this.maxY;

    var x = vertices[0];
    var y = vertices[1];
    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    x = vertices[2];
    y = vertices[3];
    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    x = vertices[4];
    y = vertices[5];
    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    x = vertices[6];
    y = vertices[7];
    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
};

/**
 * Adds sprite frame, transformed
 * @param transform {PIXI.TransformBase}
 * @param x0 {number}
 * @param y0 {number}
 * @param x1 {number}
 * @param y1 {number}
 */
BoundsBuilder.prototype.addFrame = function(transform, x0, y0, x1, y1)
{
    var matrix = transform.worldTransform;
    var a = matrix.a, b = matrix.b, c = matrix.c, d = matrix.d, tx = matrix.tx, ty = matrix.ty;
    var minX = this.minX, minY = this.minY, maxX = this.maxX, maxY = this.maxY;

    var x = a * x0 + c * y0 + tx;
    var y = b * x0 + d * y0 + ty;
    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    x = a * x1 + c * y0 + tx;
    y = b * x1 + d * y0 + ty;
    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    x = a * x0 + c * y1 + tx;
    y = b * x0 + d * y1 + ty;
    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    x = a * x1 + c * y1 + tx;
    y = b * x1 + d * y1 + ty;
    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
};

/**
 * add an array of vertices
 * @param transform {PIXI.TransformBase}
 * @param vertices {Float32Array}
 * @param beginOffset {number}
 * @param endOffset {number}
 */
BoundsBuilder.prototype.addVertices = function(transform, vertices, beginOffset, endOffset) {
    var matrix = transform.worldTransform;
    var a = matrix.a, b = matrix.b, c = matrix.c, d = matrix.d, tx = matrix.tx, ty = matrix.ty;
    var minX = this.minX, minY = this.minY, maxX = this.maxX, maxY = this.maxY;
    for (var i = beginOffset; i < endOffset; i += 2) {
        var rawX = vertices[i], rawY = vertices[i + 1];
        var x = (a * rawX) + (c * rawY) + tx;
        var y = (d * rawY) + (b * rawX) + ty;
        minX = x < minX ? x : minX;
        minY = y < minY ? y : minY;
        maxX = x > maxX ? x : maxX;
        maxY = y > maxY ? y : maxY;
    }
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
};
