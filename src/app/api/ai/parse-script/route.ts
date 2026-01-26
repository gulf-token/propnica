/**
 * AI Script Parsing API Route
 *
 * POST /api/ai/parse-script
 *
 * Parses natural language video scripts into structured project data
 * using Anthropic Claude AI.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { ParsedScriptSchema, type ParsedScript } from '@/lib/ai/schemas';

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
    })
    .optional(),
});

// System prompt for optimal parsing
const SYSTEM_PROMPT = `You are a video script parser for a property showcase video platform called propNICA.

Your task is to extract structured timeline data from natural language video descriptions and return it as valid JSON.

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

OUTPUT FORMAT:
Return ONLY valid JSON matching this structure (no markdown, no explanation):
{
  "title": "optional video title",
  "description": "optional description",
  "settings": {
    "totalDuration": number (seconds),
    "aspectRatio": "16:9" | "9:16" | "1:1" | "4:5" | "21:9",
    "mapStyle": "satellite" | "satellite-streets" | "streets" | "light" | "dark" | "outdoors",
    "primaryLocation": "main location"
  },
  "timeline": [
    {
      "startTime": number,
      "duration": number,
      "activity": {
        "type": "camera" | "zone" | "route" | "text" | "marker",
        // type-specific fields
      }
    }
  ],
  "locations": [{"name": "location name", "context": "additional context"}]
}

Activity types:
- camera: {type: "camera", action: "show"|"zoom_in"|"zoom_out"|"pan"|"orbit"|"tilt"|"fly_to", location: string, zoom?: number, bearing?: number, pitch?: number}
- zone: {type: "zone", action: "draw"|"highlight"|"show", location: string, name?: string, colour?: string, opacity?: number}
- route: {type: "route", action: "draw"|"show"|"animate", from: string, to: string, colour?: string, animated?: boolean, animationDuration?: number}
- text: {type: "text", action: "show"|"appear"|"display", text: string, location?: string}
- marker: {type: "marker", action: "show"|"place"|"add", location: string, label?: string}`;

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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service not configured. Please add ANTHROPIC_API_KEY to environment.',
        },
        { status: 503 }
      );
    }

    // Create Anthropic client
    const client = new Anthropic({
      apiKey,
    });

    // Build the user prompt
    const userPrompt = `Parse this video script into a structured timeline:

${script}

Default settings if not specified:
- Total duration: ${options?.defaultDuration ?? 30} seconds
- Aspect ratio: ${options?.aspectRatio ?? '16:9'}
- Map style: ${options?.mapStyle ?? 'satellite'}

Extract all camera movements, zones, routes, text overlays, and markers with their exact timing.
Return ONLY the JSON object, no other text.`;

    // Call Claude API (using Haiku - upgrade to claude-3-5-sonnet-20241022 when available)
    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract text content
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse the JSON response
    let jsonStr = textContent.text.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    // Parse and validate with Zod
    const parsed = JSON.parse(jsonStr);

    // Log raw response in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AI Parse Script] Raw AI response:', JSON.stringify(parsed, null, 2));
    }

    const validated = ParsedScriptSchema.parse(parsed);

    return NextResponse.json({
      success: true,
      data: validated,
      metadata: {
        model: message.model,
        usage: message.usage,
      },
    });
  } catch (error) {
    console.error('[AI Parse Script] Error:', error);

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI returned invalid JSON. Please try again.',
        },
        { status: 500 }
      );
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error('[AI Parse Script] Zod validation errors:', JSON.stringify(error.errors, null, 2));
      return NextResponse.json(
        {
          success: false,
          error: 'AI response did not match expected format',
          details: process.env.NODE_ENV === 'development' ? error.errors : undefined,
        },
        { status: 500 }
      );
    }

    // Handle Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid API key. Please check your ANTHROPIC_API_KEY.',
          },
          { status: 503 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: 'AI service is busy. Please try again in a moment.',
          },
          { status: 429 }
        );
      }
    }

    // Generic error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AI Parse Script] Full error:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'development'
          ? `Failed to parse script: ${errorMessage}`
          : 'Failed to parse script. Please try again.',
      },
      { status: 500 }
    );
  }
}
