import type { AnyHandler } from 'msw'
import type { MockableApi } from '../../env.ts'
import { pokeApiHandlers } from './pokeapi.ts'
import { translationHandlers } from './translations.ts'

export const handlersByApi: Record<MockableApi, AnyHandler[]> = {
  pokeapi: pokeApiHandlers,
  translations: translationHandlers,
}

export const allHandlers = Object.values(handlersByApi).flat()
