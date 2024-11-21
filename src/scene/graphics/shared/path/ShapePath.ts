// a shape lets you build out a shape with lines and curves and primitives..

import { Circle } from '../../../../maths/shapes/Circle';
import { Ellipse } from '../../../../maths/shapes/Ellipse';
import { Polygon } from '../../../../maths/shapes/Polygon';
import { Rectangle } from '../../../../maths/shapes/Rectangle';
import { RoundedRectangle } from '../../../../maths/shapes/RoundedRectangle';
import { Bounds } from '../../../container/bounds/Bounds';
import { buildAdaptiveBezier } from '../buildCommands/buildAdaptiveBezier';
import { buildAdaptiveQuadratic } from '../buildCommands/buildAdaptiveQuadratic';
import { buildArc } from '../buildCommands/buildArc';
import { buildArcTo } from '../buildCommands/buildArcTo';
import { buildArcToSvg } from '../buildCommands/buildArcToSvg';
import { roundedShapeArc, roundedShapeQuadraticCurve } from './roundShape';

import type { Matrix } from '../../../../maths/matrix/Matrix';
import type { PointData } from '../../../../maths/point/PointData';
import type { ShapePrimitive } from '../../../../maths/shapes/ShapePrimitive';
import type { GraphicsPath } from './GraphicsPath';
import type { RoundedPoint } from './roundShape';

const tempRectangle = new Rectangle();

export type ShapePrimitiveWithHoles = {
    shape: ShapePrimitive,
    transform?: Matrix,
    holes?: ShapePrimitiveWithHoles[]
};

/**
 * The `ShapePath` class acts as a bridge between high-level drawing commands
 * and the lower-level `GraphicsContext` rendering engine.
 * It translates drawing commands, such as those for creating lines, arcs, ellipses, rectangles, and complex polygons, into a
 * format that can be efficiently processed by a `GraphicsContext`. This includes handling path starts,
 * ends, and transformations for shapes.
 *
 * It is used internally by `GraphicsPath` to build up the path.
 * @memberof scene
 */
export class ShapePath
{
    /** The list of shape primitives that make up the path. */
    public shapePrimitives: ShapePrimitiveWithHoles[] = [];
    private _currentPoly: Polygon | null = null;
    private readonly _graphicsPath2D: GraphicsPath;
    private readonly _bounds = new Bounds();
    public readonly signed: boolean;

    constructor(graphicsPath2D: GraphicsPath)
    {
        this._graphicsPath2D = graphicsPath2D;
        this.signed = graphicsPath2D.checkForHoles;
    }

    /**
     * Sets the starting point for a new sub-path. Any subsequent drawing commands are considered part of this path.
     * @param x - The x-coordinate for the starting point.
     * @param y - The y-coordinate for the starting point.
     * @returns The instance of the current object for chaining.
     */
    public moveTo(x: number, y: number): this
    {
        this.startPoly(x, y);

        return this;
    }

    /**
     * Connects the current point to a new point with a straight line. This method updates the current path.
     * @param x - The x-coordinate of the new point to connect to.
     * @param y - The y-coordinate of the new point to connect to.
     * @returns The instance of the current object for chaining.
     */
    public lineTo(x: number, y: number): this
    {
        this._ensurePoly();

        const points = this._currentPoly.points;

        const fromX = points[points.length - 2];
        const fromY = points[points.length - 1];

        if (fromX !== x || fromY !== y)
        {
            points.push(x, y);
        }

        return this;
    }

    /**
     * Adds an arc to the path. The arc is centered at (x, y)
     *  position with radius `radius` starting at `startAngle` and ending at `endAngle`.
     * @param x - The x-coordinate of the arc's center.
     * @param y - The y-coordinate of the arc's center.
     * @param radius - The radius of the arc.
     * @param startAngle - The starting angle of the arc, in radians.
     * @param endAngle - The ending angle of the arc, in radians.
     * @param counterclockwise - Specifies whether the arc should be drawn in the anticlockwise direction. False by default.
     * @returns The instance of the current object for chaining.
     */
    public arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise: boolean): this
    {
        // TODO - if its 360 degrees.. make it a circle object?

        this._ensurePoly(false);

        const points = this._currentPoly.points;

        buildArc(points, x, y, radius, startAngle, endAngle, counterclockwise);

        return this;
    }

    /**
     * Adds an arc to the path with the arc tangent to the line joining two specified points.
     * The arc radius is specified by `radius`.
     * @param x1 - The x-coordinate of the first point.
     * @param y1 - The y-coordinate of the first point.
     * @param x2 - The x-coordinate of the second point.
     * @param y2 - The y-coordinate of the second point.
     * @param radius - The radius of the arc.
     * @returns The instance of the current object for chaining.
     */
    public arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): this
    {
        this._ensurePoly();

        const points = this._currentPoly.points;

        buildArcTo(points, x1, y1, x2, y2, radius);

        return this;
    }

    /**
     * Adds an SVG-style arc to the path, allowing for elliptical arcs based on the SVG spec.
     * @param rx - The x-radius of the ellipse.
     * @param ry - The y-radius of the ellipse.
     * @param xAxisRotation - The rotation of the ellipse's x-axis relative
     * to the x-axis of the coordinate system, in degrees.
     * @param largeArcFlag - Determines if the arc should be greater than or less than 180 degrees.
     * @param sweepFlag - Determines if the arc should be swept in a positive angle direction.
     * @param x - The x-coordinate of the arc's end point.
     * @param y - The y-coordinate of the arc's end point.
     * @returns The instance of the current object for chaining.
     */
    public arcToSvg(
        rx: number, ry: number,
        xAxisRotation: number, largeArcFlag: number, sweepFlag: number,
        x: number, y: number
    ): this
    {
        const points = this._currentPoly.points;

        // this needs to work on both canvas and GPU backends so might want to move this to the Graphics2D path..
        buildArcToSvg(
            points,
            this._currentPoly.lastX,
            this._currentPoly.lastY,
            x,
            y,
            rx,
            ry,
            xAxisRotation,
            largeArcFlag,
            sweepFlag,
        );

        return this;
    }

    /**
     * Adds a cubic Bezier curve to the path.
     * It requires three points: the first two are control points and the third one is the end point.
     * The starting point is the last point in the current path.
     * @param cp1x - The x-coordinate of the first control point.
     * @param cp1y - The y-coordinate of the first control point.
     * @param cp2x - The x-coordinate of the second control point.
     * @param cp2y - The y-coordinate of the second control point.
     * @param x - The x-coordinate of the end point.
     * @param y - The y-coordinate of the end point.
     * @param smoothness - Optional parameter to adjust the smoothness of the curve.
     * @returns The instance of the current object for chaining.
     */
    public bezierCurveTo(
        cp1x: number, cp1y: number, cp2x: number, cp2y: number,
        x: number, y: number,
        smoothness?: number
    ): this
    {
        this._ensurePoly();

        const currentPoly = this._currentPoly;

        // ensure distance from last point to first control point is not too small

        // TODO - make this a plugin that people can override..
        buildAdaptiveBezier(
            this._currentPoly.points,
            currentPoly.lastX, currentPoly.lastY,
            cp1x, cp1y, cp2x, cp2y, x, y,
            smoothness,
        );

        return this;
    }

    /**
     * Adds a quadratic curve to the path. It requires two points: the control point and the end point.
     * The starting point is the last point in the current path.
     * @param cp1x - The x-coordinate of the control point.
     * @param cp1y - The y-coordinate of the control point.
     * @param x - The x-coordinate of the end point.
     * @param y - The y-coordinate of the end point.
     * @param smoothing - Optional parameter to adjust the smoothness of the curve.
     * @returns The instance of the current object for chaining.
     */
    public quadraticCurveTo(cp1x: number, cp1y: number, x: number, y: number, smoothing?: number): this
    {
        this._ensurePoly();

        const currentPoly = this._currentPoly;

        // ensure distance from last point to first control point is not too small

        // TODO - make this a plugin that people can override..
        buildAdaptiveQuadratic(
            this._currentPoly.points,
            currentPoly.lastX, currentPoly.lastY,
            cp1x, cp1y, x, y,
            smoothing,
        );

        return this;
    }

    /**
     * Closes the current path by drawing a straight line back to the start.
     * If the shape is already closed or there are no points in the path, this method does nothing.
     * @returns The instance of the current object for chaining.
     */
    public closePath(): this
    {
        this.endPoly(true);

        return this;
    }

    /**
     * Adds another path to the current path. This method allows for the combination of multiple paths into one.
     * @param path - The `GraphicsPath` object representing the path to add.
     * @param transform - An optional `Matrix` object to apply a transformation to the path before adding it.
     * @returns The instance of the current object for chaining.
     */
    public addPath(path: GraphicsPath, transform?: Matrix): this
    {
        this.endPoly();

        // Only clone if we need to transform
        if (transform && !transform.isIdentity())
        {
            path = path.clone(true);
            path.transform(transform);
        }

        const shapePrimitives = this.shapePrimitives;
        const start = shapePrimitives.length;

        for (let i = 0; i < path.instructions.length; i++)
        {
            const instruction = path.instructions[i];

            this[instruction.action](...(instruction.data as [never, never, never, never, never, never, never]));
        }

        // This section processes holes in polygons by checking if any polygon is contained within another.
        // If a polygon is found to be inside another polygon (mainShape), it's treated as a hole.
        // The hole polygon is removed from the main shapePrimitives array and added to the holes array
        // of the containing polygon. This allows for proper rendering of shapes with holes.
        if (path.checkForHoles && shapePrimitives.length - start > 1)
        {
            let mainShape = null;

            // Process in place instead of creating a removal array
            for (let i = start; i < shapePrimitives.length; i++)
            {
                const shapePrimitive = shapePrimitives[i];

                if (shapePrimitive.shape.type === 'polygon')
                {
                    const polygon = shapePrimitive.shape as Polygon;
                    const mainPolygon = mainShape?.shape as Polygon;

                    if (mainPolygon && mainPolygon.containsPolygon(polygon))
                    {
                        // Initialize holes array only when needed
                        mainShape.holes ||= [];
                        mainShape.holes.push(shapePrimitive);

                        // Remove the hole by moving elements left
                        shapePrimitives.copyWithin(i, i + 1);
                        shapePrimitives.length--;
                        i--;
                    }
                    else
                    {
                        mainShape = shapePrimitive;
                    }
                }
            }
        }

        return this;
    }

    /**
     * Finalizes the drawing of the current path. Optionally, it can close the path.
     * @param closePath - A boolean indicating whether to close the path after finishing. False by default.
     */
    public finish(closePath = false)
    {
        this.endPoly(closePath);
    }

    /**
     * Draws a rectangle shape. This method adds a new rectangle path to the current drawing.
     * @param x - The x-coordinate of the top-left corner of the rectangle.
     * @param y - The y-coordinate of the top-left corner of the rectangle.
     * @param w - The width of the rectangle.
     * @param h - The height of the rectangle.
     * @param transform - An optional `Matrix` object to apply a transformation to the rectangle.
     * @returns The instance of the current object for chaining.
     */
    public rect(x: number, y: number, w: number, h: number, transform?: Matrix): this
    {
        this.drawShape(new Rectangle(x, y, w, h), transform);

        return this;
    }

    /**
     * Draws a circle shape. This method adds a new circle path to the current drawing.
     * @param x - The x-coordinate of the center of the circle.
     * @param y - The y-coordinate of the center of the circle.
     * @param radius - The radius of the circle.
     * @param transform - An optional `Matrix` object to apply a transformation to the circle.
     * @returns The instance of the current object for chaining.
     */
    public circle(x: number, y: number, radius: number, transform?: Matrix): this
    {
        this.drawShape(new Circle(x, y, radius), transform);

        return this;
    }

    /**
     * Draws a polygon shape. This method allows for the creation of complex polygons by specifying a sequence of points.
     * @param points - An array of numbers, or or an array of PointData objects eg [{x,y}, {x,y}, {x,y}]
     * representing the x and y coordinates of the polygon's vertices, in sequence.
     * @param close - A boolean indicating whether to close the polygon path. True by default.
     * @param transform - An optional `Matrix` object to apply a transformation to the polygon.
     * @returns The instance of the current object for chaining.
     */
    public poly(points: number[] | PointData[], close?: boolean, transform?: Matrix): this
    {
        const polygon = new Polygon(points);

        polygon.closePath = close;

        this.drawShape(polygon, transform);

        return this;
    }

    /**
     * Draws a regular polygon with a specified number of sides. All sides and angles are equal.
     * @param x - The x-coordinate of the center of the polygon.
     * @param y - The y-coordinate of the center of the polygon.
     * @param radius - The radius of the circumscribed circle of the polygon.
     * @param sides - The number of sides of the polygon. Must be 3 or more.
     * @param rotation - The rotation angle of the polygon, in radians. Zero by default.
     * @param transform - An optional `Matrix` object to apply a transformation to the polygon.
     * @returns The instance of the current object for chaining.
     */
    public regularPoly(x: number, y: number, radius: number, sides: number, rotation = 0, transform?: Matrix): this
    {
        sides = Math.max(sides | 0, 3);
        const startAngle = (-1 * Math.PI / 2) + rotation;
        const delta = (Math.PI * 2) / sides;
        const polygon = [];

        for (let i = 0; i < sides; i++)
        {
            const angle = (i * delta) + startAngle;

            polygon.push(
                x + (radius * Math.cos(angle)),
                y + (radius * Math.sin(angle))
            );
        }

        this.poly(polygon, true, transform);

        return this;
    }

    /**
     * Draws a polygon with rounded corners.
     * Similar to `regularPoly` but with the ability to round the corners of the polygon.
     * @param x - The x-coordinate of the center of the polygon.
     * @param y - The y-coordinate of the center of the polygon.
     * @param radius - The radius of the circumscribed circle of the polygon.
     * @param sides - The number of sides of the polygon. Must be 3 or more.
     * @param corner - The radius of the rounding of the corners.
     * @param rotation - The rotation angle of the polygon, in radians. Zero by default.
     * @param smoothness - Optional parameter to adjust the smoothness of the rounding.
     * @returns The instance of the current object for chaining.
     */
    public roundPoly(
        x: number, y: number,
        radius: number,
        sides: number, corner: number,
        rotation = 0,
        smoothness?: number,
    ): this
    {
        sides = Math.max((sides | 0), 3);

        if (corner <= 0)
        {
            return this.regularPoly(x, y, radius, sides, rotation);
        }

        const sideLength = (radius * Math.sin(Math.PI / sides)) - 0.001;

        corner = Math.min(corner, sideLength);

        const startAngle = (-1 * Math.PI / 2) + rotation;
        const delta = (Math.PI * 2) / sides;
        const internalAngle = ((sides - 2) * Math.PI) / sides / 2;

        for (let i = 0; i < sides; i++)
        {
            const angle = (i * delta) + startAngle;
            const x0 = x + (radius * Math.cos(angle));
            const y0 = y + (radius * Math.sin(angle));
            const a1 = angle + (Math.PI) + internalAngle;
            const a2 = angle - (Math.PI) - internalAngle;
            const x1 = x0 + (corner * Math.cos(a1));
            const y1 = y0 + (corner * Math.sin(a1));
            const x3 = x0 + (corner * Math.cos(a2));
            const y3 = y0 + (corner * Math.sin(a2));

            if (i === 0)
            {
                this.moveTo(x1, y1);
            }
            else
            {
                this.lineTo(x1, y1);
            }
            this.quadraticCurveTo(x0, y0, x3, y3, smoothness);
        }

        return this.closePath();
    }

    /**
     * Draws a shape with rounded corners. This function supports custom radius for each corner of the shape.
     * Optionally, corners can be rounded using a quadratic curve instead of an arc, providing a different aesthetic.
     * @param points - An array of `RoundedPoint` representing the corners of the shape to draw.
     * A minimum of 3 points is required.
     * @param radius - The default radius for the corners.
     * This radius is applied to all corners unless overridden in `points`.
     * @param useQuadratic - If set to true, rounded corners are drawn using a quadraticCurve
     *  method instead of an arc method. Defaults to false.
     * @param smoothness - Specifies the smoothness of the curve when `useQuadratic` is true.
     * Higher values make the curve smoother.
     * @returns The instance of the current object for chaining.
     */
    public roundShape(points: RoundedPoint[], radius: number, useQuadratic = false, smoothness?: number): this
    {
        if (points.length < 3)
        {
            return this;
        }

        if (useQuadratic)
        {
            roundedShapeQuadraticCurve(this, points, radius, smoothness);
        }
        else
        {
            roundedShapeArc(this, points, radius);
        }

        return this.closePath();
    }

    /**
     * Draw Rectangle with fillet corners. This is much like rounded rectangle
     * however it support negative numbers as well for the corner radius.
     * @param x - Upper left corner of rect
     * @param y - Upper right corner of rect
     * @param width - Width of rect
     * @param height - Height of rect
     * @param fillet - accept negative or positive values
     */
    public filletRect(x: number, y: number, width: number, height: number, fillet: number): this
    {
        if (fillet === 0)
        {
            return this.rect(x, y, width, height);
        }

        const maxFillet = Math.min(width, height) / 2;
        const inset = Math.min(maxFillet, Math.max(-maxFillet, fillet));
        const right = x + width;
        const bottom = y + height;
        const dir = inset < 0 ? -inset : 0;
        const size = Math.abs(inset);

        return this
            .moveTo(x, y + size)
            .arcTo(x + dir, y + dir, x + size, y, size)
            .lineTo(right - size, y)
            .arcTo(right - dir, y + dir, right, y + size, size)
            .lineTo(right, bottom - size)
            .arcTo(right - dir, bottom - dir, x + width - size, bottom, size)
            .lineTo(x + size, bottom)
            .arcTo(x + dir, bottom - dir, x, bottom - size, size)
            .closePath();
    }

    /**
     * Draw Rectangle with chamfer corners. These are angled corners.
     * @param x - Upper left corner of rect
     * @param y - Upper right corner of rect
     * @param width - Width of rect
     * @param height - Height of rect
     * @param chamfer - non-zero real number, size of corner cutout
     * @param transform
     */
    public chamferRect(x: number, y: number, width: number, height: number, chamfer: number, transform?: Matrix): this
    {
        if (chamfer <= 0)
        {
            return this.rect(x, y, width, height);
        }

        const inset = Math.min(chamfer, Math.min(width, height) / 2);
        const right = x + width;
        const bottom = y + height;
        const points = [
            x + inset, y,
            right - inset, y,
            right, y + inset,
            right, bottom - inset,
            right - inset, bottom,
            x + inset, bottom,
            x, bottom - inset,
            x, y + inset,
        ];

        // Remove overlapping points
        for (let i = points.length - 1; i >= 2; i -= 2)
        {
            if (points[i] === points[i - 2] && points[i - 1] === points[i - 3])
            {
                points.splice(i - 1, 2);
            }
        }

        return this.poly(points, true, transform);
    }

    /**
     * Draws an ellipse at the specified location and with the given x and y radii.
     * An optional transformation can be applied, allowing for rotation, scaling, and translation.
     * @param x - The x-coordinate of the center of the ellipse.
     * @param y - The y-coordinate of the center of the ellipse.
     * @param radiusX - The horizontal radius of the ellipse.
     * @param radiusY - The vertical radius of the ellipse.
     * @param transform - An optional `Matrix` object to apply a transformation to the ellipse. This can include rotations.
     * @returns The instance of the current object for chaining.
     */
    public ellipse(x: number, y: number, radiusX: number, radiusY: number, transform?: Matrix): this
    {
        // TODO apply rotation to transform...

        this.drawShape(new Ellipse(x, y, radiusX, radiusY), transform);

        return this;
    }

    /**
     * Draws a rectangle with rounded corners.
     * The corner radius can be specified to determine how rounded the corners should be.
     * An optional transformation can be applied, which allows for rotation, scaling, and translation of the rectangle.
     * @param x - The x-coordinate of the top-left corner of the rectangle.
     * @param y - The y-coordinate of the top-left corner of the rectangle.
     * @param w - The width of the rectangle.
     * @param h - The height of the rectangle.
     * @param radius - The radius of the rectangle's corners. If not specified, corners will be sharp.
     * @param transform - An optional `Matrix` object to apply a transformation to the rectangle.
     * @returns The instance of the current object for chaining.
     */
    public roundRect(x: number, y: number, w: number, h: number, radius?: number, transform?: Matrix): this
    {
        this.drawShape(new RoundedRectangle(x, y, w, h, radius), transform);

        return this;
    }

    /**
     * Draws a given shape on the canvas.
     * This is a generic method that can draw any type of shape specified by the `ShapePrimitive` parameter.
     * An optional transformation matrix can be applied to the shape, allowing for complex transformations.
     * @param shape - The shape to draw, defined as a `ShapePrimitive` object.
     * @param matrix - An optional `Matrix` for transforming the shape. This can include rotations,
     * scaling, and translations.
     * @returns The instance of the current object for chaining.
     */
    public drawShape(shape: ShapePrimitive, matrix?: Matrix): this
    {
        this.endPoly();

        this.shapePrimitives.push({ shape, transform: matrix });

        return this;
    }

    /**
     * Starts a new polygon path from the specified starting point.
     * This method initializes a new polygon or ends the current one if it exists.
     * @param x - The x-coordinate of the starting point of the new polygon.
     * @param y - The y-coordinate of the starting point of the new polygon.
     * @returns The instance of the current object for chaining.
     */
    public startPoly(x: number, y: number): this
    {
        let currentPoly = this._currentPoly;

        if (currentPoly)
        {
            this.endPoly();
        }

        currentPoly = new Polygon();

        currentPoly.points.push(x, y);

        this._currentPoly = currentPoly;

        return this;
    }

    /**
     * Ends the current polygon path. If `closePath` is set to true,
     * the path is closed by connecting the last point to the first one.
     * This method finalizes the current polygon and prepares it for drawing or adding to the shape primitives.
     * @param closePath - A boolean indicating whether to close the polygon by connecting the last point
     *  back to the starting point. False by default.
     * @returns The instance of the current object for chaining.
     */
    public endPoly(closePath = false): this
    {
        const shape = this._currentPoly;

        if (shape && shape.points.length > 2)
        {
            shape.closePath = closePath;

            this.shapePrimitives.push({ shape });
        }

        this._currentPoly = null;

        return this;
    }

    private _ensurePoly(start = true): void
    {
        if (this._currentPoly) return;

        this._currentPoly = new Polygon();

        if (start)
        {
            // get last points..
            const lastShape = this.shapePrimitives[this.shapePrimitives.length - 1];

            if (lastShape)
            {
                // i KNOW its a rect..
                let lx = lastShape.shape.x;
                let ly = lastShape.shape.y;

                if (lastShape.transform && !lastShape.transform.isIdentity())
                {
                    const t = lastShape.transform;

                    const tempX = lx;

                    lx = (t.a * lx) + (t.c * ly) + t.tx;
                    ly = (t.b * tempX) + (t.d * ly) + t.ty;
                }

                this._currentPoly.points.push(lx, ly);
            }
            else
            {
                this._currentPoly.points.push(0, 0);
            }
        }
    }

    /** Builds the path. */
    public buildPath()
    {
        const path = this._graphicsPath2D;

        this.shapePrimitives.length = 0;
        this._currentPoly = null;

        for (let i = 0; i < path.instructions.length; i++)
        {
            const instruction = path.instructions[i];

            // Sorry TS! this is the best we could do...
            this[instruction.action](...(instruction.data as [never, never, never, never, never, never, never]));
        }

        this.finish();
    }

    /** Gets the bounds of the path. */
    get bounds(): Bounds
    {
        const bounds = this._bounds;

        bounds.clear();

        const shapePrimitives = this.shapePrimitives;

        for (let i = 0; i < shapePrimitives.length; i++)
        {
            const shapePrimitive = shapePrimitives[i];

            const boundsRect = shapePrimitive.shape.getBounds(tempRectangle);

            if (shapePrimitive.transform)
            {
                bounds.addRect(boundsRect, shapePrimitive.transform);
            }
            else
            {
                bounds.addRect(boundsRect);
            }
        }

        return bounds;
    }
}
