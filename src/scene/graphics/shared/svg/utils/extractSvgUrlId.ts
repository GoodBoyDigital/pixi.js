/**
 * Extracts the ID from an SVG url() reference.
 *
 * This function handles all valid SVG url() formats including:
 * - url(#id)
 * - url('#id')
 * - url("#id")
 * - url( #id )
 * - url( '#id' )
 * - url( "#id" )
 *
 * The regex pattern matches:
 * - url followed by optional whitespace
 * - opening parenthesis followed by optional whitespace
 * - optional single or double quotes with optional whitespace
 * - # followed by the ID (any chars except quotes, whitespace, or closing paren)
 * - optional single or double quotes with optional whitespace
 * - closing parenthesis
 * @param url - The SVG url() string to parse
 * @returns The extracted ID string, or empty string if no valid ID found
 */
export function extractSvgUrlId(url: string): string
{
    // Handle all valid SVG url() formats
    const match = url.match(/url\s*\(\s*['"]?\s*#([^'"\s)]+)\s*['"]?\s*\)/i);

    return match ? match[1] : '';
}
