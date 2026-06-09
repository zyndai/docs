<script setup>
import { ref, nextTick, onUnmounted } from 'vue'
import { marked } from 'marked'

marked.use({ breaks: true, gfm: true })

const BASE = 'https://docs-rag.zynd.ai'

const open = ref(false)
const question = ref('')
const loading = ref(false)
const messages = ref([])
const history = ref([])
const containerRef = ref(null)
const inputRef = ref(null)
let abortController = null
let userScrolledUp = false

function onScroll() {
  if (!containerRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = containerRef.value
  userScrolledUp = scrollHeight - scrollTop - clientHeight > 80
}

async function scrollToBottom(force = false) {
  await nextTick()
  if (!containerRef.value) return
  if (force || !userScrolledUp) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight
  }
}

async function send() {
  const q = question.value.trim()
  if (!q || loading.value) return

  question.value = ''
  messages.value.push({ role: 'user', content: q })
  messages.value.push({ role: 'assistant', content: '', loading: true, sources: [], sub_queries: [] })
  const assistantIdx = messages.value.length - 1
  loading.value = true
  userScrolledUp = false

  await scrollToBottom(true)
  await nextTick()
  autoResizeInput()

  const msg = messages.value[assistantIdx]

  try {
    abortController = new AbortController()
    const resp = await fetch(`${BASE}/ask/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, history: history.value }),
      signal: abortController.signal,
    })

    if (!resp.ok) {
      msg.content = `Error ${resp.status}: ${resp.statusText}`
      msg.error = true
      return
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    let currentEvent = null
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop()

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          const raw = line.slice(6)
          if (!raw) continue

          if (currentEvent === 'token') {
            full += JSON.parse(raw)
            msg.content = full
            msg.loading = false
            await scrollToBottom()
          } else if (currentEvent === 'meta') {
            const meta = JSON.parse(raw)
            msg.sources = meta.sources || []
            msg.related = meta.related || []
            msg.sub_queries = meta.sub_queries || []
            history.value = [
              ...history.value,
              { role: 'user', content: q },
              { role: 'assistant', content: full },
            ].slice(-20)
          } else if (currentEvent === 'error') {
            const err = JSON.parse(raw)
            msg.content = err.detail || 'Something went wrong.'
            msg.error = true
          }
          currentEvent = null
        }
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      msg.content = e.message || 'Request failed.'
      msg.error = true
    }
  } finally {
    msg.loading = false
    loading.value = false
    await scrollToBottom()
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) {
    nextTick(() => {
      scrollToBottom(true)
      inputRef.value?.focus()
    })
  }
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function autoResizeInput() {
  if (!inputRef.value) return
  inputRef.value.style.height = 'auto'
  inputRef.value.style.height = Math.min(inputRef.value.scrollHeight, 120) + 'px'
}

function renderMd(text) {
  const html = marked.parse(text)
  return typeof html === 'string' ? html : text
}

function shortPath(src) {
  if (!src) return ''
  const parts = src.split('/')
  return parts.slice(-2).join('/')
}

async function fillAndSend(text) {
  question.value = text
  await nextTick()
  send()
}

onUnmounted(() => {
  abortController?.abort()
})
</script>

<template>
  <div class="zynd-chat-root">
    <!-- FAB -->
    <button class="zynd-chat-fab" @click="toggle" :aria-label="open ? 'Close chat' : 'Ask AI'">
      <svg v-if="!open" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
        <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 21v-4.03a48.527 48.527 0 0 1-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979Z" />
        <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 0 0 1.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0 0 15.75 7.5Z" />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Modal -->
    <Transition name="zynd-chat-slide">
      <div v-if="open" class="zynd-chat-modal" role="dialog" aria-label="Ask the Zynd docs AI">
        <!-- Header -->
        <div class="zynd-chat-header">
          <div class="zynd-chat-header-info">
            <div class="zynd-chat-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 21v-4.03a48.527 48.527 0 0 1-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979Z" />
                <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 0 0 1.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0 0 15.75 7.5Z" />
              </svg>
            </div>
            <div>
              <div class="zynd-chat-title">Ask Zynd Docs</div>
              <div class="zynd-chat-subtitle">AI-powered search</div>
            </div>
          </div>
          <button class="zynd-chat-close" @click="toggle" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- Messages -->
        <div class="zynd-chat-messages" ref="containerRef" @scroll="onScroll">
          <!-- Empty state -->
          <div v-if="messages.length === 0" class="zynd-chat-empty">
            <div class="zynd-chat-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 21v-4.03a48.527 48.527 0 0 1-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979Z" />
                <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 0 0 1.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0 0 15.75 7.5Z" />
              </svg>
            </div>
            <p class="zynd-chat-empty-text">Ask anything about the Zynd network, agents, SDK, or deployment.</p>
            <div class="zynd-chat-suggestions">
              <button @click="fillAndSend('How do I register an agent?')">How do I register an agent?</button>
              <button @click="fillAndSend('How does x402 micropayment work?')">How does x402 work?</button>
              <button @click="fillAndSend('What is the gossip mesh?')">What is the gossip mesh?</button>
            </div>
          </div>

          <!-- Message list -->
          <div v-for="(msg, i) in messages" :key="i" class="zynd-chat-message" :class="`zynd-chat-message--${msg.role}`">
            <div v-if="msg.role === 'assistant'" class="zynd-chat-msg-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 21v-4.03a48.527 48.527 0 0 1-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979Z" />
                <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 0 0 1.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0 0 15.75 7.5Z" />
              </svg>
            </div>

            <div class="zynd-chat-msg-body" :class="{ 'zynd-chat-msg-body--error': msg.error }">
              <!-- Typing indicator -->
              <div v-if="msg.loading && !msg.content" class="zynd-chat-typing">
                <span></span><span></span><span></span>
              </div>

              <!-- Content -->
              <div v-else-if="msg.content" class="zynd-chat-msg-content" v-html="renderMd(msg.content)"></div>

              <!-- Sources -->
              <div v-if="!msg.loading && msg.sources && msg.sources.length" class="zynd-chat-sources">
                <div class="zynd-chat-sources-label">Sources</div>
                <div class="zynd-chat-sources-list">
                  <template v-for="(s, si) in msg.sources.slice(0, 6)" :key="si">
                    <a
                      v-if="s.type === 'code' && s.github_url"
                      :href="s.github_url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="zynd-chat-source-chip zynd-chat-source-chip--link"
                    >
                      <span class="zynd-source-badge zynd-source-badge--code">code</span>
                      <span class="zynd-source-name">{{ s.file?.split('/').slice(-1)[0] }}:{{ s.start_line }}</span>
                      <span v-if="s.score != null" class="zynd-source-score">{{ Math.round(s.score * 100) }}%</span>
                    </a>
                    <span v-else class="zynd-chat-source-chip">
                      <span class="zynd-source-badge" :class="s.type === 'code' ? 'zynd-source-badge--code' : 'zynd-source-badge--doc'">{{ s.type }}</span>
                      <span class="zynd-source-name">{{ s.type === 'code' ? s.file?.split('/').slice(-1)[0] : shortPath(s.source) }}</span>
                      <span v-if="s.score != null" class="zynd-source-score">{{ Math.round(s.score * 100) }}%</span>
                    </span>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="zynd-chat-input-area">
          <textarea
            ref="inputRef"
            v-model="question"
            @keydown="onKeydown"
            @input="autoResizeInput"
            placeholder="Ask about Zynd AI…"
            rows="1"
            :disabled="loading"
            class="zynd-chat-input"
          ></textarea>
          <button
            @click="send"
            :disabled="loading || !question.trim()"
            class="zynd-chat-send"
            aria-label="Send"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
/* ─── Root container ─── */
.zynd-chat-root {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  pointer-events: none;
  /* prevent 80vw modal from clipping left edge */
  max-width: calc(100vw - 48px);
}

.zynd-chat-root > * {
  pointer-events: all;
}

/* ─── FAB ─── */
.zynd-chat-fab {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  flex-shrink: 0;
}

.zynd-chat-fab:hover {
  background: var(--vp-c-brand-2);
  transform: scale(1.06);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
}

.zynd-chat-fab:active {
  transform: scale(0.97);
}

/* ─── Modal ─── */
.zynd-chat-modal {
  width: 80vw;
  height: 80vh;
  max-width: 1100px;
  max-height: calc(100vh - 110px);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 600px) {
  .zynd-chat-root {
    bottom: 16px;
    right: 16px;
    left: 16px;
    align-items: stretch;
  }
  .zynd-chat-modal {
    width: 100%;
    height: calc(100vh - 90px);
    max-height: none;
    max-width: none;
    border-radius: 12px;
  }
}

/* ─── Transition ─── */
.zynd-chat-slide-enter-active,
.zynd-chat-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.zynd-chat-slide-enter-from,
.zynd-chat-slide-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}

/* ─── Header ─── */
.zynd-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  flex-shrink: 0;
}

.zynd-chat-header-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.zynd-chat-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.zynd-chat-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.2;
}

.zynd-chat-subtitle {
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin-top: 1px;
}

.zynd-chat-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.zynd-chat-close:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}

/* ─── Messages scroll area ─── */
.zynd-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-behavior: smooth;
}

.zynd-chat-messages::-webkit-scrollbar {
  width: 4px;
}
.zynd-chat-messages::-webkit-scrollbar-track {
  background: transparent;
}
.zynd-chat-messages::-webkit-scrollbar-thumb {
  background: var(--vp-c-divider);
  border-radius: 4px;
}

/* ─── Empty state ─── */
.zynd-chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 8px;
  gap: 12px;
  flex: 1;
  justify-content: center;
}

.zynd-chat-empty-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-brand-1);
}

.zynd-chat-empty-text {
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  max-width: 260px;
  margin: 0;
}

.zynd-chat-suggestions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  margin-top: 4px;
}

.zynd-chat-suggestions button {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, border-color 0.15s;
  width: 100%;
}

.zynd-chat-suggestions button:hover {
  background: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

/* ─── Message bubbles ─── */
.zynd-chat-message {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.zynd-chat-message--user {
  flex-direction: row-reverse;
}

.zynd-chat-msg-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.zynd-chat-msg-body {
  max-width: 88%;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px 12px 12px 4px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-1);
  word-break: break-word;
}

.zynd-chat-message--user .zynd-chat-msg-body {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: transparent;
  border-radius: 12px 12px 4px 12px;
  max-width: 84%;
}

.zynd-chat-msg-body--error {
  background: var(--vp-c-danger-soft) !important;
  border-color: var(--vp-c-danger-1) !important;
  color: var(--vp-c-danger-1) !important;
}

/* ─── Markdown inside chat ─── */
.zynd-chat-msg-content p {
  margin: 0 0 6px 0;
}
.zynd-chat-msg-content p:last-child {
  margin-bottom: 0;
}
.zynd-chat-msg-content pre {
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 8px 10px;
  overflow-x: auto;
  font-size: 11.5px;
  margin: 6px 0;
}
.zynd-chat-message--user .zynd-chat-msg-content pre {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.2);
}
.zynd-chat-msg-content code {
  font-size: 11.5px;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  padding: 1px 4px;
}
.zynd-chat-msg-content pre code {
  background: none;
  border: none;
  padding: 0;
}
.zynd-chat-message--user .zynd-chat-msg-content code {
  background: rgba(255,255,255,0.15);
  border-color: rgba(255,255,255,0.2);
}
.zynd-chat-msg-content ul,
.zynd-chat-msg-content ol {
  padding-left: 18px;
  margin: 4px 0;
}
.zynd-chat-msg-content li {
  margin-bottom: 2px;
}
.zynd-chat-msg-content h1,
.zynd-chat-msg-content h2,
.zynd-chat-msg-content h3 {
  font-size: 13px;
  font-weight: 600;
  margin: 8px 0 4px 0;
  border: none;
  padding: 0;
}
.zynd-chat-msg-content a {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
}
.zynd-chat-message--user .zynd-chat-msg-content a {
  color: #c7d7ff;
}
.zynd-chat-msg-content strong {
  font-weight: 600;
}
.zynd-chat-msg-content blockquote {
  border-left: 3px solid var(--vp-c-brand-1);
  margin: 4px 0;
  padding: 2px 8px;
  color: var(--vp-c-text-2);
}

/* ─── Typing indicator ─── */
.zynd-chat-typing {
  display: flex;
  gap: 4px;
  align-items: center;
  height: 20px;
  padding: 2px 0;
}

.zynd-chat-typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vp-c-text-3, var(--vp-c-text-2));
  animation: zynd-bounce 1.2s ease-in-out infinite;
}

.zynd-chat-typing span:nth-child(2) { animation-delay: 0.15s; }
.zynd-chat-typing span:nth-child(3) { animation-delay: 0.3s; }

@keyframes zynd-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-5px); opacity: 1; }
}

/* ─── Sources ─── */
.zynd-chat-sources {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--vp-c-divider);
}

.zynd-chat-sources-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-2);
  margin-bottom: 5px;
}

.zynd-chat-sources-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.zynd-chat-source-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
  padding: 2px 6px;
  font-size: 11px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
}

.zynd-chat-source-chip--link {
  cursor: pointer;
}

.zynd-chat-source-chip--link:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.zynd-source-badge {
  font-size: 9.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}

.zynd-source-badge--code {
  background: rgba(79, 70, 229, 0.12);
  color: var(--vp-c-brand-1);
}

.zynd-source-badge--doc {
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a;
}

.dark .zynd-source-badge--doc {
  color: #4ade80;
}

.zynd-source-name {
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.zynd-source-score {
  font-size: 10px;
  color: var(--vp-c-text-3, var(--vp-c-text-2));
  flex-shrink: 0;
}

/* ─── Input area ─── */
.zynd-chat-input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  flex-shrink: 0;
}

.zynd-chat-input {
  flex: 1;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-base);
  resize: none;
  outline: none;
  line-height: 1.5;
  max-height: 120px;
  overflow-y: auto;
  transition: border-color 0.15s;
}

.zynd-chat-input::placeholder {
  color: var(--vp-c-text-3, var(--vp-c-text-2));
}

.zynd-chat-input:focus {
  border-color: var(--vp-c-brand-1);
}

.zynd-chat-input:disabled {
  opacity: 0.5;
}

.zynd-chat-send {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--vp-c-brand-1);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, transform 0.1s;
}

.zynd-chat-send:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}

.zynd-chat-send:active:not(:disabled) {
  transform: scale(0.93);
}

.zynd-chat-send:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
