export function checkFormat(format: string | undefined, formats: string | string[]): boolean
{
    if (!format)
    {
        return false;
    }

    format = format.toLowerCase();

    if (Array.isArray(formats))
    {
        return formats.includes(format);
    }

    return format === formats;
}

