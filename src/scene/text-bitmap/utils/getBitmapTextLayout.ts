import type { TextStyle } from '../../text/TextStyle';
import type { AbstractBitmapFont } from '../AbstractBitmapFont';

export interface BitmapTextLayoutData
{
    width: number;
    height: number;
    scale: number;
    offsetY: number;
    lines: {
        width: number
        charPositions: number[],
        chars: string[],
        // / spaces: number
        spaceWidth: number
        spacesIndex: number[]
    }[];
}

export function getBitmapTextLayout(
    text: string,
    style: TextStyle,
    font: AbstractBitmapFont<any>,
    trimEnd: boolean
): BitmapTextLayoutData
{
    const layoutData: BitmapTextLayoutData = {
        width: 0,
        height: 0,
        offsetY: 0,
        scale: style.fontSize / font.baseMeasurementFontSize,
        lines: [{
            width: 0,
            charPositions: [] as number[],
            spaceWidth: 0,
            spacesIndex: [],
            chars: [],
        }]
    };

    layoutData.offsetY = font.baseLineOffset;

    let currentLine = layoutData.lines[0];

    let previousChar: string = null;
    let firstWord = true;
    //    let spaceCount = 0;

    const currentWord = {
        spaceWord: false,
        width: 0,
        start: 0,
        index: 0, // use index to not modify the array as we use it a lot!
        positions: [] as number[],
        chars: [] as string[],
    };

    const nextWord = (word: typeof currentWord) =>
    {
        const start = currentLine.width;

        for (let j = 0; j < currentWord.index; j++)
        {
            const position = word.positions[j];

            currentLine.chars.push(word.chars[j]);
            currentLine.charPositions.push(position + start);
        }

        currentLine.width += word.width;

        firstWord = false;

        // reset the word..
        currentWord.width = 0;
        currentWord.index = 0;
        currentWord.chars.length = 0;

        // spaceCount = 0;
    };

    const nextLine = () =>
    {
        let index = currentLine.chars.length - 1;

        if (trimEnd)
        {
            let lastChar = currentLine.chars[index];

            while (lastChar === ' ')
            {
                currentLine.width -= font.chars[lastChar].xAdvance;
                lastChar = currentLine.chars[--index];
            }
        }

        layoutData.width = Math.max(layoutData.width, currentLine.width);

        currentLine = {
            width: 0,
            charPositions: [],
            chars: [],
            spaceWidth: 0,
            spacesIndex: [],
        };

        firstWord = true;
        layoutData.lines.push(currentLine);
        layoutData.height += font.lineHeight;
    };

    const scale = font.baseMeasurementFontSize / style.fontSize;

    const adjustedLetterSpacing = style.letterSpacing * scale;
    const adjustedWordWrapWidth = style.wordWrapWidth * scale;

    const breakWords = style.wordWrap && style.breakWords;

    const checkIsOverflow = (lineWidth: number) =>
        lineWidth - adjustedLetterSpacing > adjustedWordWrapWidth;

    const chars = Array.from(text);

    // loop an extra time to force a line break..
    for (let i = 0; i < chars.length + 1; i++)
    {
        let char: string;

        const isEnd = i === chars.length;

        if (!isEnd)
        {
            char = chars[i];
        }

        const charData = font.chars[char] || font.chars[' '];

        const isSpace = (/(?:\s)/).test(char);
        const isWordBreak = isSpace || char === '\r' || char === '\n' || isEnd;

        // spaceCount++;
        // wasSpace = isSpace;

        if (isWordBreak)
        {
            const addWordToNextLine = !firstWord && style.wordWrap && checkIsOverflow(currentLine.width + currentWord.width);

            if (addWordToNextLine)
            {
                nextLine();

                nextWord(currentWord);

                if (!isEnd)
                {
                    currentLine.charPositions.push(0);
                }
            }
            else
            {
                currentWord.start = currentLine.width;

                nextWord(currentWord);

                if (!isEnd)
                {
                    currentLine.charPositions.push(0);
                }
            }

            if (char === '\r' || char === '\n')
            {
                if (currentLine.width !== 0)
                {
                    nextLine();
                }
            }
            else if (!isEnd)
            {
                const spaceWidth = charData.xAdvance + (charData.kerning[previousChar] || 0) + adjustedLetterSpacing;

                currentLine.width += spaceWidth;

                currentLine.spaceWidth = spaceWidth;
                currentLine.spacesIndex.push(currentLine.charPositions.length);
                currentLine.chars.push(char);

                // spaceCount++;
            }
        }
        else
        {
            const kerning = charData.kerning[previousChar] || 0;

            const nextCharWidth = charData.xAdvance + kerning + adjustedLetterSpacing;

            const addWordToNextLine = breakWords && checkIsOverflow(currentLine.width + currentWord.width + nextCharWidth);

            if (addWordToNextLine)
            {
                nextWord(currentWord);
                nextLine();
            }

            currentWord.positions[currentWord.index++] = currentWord.width + kerning;
            currentWord.chars.push(char);

            currentWord.width += nextCharWidth;
        }

        previousChar = char;
        // lastChar = char;
    }

    nextLine();

    if (style.align === 'center')
    {
        alignCenter(layoutData);
    }
    else if (style.align === 'right')
    {
        alignRight(layoutData);
    }
    else if (style.align === 'justify')
    {
        alignJustify(layoutData);
    }

    return layoutData;
}

function alignCenter(measurementData: BitmapTextLayoutData)
{
    for (let i = 0; i < measurementData.lines.length; i++)
    {
        const line = measurementData.lines[i];
        const offset = ((measurementData.width / 2) - (line.width / 2));

        for (let j = 0; j < line.charPositions.length; j++)
        {
            line.charPositions[j] += offset;
        }
    }
}

function alignRight(measurementData: BitmapTextLayoutData)
{
    for (let i = 0; i < measurementData.lines.length; i++)
    {
        const line = measurementData.lines[i];
        const offset = ((measurementData.width) - (line.width));

        for (let j = 0; j < line.charPositions.length; j++)
        {
            line.charPositions[j] += offset;
        }
    }
}

function alignJustify(measurementData: BitmapTextLayoutData)
{
    const width = measurementData.width;

    for (let i = 0; i < measurementData.lines.length; i++)
    {
        const line = measurementData.lines[i];

        let indy = 0;
        let spaceIndex = line.spacesIndex[indy++];

        let offset = 0;

        const totalSpaces = line.spacesIndex.length;

        const newSpaceWidth = (width - line.width) / totalSpaces;

        const spaceWidth = newSpaceWidth;

        for (let j = 0; j < line.charPositions.length; j++)
        {
            if (j === spaceIndex)
            {
                spaceIndex = line.spacesIndex[indy++];

                offset += spaceWidth;
            }

            line.charPositions[j] += offset;
        }
    }
}
