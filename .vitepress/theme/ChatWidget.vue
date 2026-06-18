<script setup>
import { ref, nextTick, onUnmounted } from 'vue'
import { withBase } from 'vitepress'
import { marked } from 'marked'

marked.use({
  breaks: true,
  gfm: true,
  renderer: {
    code({ text, lang }) {
      const eLang = lang ? lang.replace(/[&<>"']/g, '').trim() : ''
      const safeClass = eLang.replace(/[^a-zA-Z0-9_.\-+]/g, '')
      const eText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `<div class="zynd-code-board">
        <div class="zynd-code-board-header">
          <span class="zynd-code-board-lang">${eLang || 'code'}</span>
          <button class="zynd-code-copy-btn" data-code="${encodeURIComponent(text)}" aria-label="Copy code">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>
        <pre><code${safeClass ? ` class="language-${safeClass}"` : ''}>${eText}</code></pre>
      </div>`
    }
  }
})

function isSourceLine(line) {
  const t = line.trim()
  if (!t) return false
  // bullet or numbered list
  if (/^[-*+]\s/.test(t)) return true
  if (/^\d+[.)]\s/.test(t)) return true
  // markdown link or bare URL
  if (/\[.*?\]\(.*?\)/.test(t)) return true
  if (/^https?:\/\/[^\s)]+$/.test(t)) return true
  // short file/page reference (contains path separator, no long prose)
  if (t.length < 120 && /\//.test(t) && /^[\w.\-\/\\\s~:]+$/.test(t)) return true
  return false
}

function stripTrailingSources(text) {
  if (!text) return text
  const lines = text.split('\n')
  const total = lines.length
  if (total === 0) return text

  const headingRe = /^(?:#{1,3}\s+|\*\*)?(?:Sources?|Citations?|References?)(?:\*\*)?(?:\s*:?\s*)?$/i

  let headingIdx = -1
  for (let i = total - 1; i >= 0; i--) {
    if (headingRe.test(lines[i].trim())) {
      headingIdx = i
      break
    }
  }

  if (headingIdx === -1) return text
  // heading must be in the latter part of the answer
  if (headingIdx < Math.floor(total * 0.6)) return text

  let hasFollowing = false
  for (let i = headingIdx + 1; i < total; i++) {
    const line = lines[i].trim()
    if (!line) continue
    hasFollowing = true
    if (!isSourceLine(line)) return text
  }

  if (!hasFollowing) return text

  return lines.slice(0, headingIdx).join('\n').trimEnd()
}

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
  const cleaned = stripTrailingSources(text)
  const html = marked.parse(cleaned)
  return typeof html === 'string' ? html : text
}

function onMsgContentClick(e) {
  const btn = e.target.closest('.zynd-code-copy-btn')
  if (!btn) return
  const code = decodeURIComponent(btn.getAttribute('data-code') || '')
  if (!code) return

  if (!navigator.clipboard?.writeText) return

  const check = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
  const origInner = btn.innerHTML
  const origLabel = btn.getAttribute('aria-label')

  navigator.clipboard.writeText(code).then(() => {
    btn.setAttribute('aria-label', 'Copied')
    btn.innerHTML = check
    setTimeout(() => {
      btn.innerHTML = origInner
      if (origLabel) btn.setAttribute('aria-label', origLabel)
      else btn.removeAttribute('aria-label')
    }, 2000)
  }).catch(() => {})
}

function shortPath(src) {
  if (!src) return ''
  const parts = src.split('/')
  return parts.slice(-2).join('/')
}

function isExternal(url) {
  return /^https?:\/\//i.test(url)
}

const UNSAFE_SCHEMES = /^(javascript|data|vbscript|file):/i
const DOCS_HOSTS = ['docs.zynd.ai', 'www.zynd.ai', 'zynd.ai']

function safeUrl(url) {
  if (!url || typeof url !== 'string') return false
  if (UNSAFE_SCHEMES.test(url)) return false
  if (/^\s*\/\//.test(url)) return false
  return true
}

function safeGithubUrl(url) {
  if (!url || typeof url !== 'string') return false
  if (!isExternal(url)) return false
  try {
    const u = new URL(url)
    if (u.hostname !== 'github.com' && !u.hostname.endsWith('.github.com')) return false
    return true
  } catch {
    return false
  }
}

function docsHostAllowed(hostname) {
  if (DOCS_HOSTS.includes(hostname)) return true
  try {
    if (typeof window !== 'undefined' && new URL(window.location.origin).hostname === hostname) return true
  } catch {}
  return false
}

function normalizeDocsUrl(raw) {
  if (!safeUrl(raw)) return null
  let url = raw.replace(/\\/g, '/')
  if (isExternal(url)) {
    try {
      const u = new URL(url)
      if (!docsHostAllowed(u.hostname)) return null
      return { href: url, external: true }
    } catch {
      return null
    }
  }
  let fragment = ''
  if (url.includes('#')) {
    const idx = url.indexOf('#')
    fragment = url.slice(idx)
    url = url.slice(0, idx)
  }
  url = url.replace(/^\.\//, '')
  url = url.replace(/^.*\/?(?=v[12]\/)/, '')
  url = url.replace(/^docs\//, '')
  url = url.replace(/^\//, '')
  url = url.replace(/\.(md|html)$/, '')
  if (url.endsWith('/index') || url === 'index') url = url.replace(/\/index$/, '') || '/'
  if (url && !url.startsWith('/')) url = '/' + url
  if (!url) url = '/'
  return { href: withBase(url + fragment), external: false }
}

function sourceAnchor(s) {
  const fields = ['hash', 'slug', 'heading_slug', 'headingAnchor', 'anchor']
  for (const f of fields) {
    const v = s[f]
    if (v != null) {
      let r = String(v)
      if (!r.startsWith('#')) r = '#' + r
      return r
    }
  }
  for (const f of ['chunk_id', 'chunkId', 'chunk']) {
    const v = s[f]
    if (typeof v === 'string' && (v.startsWith('chunk-') || v.startsWith('#chunk-'))) {
      return v.startsWith('#') ? v : '#' + v
    }
  }
  return ''
}

function sourceLabel(s) {
  if (!s) return ''
  if (s.type === 'code') {
    return s.file ? s.file.split('/').slice(-1)[0] + (s.start_line != null ? ':' + s.start_line : '') : 'code'
  }
  const label = s.source || s.url || s.href || s.link
  return label ? shortPath(label) : 'doc'
}

function sourceLink(s) {
  if (!s) return null
  if (s.type === 'code') {
    if (!safeGithubUrl(s.github_url)) return null
    let url = s.github_url
    if (s.start_line != null && !url.includes('#')) {
      url += `#L${s.start_line}`
    }
    return { href: url, external: true }
  }
  if (s.type === 'doc') {
    const raw = s.url || s.href || s.link
    if (raw) return normalizeDocsUrl(raw)
    if (!s.source) return null
    if (!safeUrl(s.source)) return null
    let url = String(s.source).replace(/\\/g, '/')
    if (isExternal(url)) {
      try {
        const u = new URL(url)
        if (!docsHostAllowed(u.hostname)) return null
        return { href: url, external: true }
      } catch {
        return null
      }
    }
    let fragment = ''
    if (url.includes('#')) {
      const idx = url.indexOf('#')
      fragment = url.slice(idx)
      url = url.slice(0, idx)
    }
    url = url.replace(/^\.\//, '')
    url = url.replace(/^.*\/?(?=v[12]\/)/, '')
    url = url.replace(/^docs\//, '')
    url = url.replace(/^\//, '')
    url = url.replace(/\.(md|html)$/, '')
    if (url.endsWith('/index') || url === 'index') url = url.replace(/\/index$/, '') || '/'
    if (!fragment) fragment = sourceAnchor(s)
    if (url && !url.startsWith('/')) url = '/' + url
    if (!url) url = '/'
    return { href: withBase(url + fragment), external: false }
  }
  return null
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
    <button v-if="!open" class="zynd-chat-fab" @click="toggle" aria-label="Ask AI">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
        <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 21v-4.03a48.527 48.527 0 0 1-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979Z" />
        <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 0 0 1.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0 0 15.75 7.5Z" />
      </svg>
    </button>

    <!-- Modal -->
    <Transition name="zynd-chat-slide">
      <div v-if="open" class="zynd-chat-modal" role="dialog" aria-modal="true" aria-label="Ask the Zynd docs AI">
        <!-- Header -->
        <div class="zynd-chat-header">
          <div class="zynd-chat-header-info">
            <div class="zynd-chat-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
              </svg>
            </div>
            <div>
              <div class="zynd-chat-title">
                <span>Ask Zynd Docs</span>
                <span class="zynd-chat-online-dot">
                  <span class="zynd-chat-online-ping"></span>
                  <span class="zynd-chat-online-solid"></span>
                </span>
              </div>
              <div class="zynd-chat-subtitle">AI-powered documentation assistant</div>
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="64" height="64" class="zynd-chat-empty-svg">
                <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
              </svg>
            </div>
            <p class="zynd-chat-empty-text">Ask anything about Zynd agents, SDKs, APIs, or deployment.</p>
            <div class="zynd-chat-suggestions">
              <button class="zynd-suggestion-btn" @click="fillAndSend('How do I register an agent?')">
                <span>How do I register an agent?</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" class="zynd-suggestion-arrow">
                  <path fill-rule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                </svg>
              </button>
              <button class="zynd-suggestion-btn" @click="fillAndSend('How does x402 micropayment work?')">
                <span>How does x402 payment work?</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" class="zynd-suggestion-arrow">
                  <path fill-rule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                </svg>
              </button>
              <button class="zynd-suggestion-btn" @click="fillAndSend('How do I call another agent?')">
                <span>How do I call another agent?</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" class="zynd-suggestion-arrow">
                  <path fill-rule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                </svg>
              </button>
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
              <div v-else-if="msg.content" class="zynd-chat-msg-content" v-html="renderMd(msg.content)" @click="onMsgContentClick"></div>

              <!-- Sources -->
              <div v-if="!msg.loading && msg.sources && msg.sources.length" class="zynd-chat-sources">
                <div class="zynd-chat-sources-label">Sources</div>
                <div class="zynd-chat-sources-list">
                  <template v-for="(s, si) in msg.sources.slice(0, 6)" :key="si">
                    <template v-for="link in [sourceLink(s)]" :key="'l' + si">
                      <a
                        v-if="link"
                        :href="link.href"
                        :target="link.external ? '_blank' : undefined"
                        :rel="link.external ? 'noopener noreferrer' : undefined"
                        class="zynd-chat-source-chip zynd-chat-source-chip--link"
                      >
                        <span class="zynd-source-badge" :class="s.type === 'code' ? 'zynd-source-badge--code' : 'zynd-source-badge--doc'">{{ s.type }}</span>
                        <span class="zynd-source-name">{{ sourceLabel(s) }}</span>
                        <span v-if="s.score != null" class="zynd-source-score">{{ Math.round(s.score * 100) }}%</span>
                      </a>
                      <span v-else class="zynd-chat-source-chip">
                        <span class="zynd-source-badge" :class="s.type === 'code' ? 'zynd-source-badge--code' : 'zynd-source-badge--doc'">{{ s.type }}</span>
                        <span class="zynd-source-name">{{ sourceLabel(s) }}</span>
                        <span v-if="s.score != null" class="zynd-source-score">{{ Math.round(s.score * 100) }}%</span>
                      </span>
                    </template>
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
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #4f46e5;
  color: #fff;
  border: 1px solid rgba(79, 70, 229, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4);
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  flex-shrink: 0;
}

.zynd-chat-fab:hover {
  background: #4338ca;
  transform: scale(1.05);
  box-shadow: 0 12px 28px -5px rgba(79, 70, 229, 0.5);
}

.zynd-chat-fab:active {
  transform: scale(0.95);
}

/* ─── Modal ─── */
.zynd-chat-modal {
  width: 840px;
  max-width: calc(100vw - 48px);
  height: min(760px, calc(100vh - 48px));
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.06);
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
    height: calc(100vh - 88px);
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
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  flex-shrink: 0;
}

.zynd-chat-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.zynd-chat-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #eef2ff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.zynd-chat-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  line-height: 1.2;
}

.zynd-chat-online-dot {
  position: relative;
  display: inline-flex;
  width: 8px;
  height: 8px;
}

.zynd-chat-online-ping {
  position: absolute;
  display: inline-flex;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #22c55e;
  opacity: 0.75;
  animation: zynd-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.zynd-chat-online-solid {
  position: relative;
  display: inline-flex;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
}

@keyframes zynd-ping {
  75%, 100% { transform: scale(2); opacity: 0; }
}

.zynd-chat-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin-top: 1px;
}

.zynd-chat-close {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}

.zynd-chat-close:hover {
  background: #f3f4f6;
  color: #4b5563;
}

/* ─── Messages scroll area ─── */
.zynd-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-behavior: smooth;
  background: #fff;
}

.zynd-chat-messages::-webkit-scrollbar {
  width: 4px;
}
.zynd-chat-messages::-webkit-scrollbar-track {
  background: transparent;
}
.zynd-chat-messages::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

/* ─── Empty state ─── */
.zynd-chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 20px;
  gap: 16px;
  flex: 1;
  justify-content: center;
}

.zynd-chat-empty-icon {
  width: 128px;
  height: 128px;
  border-radius: 50%;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(79, 70, 229, 0.7);
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.04);
}

.zynd-chat-empty-icon::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top right, rgba(79,70,229,0.08), transparent);
  pointer-events: none;
}

.zynd-chat-empty-icon::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
  background-size: 10px 10px;
  opacity: 0.5;
  pointer-events: none;
}

.zynd-chat-empty-svg {
  position: relative;
  z-index: 1;
  opacity: 0.8;
}

.zynd-chat-empty-text {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.5;
  max-width: 280px;
  margin: 0 0 4px 0;
}

.zynd-chat-suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.zynd-suggestion-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  text-align: left;
  padding: 12px 16px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  font-family: inherit;
}

.zynd-suggestion-btn:hover {
  background: #f9fafb;
  border-color: #a5b4fc;
}

.zynd-suggestion-arrow {
  color: #9ca3af;
  flex-shrink: 0;
  transition: color 0.15s;
}

.zynd-suggestion-btn:hover .zynd-suggestion-arrow {
  color: #4f46e5;
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
  border-radius: 8px;
  background: #eef2ff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.zynd-chat-msg-body {
  max-width: 88%;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 12px 12px 12px 4px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #111827;
  word-break: break-word;
}

.zynd-chat-message--user .zynd-chat-msg-body {
  background: #4f46e5;
  color: #fff;
  border-color: transparent;
  border-radius: 12px 12px 4px 12px;
  max-width: 84%;
}

.zynd-chat-msg-body--error {
  background: #fef2f2 !important;
  border-color: #fca5a5 !important;
  color: #dc2626 !important;
}

/* ─── Markdown inside chat ─── */
.zynd-chat-msg-content p {
  margin: 0 0 6px 0;
}
.zynd-chat-msg-content p:last-child {
  margin-bottom: 0;
}
.zynd-chat-msg-content pre {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
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
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
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
.zynd-chat-msg-content ul {
  list-style-type: disc;
  padding-left: 20px;
  margin: 4px 0;
}
.zynd-chat-msg-content ul ul {
  list-style-type: circle;
  padding-left: 22px;
  margin: 2px 0;
}
.zynd-chat-msg-content ul ul ul {
  list-style-type: square;
  padding-left: 22px;
  margin: 2px 0;
}
.zynd-chat-msg-content ol {
  list-style-type: decimal;
  padding-left: 22px;
  margin: 4px 0;
}
.zynd-chat-msg-content ol ol {
  list-style-type: lower-alpha;
  padding-left: 24px;
  margin: 2px 0;
}
.zynd-chat-msg-content ol ol ol {
  list-style-type: lower-roman;
  padding-left: 24px;
  margin: 2px 0;
}
.zynd-chat-msg-content li {
  margin-bottom: 3px;
}
.zynd-chat-msg-content li::marker {
  color: currentColor;
}
.zynd-chat-msg-content li > ul,
.zynd-chat-msg-content li > ol {
  margin-top: 2px;
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
  color: #4f46e5;
  text-decoration: underline;
}
.zynd-chat-message--user .zynd-chat-msg-content a {
  color: #c7d7ff;
}
.zynd-chat-msg-content strong {
  font-weight: 600;
}
.zynd-chat-msg-content blockquote {
  border-left: 3px solid #4f46e5;
  margin: 4px 0;
  padding: 2px 8px;
  color: #6b7280;
}

/* ─── Code board ─── */
.zynd-chat-msg-content .zynd-code-board {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin: 6px 0;
  overflow: hidden;
}
.zynd-chat-msg-content .zynd-code-board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
  font-size: 11px;
  line-height: 1.4;
}
.zynd-chat-msg-content .zynd-code-board-lang {
  color: #6b7280;
  font-weight: 600;
  text-transform: lowercase;
}
.zynd-chat-msg-content .zynd-code-copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 2px 4px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  transition: background 0.15s, color 0.15s;
  font-family: inherit;
  font-size: inherit;
}
.zynd-chat-msg-content .zynd-code-copy-btn:hover {
  background: #e5e7eb;
  color: #4b5563;
}
.zynd-chat-msg-content .zynd-code-board pre {
  margin: 0;
  border: none;
  border-radius: 0;
  background: #fafafa;
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
  border-top: 1px solid #e5e7eb;
}

.zynd-chat-sources-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
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
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  padding: 2px 6px;
  font-size: 11px;
  color: #6b7280;
  text-decoration: none;
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
}

.zynd-chat-source-chip--link {
  cursor: pointer;
}

.zynd-chat-source-chip--link:hover {
  border-color: #6366f1;
  color: #4f46e5;
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
  background: rgba(79, 70, 229, 0.1);
  color: #4f46e5;
}

.zynd-source-badge--doc {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.zynd-source-name {
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.zynd-source-score {
  font-size: 10px;
  color: #9ca3af;
  flex-shrink: 0;
}

/* ─── Input area ─── */
.zynd-chat-input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
  flex-shrink: 0;
}

.zynd-chat-input {
  flex: 1;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #111827;
  font-family: var(--vp-font-family-base);
  resize: none;
  outline: none;
  line-height: 1.5;
  max-height: 120px;
  overflow-y: auto;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

.zynd-chat-input::placeholder {
  color: #9ca3af;
}

.zynd-chat-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 1px #6366f1;
}

.zynd-chat-input:disabled {
  opacity: 0.5;
}

.zynd-chat-send {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #4f46e5;
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
  background: #4338ca;
}

.zynd-chat-send:active:not(:disabled) {
  transform: scale(0.93);
}

.zynd-chat-send:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ─── Dark mode ─── */
html.dark .zynd-chat-modal {
  background: #1f1f28;
  border-color: #35343e;
}

html.dark .zynd-chat-header {
  background: #1f1f28;
  border-color: #35343e;
}

html.dark .zynd-chat-avatar {
  background: rgba(79, 70, 229, 0.15);
  color: #818cf8;
}

html.dark .zynd-chat-title {
  color: #e4e1ee;
}

html.dark .zynd-chat-subtitle {
  color: #9ca3af;
}

html.dark .zynd-chat-close {
  color: #6b7280;
}
html.dark .zynd-chat-close:hover {
  background: #2a2933;
  color: #e4e1ee;
}

html.dark .zynd-chat-messages {
  background: #13121b;
}

html.dark .zynd-chat-messages::-webkit-scrollbar-thumb {
  background: #35343e;
}

html.dark .zynd-chat-empty-icon {
  background: #1f1f28;
  border-color: #35343e;
  color: rgba(129, 140, 248, 0.6);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
}

html.dark .zynd-chat-empty-icon::before {
  background: linear-gradient(to top right, rgba(79,70,229,0.12), transparent);
}

html.dark .zynd-chat-empty-icon::after {
  background-image: radial-gradient(#35343e 1px, transparent 1px);
  opacity: 0.4;
}

html.dark .zynd-chat-empty-svg {
  opacity: 0.7;
}

html.dark .zynd-chat-empty-text {
  color: #e4e1ee;
}

html.dark .zynd-suggestion-btn {
  background: #1f1f28;
  border-color: #35343e;
  color: #e4e1ee;
}

html.dark .zynd-suggestion-btn:hover {
  background: #2a2933;
  border-color: #6366f1;
}

html.dark .zynd-suggestion-arrow {
  color: #6b7280;
}

html.dark .zynd-suggestion-btn:hover .zynd-suggestion-arrow {
  color: #818cf8;
}

html.dark .zynd-chat-msg-body {
  background: #1f1f28;
  border-color: #35343e;
  color: #e4e1ee;
}

html.dark .zynd-chat-msg-body--error {
  background: rgba(220, 38, 38, 0.1) !important;
  border-color: rgba(220, 38, 38, 0.3) !important;
  color: #fca5a5 !important;
}

html.dark .zynd-chat-msg-content pre {
  background: #2a2933;
  border-color: #35343e;
}

html.dark .zynd-chat-msg-content code {
  background: #2a2933;
  border-color: #35343e;
}

html.dark .zynd-chat-msg-content blockquote {
  border-left-color: #6366f1;
  color: #9ca3af;
}

html.dark .zynd-chat-msg-content .zynd-code-board {
  border-color: #35343e;
}
html.dark .zynd-chat-msg-content .zynd-code-board-header {
  background: #2a2933;
  border-color: #35343e;
}
html.dark .zynd-chat-msg-content .zynd-code-board-lang {
  color: #9ca3af;
}
html.dark .zynd-chat-msg-content .zynd-code-copy-btn {
  color: #6b7280;
}
html.dark .zynd-chat-msg-content .zynd-code-copy-btn:hover {
  background: #35343e;
  color: #e4e1ee;
}
html.dark .zynd-chat-msg-content .zynd-code-board pre {
  background: #1a1923;
}

html.dark .zynd-chat-sources {
  border-top-color: #35343e;
}

html.dark .zynd-chat-sources-label {
  color: #9ca3af;
}

html.dark .zynd-chat-source-chip {
  background: #1f1f28;
  border-color: #35343e;
  color: #9ca3af;
}

html.dark .zynd-chat-source-chip--link:hover {
  border-color: #6366f1;
  color: #818cf8;
}

html.dark .zynd-source-badge--code {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

html.dark .zynd-source-badge--doc {
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
}

html.dark .zynd-source-score {
  color: #6b7280;
}

html.dark .zynd-chat-input-area {
  background: #1f1f28;
  border-top-color: #35343e;
}

html.dark .zynd-chat-input {
  background: #2a2933;
  border-color: #35343e;
  color: #e4e1ee;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

html.dark .zynd-chat-input::placeholder {
  color: #6b7280;
}

html.dark .zynd-chat-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 1px #6366f1;
}

html.dark .zynd-chat-send {
  background: #4f46e5;
}
html.dark .zynd-chat-send:hover:not(:disabled) {
  background: #6366f1;
}

html.dark .zynd-chat-msg-avatar {
  background: rgba(79, 70, 229, 0.15);
  color: #818cf8;
}

html.dark .zynd-chat-typing span {
  background: #6b7280;
}

/* ─── Reduced motion ─── */
@media (prefers-reduced-motion: reduce) {
  .zynd-chat-online-ping {
    animation: none;
  }

  .zynd-chat-typing span {
    animation: none;
  }

  .zynd-chat-fab {
    transition: none;
  }

  .zynd-chat-close {
    transition: none;
  }

  .zynd-chat-send {
    transition: none;
  }

  .zynd-chat-slide-enter-active,
  .zynd-chat-slide-leave-active {
    transition: none;
  }

  .zynd-suggestion-btn {
    transition: none;
  }

  .zynd-suggestion-arrow {
    transition: none;
  }

  .zynd-chat-input {
    transition: none;
  }

  .zynd-chat-msg-content .zynd-code-copy-btn {
    transition: none;
  }
}
</style>
