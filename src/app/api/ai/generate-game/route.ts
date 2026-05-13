import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAnthropicClient } from '@/ai/claude-client'
import { validateAIOutput } from '@/ai/schema-validator'
import {
  GAME_GENERATOR_SYSTEM_PROMPT,
  buildGenerationPrompt,
  buildRefinementPrompt,
} from '@/ai/prompts/system-prompt'
import { z } from 'zod'

const RequestSchema = z.object({
  description: z.string().min(10).max(2000),
  existingSchema: z.record(z.unknown()).optional(),
  feedback: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { description, existingSchema, feedback } = parsed.data
  const client = getAnthropicClient()

  const userPrompt =
    existingSchema && feedback
      ? buildRefinementPrompt(existingSchema, feedback)
      : buildGenerationPrompt(description)

  // Use streaming — client reads SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let accumulated = ''
      let retries = 0

      async function generate() {
        const claudeStream = await client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: GAME_GENERATOR_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        })

        for await (const chunk of claudeStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            accumulated += chunk.delta.text
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ token: chunk.delta.text })}\n\n`)
            )
          }
        }

        const validation = validateAIOutput(accumulated)

        if (!validation.valid && retries < 2) {
          retries++
          accumulated = ''

          const correctionPrompt = `The previous output had these errors:\n${validation.errors.join('\n')}\n\nPlease fix and output only the corrected JSON.`

          const retryStream = await client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: GAME_GENERATOR_SYSTEM_PROMPT,
            messages: [
              { role: 'user', content: userPrompt },
              { role: 'assistant', content: accumulated },
              { role: 'user', content: correctionPrompt },
            ],
          })

          for await (const chunk of retryStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              accumulated += chunk.delta.text
            }
          }
        }

        const finalResult = validateAIOutput(accumulated)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              valid: finalResult.valid,
              schema: finalResult.valid ? finalResult.schema : null,
              errors: finalResult.valid ? [] : finalResult.errors,
            })}\n\n`
          )
        )
        controller.close()
      }

      generate().catch((err) => {
        console.error('AI generation error:', err)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, valid: false, errors: ['AI service error'] })}\n\n`
          )
        )
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
