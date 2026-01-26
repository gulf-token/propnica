import {
  renderMediaOnLambda,
  getRenderProgress,
  AwsRegion,
} from '@remotion/lambda/client';
import { prisma } from '@/lib/prisma';
import { ProjectConfig, RESOLUTION_PRESETS, ResolutionPreset } from '@/types';

// ===========================================
// Configuration
// ===========================================

const REMOTION_CONFIG = {
  region: (process.env.REMOTION_AWS_REGION || 'eu-west-1') as AwsRegion,
  functionName: process.env.REMOTION_LAMBDA_FUNCTION_NAME || 'remotion-render-propnica',
  serveUrl: process.env.REMOTION_SERVE_URL || '',
  outBucket: process.env.REMOTION_S3_BUCKET || 'propnica-renders',
};

// ===========================================
// Render Video Function
// ===========================================

interface RenderVideoParams {
  renderId: string;
  projectId: string;
  config: Record<string, unknown>;
  resolution: ResolutionPreset;
}

export async function renderVideo(params: RenderVideoParams): Promise<void> {
  const { renderId, projectId, config, resolution } = params;

  const resolutionConfig = RESOLUTION_PRESETS[resolution];
  const projectConfig = config as unknown as ProjectConfig;

  try {
    // Update status to processing
    await prisma.render.update({
      where: { id: renderId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    // Calculate total frames
    const fps = projectConfig.settings.fps || 30;
    const duration = projectConfig.settings.duration || 30;
    const totalFrames = fps * duration;

    // Start Remotion Lambda render
    const renderResponse = await renderMediaOnLambda({
      region: REMOTION_CONFIG.region,
      functionName: REMOTION_CONFIG.functionName,
      serveUrl: REMOTION_CONFIG.serveUrl,
      composition: 'PropertyClip',
      inputProps: {
        config: projectConfig,
      },
      codec: 'h264',
      imageFormat: 'jpeg',
      maxRetries: 3,
      framesPerLambda: 20,
      privacy: 'private',
      outName: `${projectId}/${renderId}.mp4`,
      downloadBehavior: {
        type: 'download',
        fileName: `propnica-${renderId}.mp4`,
      },
      // Resolution settings
      ...(resolution !== '1080p' && {
        scale: resolution === '720p' ? 0.667 : 2, // Scale for 720p or 4K
      }),
    });

    // Store the Lambda render ID
    await prisma.render.update({
      where: { id: renderId },
      data: {
        renderId: renderResponse.renderId,
      },
    });

    // Poll for progress
    await pollRenderProgress(renderId, renderResponse.renderId, renderResponse.bucketName);
  } catch (error) {
    console.error('Render error:', error);
    await prisma.render.update({
      where: { id: renderId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown render error',
      },
    });
    throw error;
  }
}

// ===========================================
// Poll Render Progress
// ===========================================

async function pollRenderProgress(
  renderId: string,
  lambdaRenderId: string,
  bucketName: string
): Promise<void> {
  const maxAttempts = 300; // 5 minutes max with 1s intervals
  let attempts = 0;

  const poll = async (): Promise<void> => {
    attempts++;

    if (attempts > maxAttempts) {
      await prisma.render.update({
        where: { id: renderId },
        data: {
          status: 'FAILED',
          errorMessage: 'Render timed out',
        },
      });
      return;
    }

    try {
      const progress = await getRenderProgress({
        renderId: lambdaRenderId,
        bucketName,
        region: REMOTION_CONFIG.region,
        functionName: REMOTION_CONFIG.functionName,
      });

      // Update progress
      const progressPercent = Math.round((progress.overallProgress ?? 0) * 100);
      await prisma.render.update({
        where: { id: renderId },
        data: { progress: progressPercent },
      });

      if (progress.done) {
        // Render complete
        const outputUrl = progress.outputFile;
        const fileSize = progress.outputSizeInBytes;

        await prisma.render.update({
          where: { id: renderId },
          data: {
            status: 'COMPLETE',
            progress: 100,
            outputUrl,
            fileSize,
            completedAt: new Date(),
          },
        });
        return;
      }

      if (progress.fatalErrorEncountered) {
        // Render failed
        await prisma.render.update({
          where: { id: renderId },
          data: {
            status: 'FAILED',
            errorMessage: progress.errors?.[0]?.message ?? 'Render failed',
          },
        });
        return;
      }

      // Continue polling
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await poll();
    } catch (error) {
      console.error('Progress poll error:', error);
      
      // Retry on network errors
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await poll();
      } else {
        await prisma.render.update({
          where: { id: renderId },
          data: {
            status: 'FAILED',
            errorMessage: 'Failed to get render progress',
          },
        });
      }
    }
  };

  await poll();
}

// ===========================================
// Cancel Render (if supported)
// ===========================================

export async function cancelRender(lambdaRenderId: string): Promise<void> {
  // Remotion Lambda doesn't directly support cancellation,
  // but we can update our database record
  console.log(`Cancellation requested for: ${lambdaRenderId}`);
}

// ===========================================
// Estimate Render Time
// ===========================================

export function estimateRenderTime(
  duration: number,
  resolution: ResolutionPreset
): number {
  // Base estimate: 2 seconds per second of video
  let estimate = duration * 2;

  // Adjust for resolution
  switch (resolution) {
    case '720p':
      estimate *= 0.7;
      break;
    case '1080p':
      estimate *= 1;
      break;
    case '4k':
      estimate *= 2.5;
      break;
  }

  return Math.ceil(estimate);
}

// ===========================================
// Estimate File Size
// ===========================================

export function estimateFileSize(
  duration: number,
  resolution: ResolutionPreset
): number {
  const config = RESOLUTION_PRESETS[resolution];
  const bitrateNum = parseInt(config.bitrate.replace('M', '')) * 1000000;
  
  // File size in bytes = bitrate * duration / 8
  return Math.ceil((bitrateNum * duration) / 8);
}
