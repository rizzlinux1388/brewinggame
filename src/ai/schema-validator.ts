import { validateGameDefinition } from '@/lib/validations/game-definition.schema'
import type { GameDefinition } from '@/types/game-definition'

export type ValidationResult =
  | { valid: true; schema: GameDefinition }
  | { valid: false; errors: string[] }

export function validateAIOutput(raw: string): ValidationResult {
  let parsed: unknown

  // Strip markdown fences if AI adds them anyway
  const cleaned = raw
    .replace(/^```(?:json)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim()

  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return { valid: false, errors: ['AI output is not valid JSON'] }
  }

  // Check for error response
  if (parsed && typeof parsed === 'object' && 'error' in parsed) {
    const err = parsed as { error: string; message?: string }
    return { valid: false, errors: [err.message ?? err.error] }
  }

  const result = validateGameDefinition(parsed)
  if (!result.success) {
    const errors = result.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`
    )
    return { valid: false, errors }
  }

  // Semantic cross-reference checks
  const schema = result.data as GameDefinition
  const semanticErrors = checkSemantics(schema)
  if (semanticErrors.length > 0) {
    return { valid: false, errors: semanticErrors }
  }

  return { valid: true, schema }
}

function checkSemantics(schema: GameDefinition): string[] {
  const errors: string[] = []
  const suitIds = new Set(schema.deck.suits.map((s) => s.id))

  // Check trump suit references
  if (schema.trumpSuit) {
    const ts = schema.trumpSuit
    if ('suitId' in ts && !suitIds.has(ts.suitId)) {
      errors.push(`trumpSuit.suitId '${ts.suitId}' not defined in deck.suits`)
    }
    if ('determined' in ts && ts.determined === 'fixed' && !suitIds.has(ts.suitId)) {
      errors.push(`trumpSuit.suitId '${ts.suitId}' not defined in deck.suits`)
    }
  }

  // Check scoring event card specs
  for (const event of schema.scoring.events) {
    if (event.trigger.type === 'card-in-trick') {
      const spec = event.trigger.cardSpec
      if (spec.suitId && !suitIds.has(spec.suitId)) {
        errors.push(`Scoring event '${event.id}' references unknown suitId '${spec.suitId}'`)
      }
    }
  }

  // Check dealing math
  const totalCards =
    schema.deck.suits.length *
    schema.deck.ranks.length *
    schema.deck.copies +
    (schema.deck.includeJokers ? (schema.deck.jokerCount ?? 2) : 0)

  if (typeof schema.dealing.cardsPerPlayer === 'number') {
    const required = schema.dealing.cardsPerPlayer * schema.maxPlayers
    if (required > totalCards) {
      errors.push(
        `Dealing requires ${required} cards but deck only has ${totalCards}`
      )
    }
  }

  return errors
}
