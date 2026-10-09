<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface Pokemon {
  id: number
  name: string
  image: string | null
  types: string[]
  description: string
  yodaDescription: string | null
}

const name = ref('pikachu')
const pokemon = ref<Pokemon | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)
const mockedApis = ref<string[]>([])

onMounted(async () => {
  const res = await fetch('/api/health')
  mockedApis.value = (await res.json()).mockedApis
})

async function search() {
  const query = name.value.trim()
  error.value = null
  pokemon.value = null
  if (!query) {
    error.value = 'Enter a Pokémon name to search.'
    return
  }
  loading.value = true
  try {
    const res = await fetch(`/api/pokemon/${encodeURIComponent(query)}`)
    const body = await res.json()
    if (!res.ok) throw new Error(body.error)
    pokemon.value = body
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main>
    <p class="mode" :class="{ mocked: mockedApis.length }" data-testid="mode-badge">
      {{ mockedApis.length ? `Mocked: ${mockedApis.join(', ')}` : 'Real APIs' }}
    </p>

    <h1>Pokédex</h1>
    <form @submit.prevent="search">
      <input v-model="name" placeholder="pikachu" aria-label="Pokémon name" />
      <button :disabled="loading">{{ loading ? 'Loading…' : 'Search' }}</button>
    </form>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <article v-if="pokemon" data-testid="pokemon-card">
      <img v-if="pokemon.image" :src="pokemon.image" :alt="pokemon.name" />
      <h2>#{{ pokemon.id }} {{ pokemon.name }}</h2>
      <p>{{ pokemon.types.join(' / ') }}</p>
      <p>{{ pokemon.description }}</p>
      <blockquote v-if="pokemon.yodaDescription" data-testid="yoda">{{ pokemon.yodaDescription }}</blockquote>
      <p v-else class="muted" data-testid="yoda-unavailable">Yoda translation unavailable (rate limited?)</p>
    </article>
  </main>
</template>

<style>
body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 2rem auto; padding: 0 1rem; }
.mode { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; background: #d1fae5; font-size: 0.85rem; }
.mode.mocked { background: #fde68a; }
.error { color: #b91c1c; }
.muted { color: #6b7280; }
h2 { text-transform: capitalize; }
blockquote { border-left: 3px solid #10b981; margin: 0; padding-left: 0.75rem; font-style: italic; }
</style>
