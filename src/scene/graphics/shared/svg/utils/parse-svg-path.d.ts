/** Type definitions for parse-svg-path module This module parses SVG path data strings into an array of commands */

declare module 'parse-svg-path'
{
    /**
     * Represents a single SVG path command
     * First element is the command letter (e.g. 'M' for moveto, 'L' for lineto, etc)
     * Remaining elements are the numeric parameters for that command
     * @example ['M', 10, 20] // Move to x=10, y=20
     * @example ['L', 30, 40] // Line to x=30, y=40
     */
    export type Command = [string, ...number[]];

    /**
     * Parses an SVG path data string into an array of commands
     * @param path - The SVG path data string to parse
     * @returns Array of parsed commands, each containing a command letter and parameters
     * @example
     * parse('M10 20L30 40')
     * // Returns: [['M', 10, 20], ['L', 30, 40]]
     */
    export default function parse(path: string): Command[];
}
