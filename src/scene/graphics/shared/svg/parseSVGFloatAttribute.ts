/**
 * Parses a float value from an SVG element's attribute.
 * This is commonly used for parsing numeric attributes like coordinates, dimensions,
 * and other measurements from SVG elements.
 * @param svg - The SVG element to get the attribute from
 * @param id - The name of the attribute to parse (e.g. 'x', 'y', 'width', etc)
 * @param defaultValue - The value to return if the attribute doesn't exist or can't be parsed
 * @returns The parsed float value, or the default value if parsing fails
 * @example
 * // For SVG: <rect x="10.5" width="20"/>
 * parseSVGFloatAttribute(rectElement, 'x', 0) // Returns 10.5
 * parseSVGFloatAttribute(rectElement, 'y', 0) // Returns 0 since y is not specified
 */
export function parseSVGFloatAttribute(svg: SVGElement, id: string, defaultValue: number): number
{
    const value = svg.getAttribute(id) as string;

    return value ? Number(value) : defaultValue;
}
