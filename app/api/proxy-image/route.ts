import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': new URL(imageUrl).origin
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch (error) {
        console.error('Image proxy error:', error);
        return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
    }
}
