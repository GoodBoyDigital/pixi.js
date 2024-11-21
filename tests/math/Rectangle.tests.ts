import { Matrix } from '../../src/maths/matrix/Matrix';
import { Rectangle } from '../../src/maths/shapes/Rectangle';

describe('Rectangle', () =>
{
    it('should create a new rectangle', () =>
    {
        const rect = new Rectangle(5, 5, 1, 1);

        expect(rect.left).toEqual(5);
        expect(rect.top).toEqual(5);
        expect(rect.right).toEqual(6);
        expect(rect.bottom).toEqual(6);
    });

    it('should cast quantities to number types', () =>
    {
        const rect = new Rectangle('5', '5', '1', '1');

        expect(rect.left).toEqual(5);
        expect(rect.top).toEqual(5);
        expect(rect.right).toEqual(6);
        expect(rect.bottom).toEqual(6);
    });

    it('should clone a new rectangle', () =>
    {
        const rect1 = new Rectangle(10, 10, 10, 10);

        expect(rect1.x).toEqual(10);
        expect(rect1.y).toEqual(10);
        expect(rect1.width).toEqual(10);
        expect(rect1.height).toEqual(10);

        const rect2 = rect1.clone();

        expect(rect2.x).toEqual(10);
        expect(rect2.y).toEqual(10);
        expect(rect2.width).toEqual(10);
        expect(rect2.height).toEqual(10);
        expect(rect1).not.toBe(rect2);
    });

    it('should copy from one rectangle to another', () =>
    {
        const rect1 = new Rectangle(10, 10, 10, 10);
        const rect2 = new Rectangle(2, 2, 5, 5);

        rect1.copyFrom(rect2);

        expect(rect1.x).toEqual(2);
        expect(rect1.y).toEqual(2);
        expect(rect1.width).toEqual(5);
        expect(rect1.height).toEqual(5);
    });

    it('should check if point is within rectangle', () =>
    {
        const rect1 = new Rectangle(10, 10, 10, 10);

        expect(rect1.contains(10, 10)).toBe(true);
        expect(rect1.contains(10, 19)).toBe(true);
        expect(rect1.contains(19, 10)).toBe(true);
        expect(rect1.contains(15, 15)).toBe(true);
        expect(rect1.contains(10, 9)).toBe(false);
        expect(rect1.contains(9, 10)).toBe(false);
        expect(rect1.contains(10, 20)).toBe(false);
        expect(rect1.contains(20, 10)).toBe(false);
        expect(rect1.contains(21, 21)).toBe(false);

        const rect2 = new Rectangle(10, 10, 10, 0);

        expect(rect2.contains(10, 10)).toBe(false);
        expect(rect2.contains(20, 20)).toBe(false);
        expect(rect2.contains(15, 15)).toBe(false);
        expect(rect2.contains(10, 9)).toBe(false);
        expect(rect2.contains(9, 10)).toBe(false);
        expect(rect2.contains(21, 21)).toBe(false);
    });

    describe('strokeContains', () =>
    {
        const rectangle = new Rectangle(10, 10, 100, 100);

        test('returns true for a point on the rectangle edge with small stroke width', () =>
        {
            expect(rectangle.strokeContains(10, 10, 1)).toBe(true);
            expect(rectangle.strokeContains(60, 10, 1)).toBe(true);
            expect(rectangle.strokeContains(110, 60, 1)).toBe(true);
            expect(rectangle.strokeContains(10, 110, 1)).toBe(true);
        });

        test('returns true for a point near the rectangle edge within stroke width', () =>
        {
            expect(rectangle.strokeContains(107, 58, 20)).toBe(true);
            expect(rectangle.strokeContains(117, 70, 20)).toBe(true);
            expect(rectangle.strokeContains(14, 111, 20)).toBe(true);
        });

        test('returns false for a point outside the rectangle and beyond the stroke width', () =>
        {
            expect(rectangle.strokeContains(5, 5, 4)).toBe(false);
            expect(rectangle.strokeContains(115, 10, 4)).toBe(false);
            expect(rectangle.strokeContains(10, 115, 4)).toBe(false);
        });

        // Add additional tests as necessary
    });

    it('should enlarge rectangle', () =>
    {
        const rect1 = new Rectangle(10, 10, 10, 10);
        const rect2 = new Rectangle(15, 15, 10, 10);

        rect1.enlarge(rect2);

        expect(rect1.left).toEqual(10);
        expect(rect1.top).toEqual(10);
        expect(rect1.right).toEqual(25);
        expect(rect1.bottom).toEqual(25);

        const rect3 = new Rectangle(0, 0, 0, 0);
        const rect4 = new Rectangle(10, 10, 10, 10);

        rect4.enlarge(rect3);

        expect(rect4.left).toEqual(0);
        expect(rect4.top).toEqual(0);
        expect(rect4.right).toEqual(20);
        expect(rect4.bottom).toEqual(20);
    });

    it('should pad a rectangle', () =>
    {
        // Pad with X & Y
        const rect = new Rectangle(10, 10, 10, 10);

        rect.pad(10, 10);

        expect(rect.left).toEqual(0);
        expect(rect.top).toEqual(0);
        expect(rect.right).toEqual(30);
        expect(rect.bottom).toEqual(30);

        // Pad with X
        const rect1 = new Rectangle(10, 10, 10, 10);

        rect1.pad(10);

        expect(rect1.left).toEqual(0);
        expect(rect1.top).toEqual(0);
        expect(rect1.right).toEqual(30);
        expect(rect1.bottom).toEqual(30);

        // Pad with nothing
        const rect2 = new Rectangle(10, 10, 10, 10);

        rect2.pad();

        expect(rect2.left).toEqual(10);
        expect(rect2.top).toEqual(10);
        expect(rect2.right).toEqual(20);
        expect(rect2.bottom).toEqual(20);

        // Pad with Y
        const rect3 = new Rectangle(10, 10, 10, 10);

        rect3.pad(undefined, 10);

        expect(rect3.left).toEqual(10);
        expect(rect3.top).toEqual(0);
        expect(rect3.right).toEqual(20);
        expect(rect3.bottom).toEqual(30);
    });

    it('should fit a rectangle', () =>
    {
        const rect1 = new Rectangle(0, 0, 10, 10);
        const rect2 = new Rectangle(-10, -10, 5, 5);

        rect2.fit(rect1);

        expect(rect2.left).toEqual(0);
        expect(rect2.top).toEqual(0);
        expect(rect2.right).toEqual(0);
        expect(rect2.bottom).toEqual(0);

        const rect3 = new Rectangle(0, 0, 20, 20);
        const rect4 = new Rectangle(10, 0, 20, 20);

        rect3.fit(rect4);

        expect(rect3.left).toEqual(10);
        expect(rect3.top).toEqual(0);
        expect(rect3.right).toEqual(20);
        expect(rect3.bottom).toEqual(20);

        const rect5 = new Rectangle(10, 10, 20, 25);
        const rect6 = new Rectangle(22, 24, 20, 20);

        rect5.fit(rect6);

        expect(rect5.left).toEqual(22);
        expect(rect5.top).toEqual(24);
        expect(rect5.right).toEqual(30);
        expect(rect5.bottom).toEqual(35);

        const rect7 = new Rectangle(11, 10, 20, 25);
        const rect8 = new Rectangle(10, 9, 13, 10);

        rect7.fit(rect8);

        expect(rect7.left).toEqual(11);
        expect(rect7.top).toEqual(10);
        expect(rect7.right).toEqual(23);
        expect(rect7.bottom).toEqual(19);
    });

    it('should generate an empty rectangle', () =>
    {
        const rect = Rectangle.EMPTY;

        expect(rect.left).toEqual(0);
        expect(rect.top).toEqual(0);
        expect(rect.right).toEqual(0);
        expect(rect.bottom).toEqual(0);
    });

    it('should return true if the area of the intersection > 0', () =>
    {
        /*
        ! SHARING A SIDE IS NOT INTERSECTING !
            +--------+--------+
            |   A    |    B   |
            |    +---+--+     |
            |    |  E|  |     |
            +----|---+--|-----+
            |    |   |  |     |
            |  C +---+--+ D   |
            |        | 🄵      |
            +--------+--------+
        */
        const a = new Rectangle(0, 0, 100, 100);
        const b = new Rectangle(100, 0, 100, 100);
        const c = new Rectangle(0, 100, 100, 100);
        const d = new Rectangle(100, 100, 100, 100);
        const e = new Rectangle(50, 50, 100, 100);
        const f = new Rectangle(150, 175, 0, 0);

        // e intersects a,b,c,d
        expect(e.intersects(a)).toEqual(true);
        expect(e.intersects(b)).toEqual(true);
        expect(e.intersects(c)).toEqual(true);
        expect(e.intersects(d)).toEqual(true);

        expect(e.intersects(a, new Matrix())).toEqual(true);
        expect(e.intersects(b, new Matrix())).toEqual(true);
        expect(e.intersects(c, new Matrix())).toEqual(true);
        expect(e.intersects(d, new Matrix())).toEqual(true);

        // works the other way around
        expect(a.intersects(e)).toEqual(true);
        expect(b.intersects(e)).toEqual(true);
        expect(c.intersects(e)).toEqual(true);
        expect(d.intersects(e)).toEqual(true);

        expect(a.intersects(e, new Matrix())).toEqual(true);
        expect(b.intersects(e, new Matrix())).toEqual(true);
        expect(c.intersects(e, new Matrix())).toEqual(true);
        expect(d.intersects(e, new Matrix())).toEqual(true);

        // none of the other intersect (sharing a side it is NOT intersecting!)
        expect(a.intersects(b)).toEqual(false); // share Y side
        expect(b.intersects(d)).toEqual(false); // share X side
        expect(c.intersects(b)).toEqual(false); // share single point

        expect(a.intersects(b, new Matrix())).toEqual(false); // share Y side
        expect(b.intersects(d, new Matrix())).toEqual(false); // share X side
        expect(c.intersects(b, new Matrix())).toEqual(false); // share single point

        // Since F has no area, the intersection with D it's 0 so it's false.
        expect(f.intersects(d)).toEqual(false);

        expect(f.intersects(d, new Matrix())).toEqual(false);

        // Any rectangle with area intersects itself
        expect(a.intersects(a.clone())).toEqual(true);
        expect(b.intersects(b.clone())).toEqual(true);
        expect(c.intersects(c.clone())).toEqual(true);
        expect(d.intersects(d.clone())).toEqual(true);
        expect(e.intersects(e.clone())).toEqual(true);

        expect(a.intersects(a.clone(), new Matrix())).toEqual(true);
        expect(b.intersects(b.clone(), new Matrix())).toEqual(true);
        expect(c.intersects(c.clone(), new Matrix())).toEqual(true);
        expect(d.intersects(d.clone(), new Matrix())).toEqual(true);
        expect(e.intersects(e.clone(), new Matrix())).toEqual(true);

        // A point without area can't have an intersection, thus it can't even intersect itself
        expect(f.intersects(f.clone())).toEqual(false);

        expect(f.intersects(f.clone(), new Matrix())).toEqual(false);

        // No intersection if the transform is degenerate
        expect(a.intersects(a.clone(), new Matrix().scale(0, 1))).toEqual(false);

        expect(a.intersects(a.clone(), new Matrix().scale(0.5, 0.5))).toEqual(true);
        expect(a.intersects(a.clone(), new Matrix().scale(2, 2))).toEqual(true);

        const m = new Matrix().translate(-50, -50).rotate(Math.PI / 4);

        expect(a.intersects(a.clone(), m.clone().translate(-35, -35))).toEqual(true);
        expect(a.intersects(a.clone(), m.clone().translate(-36, -36))).toEqual(false);
        expect(a.intersects(a.clone(), m.clone().translate(135, -35))).toEqual(true);
        expect(a.intersects(a.clone(), m.clone().translate(136, -36))).toEqual(false);
        expect(a.intersects(a.clone(), m.clone().translate(-35, 135))).toEqual(true);
        expect(a.intersects(a.clone(), m.clone().translate(-36, 136))).toEqual(false);
        expect(a.intersects(a.clone(), m.clone().translate(135, 135))).toEqual(true);
        expect(a.intersects(a.clone(), m.clone().translate(136, 136))).toEqual(false);

        expect(a.intersects(a.clone(), m.clone().scale(-1, +1).translate(-35, -35))).toEqual(true);
        expect(a.intersects(a.clone(), m.clone().scale(-1, +1).translate(-36, -36))).toEqual(false);
        expect(a.intersects(a.clone(), m.clone().scale(-1, +1).translate(135, -35))).toEqual(true);
        expect(a.intersects(a.clone(), m.clone().scale(-1, +1).translate(136, -36))).toEqual(false);
        expect(a.intersects(a.clone(), m.clone().scale(-1, +1).translate(-35, 135))).toEqual(true);
        expect(a.intersects(a.clone(), m.clone().scale(-1, +1).translate(-36, 136))).toEqual(false);
        expect(a.intersects(a.clone(), m.clone().scale(-1, +1).translate(135, 135))).toEqual(true);
        expect(a.intersects(a.clone(), m.clone().scale(-1, +1).translate(136, 136))).toEqual(false);
    });

    describe('containsRect', () =>
    {
        it('should return true when rectangle is fully contained', () =>
        {
            const outer = new Rectangle(0, 0, 100, 100);
            const inner = new Rectangle(25, 25, 50, 50);

            expect(outer.containsRect(inner)).toBe(true);
        });

        it('should return false when rectangle is partially outside', () =>
        {
            const rect1 = new Rectangle(0, 0, 100, 100);
            const rect2 = new Rectangle(50, 50, 100, 100);

            expect(rect1.containsRect(rect2)).toBe(false);
        });

        it('should return false when rectangle is completely outside', () =>
        {
            const rect1 = new Rectangle(0, 0, 50, 50);
            const rect2 = new Rectangle(100, 100, 50, 50);

            expect(rect1.containsRect(rect2)).toBe(false);
        });

        it('should return false when width is 0', () =>
        {
            const rect1 = new Rectangle(0, 0, 0, 100);
            const rect2 = new Rectangle(0, 0, 50, 50);

            expect(rect1.containsRect(rect2)).toBe(false);
        });

        it('should return false when height is 0', () =>
        {
            const rect1 = new Rectangle(0, 0, 100, 0);
            const rect2 = new Rectangle(0, 0, 50, 50);

            expect(rect1.containsRect(rect2)).toBe(false);
        });

        it('should handle edge touching cases', () =>
        {
            const outer = new Rectangle(0, 0, 100, 100);
            const edge = new Rectangle(0, 0, 50, 50); // Touches at corner
            const edge2 = new Rectangle(0, 25, 50, 50); // Touches at left edge
            const edge3 = new Rectangle(25, 0, 50, 50); // Touches at top edge

            expect(outer.containsRect(edge)).toBe(true);
            expect(outer.containsRect(edge2)).toBe(true);
            expect(outer.containsRect(edge3)).toBe(true);
        });

        it('should handle identical rectangles', () =>
        {
            const rect1 = new Rectangle(0, 0, 100, 100);
            const rect2 = new Rectangle(0, 0, 100, 100);

            expect(rect1.containsRect(rect2)).toBe(false);
        });
    });
});
