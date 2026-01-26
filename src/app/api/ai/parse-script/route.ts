/**
 * AI Script Parsing API Route
 *
 * POST /api/ai/parse-script
 *
 * Parses natural language video scripts into structured project data
 * using Anthropic Claude AI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { streamObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { ParsedScriptSchema } from '@/lib/ai/schemas';

// Request validation schema
const RequestSchema = z.object({
  script: z.string().min(10, 'Script must be at least 10 characters').max(50000),
  options: z
    .object({
      defaultDuration: z.number().min(5).max(300).default(30),
      aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:5', '21:9']).default('16:9'),
      mapStyle: z
        .enum([
          'satellite',
          'satellite-streets',
          'streets',
          'light',
          'dark',
          'outdoors',
        ])
        .default('satellite'),
      streaming: z.boolean().default(false),
    })
    .optional(),
});

// System prompt for optimal parsing
const SYSTEM_PROMPT = `You are a video script parser for a property showcase video platform called propNICA.

Your task is to extract structured timeline data from natural language video descriptions.

PARSING RULES:

1. TIME FORMATS - Convert all times to seconds:
   - "0:30" = 30 seconds
   - "1:15" = 75 seconds
   - "at 5 seconds" = 5
   - "00:00" at start = 0 seconds
   - If no time given for first item, start at 0

2. DURATIONS:
   - "for 3 seconds" = 3
   - "over 5 seconds" = 5
   - "animated over 4 seconds" = 4 second animation
   - If not specified, use reasonable defaults:
     - Camera movements: 3 seconds
     - Zone appearance: visible until video end
     - Route animation: 2-4 seconds
     - Text: visible until video end

3. CAMERA ACTIONS:
   - "show" / "display" / "open with" / "start with" = show location
   - "zoom in" / "zoom to" / "zoom into" = zoom_in action
   - "zoom out" = zoom_out action
   - "pan to" / "move to" = pan action
   - "orbit" / "circle" / "rotate around" = orbit action
   - "tilt" / "change angle" = tilt action
   - "fly to" = fly_to action

4. ZONES:
   - "draw zone" / "highlight area" / "outline" / "zone surrounding" = zone
   - Extract colour from description (blue, red, etc.)
   - "semi-transparent" = 0.3-0.5 opacity
   - "solid" = 0.8-1.0 opacity

5. ROUTES:
   - "draw line from X to Y" = route
   - "draw a route from X to Y" = route
   - "path from X to Y" = route
   - "animated" / "animated over X seconds" = animated: true with duration
   - Extract start and end points carefully

6. TEXT:
   - "show text" / "display label" / "text appears" / "saying" = text
   - Extract the actual text content (often in quotes or after "saying")
   - "white with black outline" = white text with dark background
   - "white text" = white colour

7. ASPECT RATIOS:
   - "portrait" / "vertical" / "TikTok" / "Reels" / "profile" = 9:16
   - "landscape" / "horizontal" / "YouTube" = 16:9
   - "square" / "Instagram" = 1:1

8. LOCATIONS:
   - Preserve exact location names for geocoding
   - Include city/country context when mentioned
   - "Bay Square, Business Bay, Dubai" includes full context
   - "Burj Khalifa" is a known landmark

Always output complete timeline with all activities, sorted by start time.
Calculate total duration from the latest end time in the script.`;

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = RequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { script, options } = validationResult.data;

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service not configured. Please add ANTHROPIC_API_KEY to environment.',
        },
        { status: 503 }
      );
    }

    // Build the prompt
    const prompt = `Parse this video script into a structured timeline:

${script}

Default settings if not specified:
- Total duration: ${options?.defaultDuration ?? 30} seconds
- Aspect ratio: ${options?.aspectRatio ?? '16:9'}
- Map style: ${options?.mapStyle ?? 'satellite'}

Extract all camera movements, zones, routes, text overlays, and markers with their exact timing.`;

    // Use streaming for better UX
    if (options?.streaming) {
      const result = await streamObject({
        model: anthropic('claude-sonnet-4-5-20241022'),
        schema: ParsedScriptSchema,
        system: SYSTEM_PROMPT,
        prompt,
      });

      return result.toTextStreamResponse();
    }

    // Non-streaming: collect full response
    const { object, finishReason, usage } = await import('ai').then(({ generateObject }) =>
      generateObject({
        model: anthropic('claude-sonnet-4-5-20241022'),
        schema: ParsedScriptSchema,
        system: SYSTEM_PROMPT,
        prompt,
      })
    );

    return NextResponse.json({
      success: true,
      data: object,
      metadata: {
        finishReason,
        usage,
      },
    });
  } catch (error) {
    console.error('[AI Parse Script] Error:', error);

    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid script format',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Rate limit errors from Anthropic
    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service is busy. Please try again in a moment.',
        },
        { status: 429 }
      );
    }

    // API key errors
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service configuration error.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to parse script. Please try again.',
      },
      { status: 500 }
    );
  }
}
