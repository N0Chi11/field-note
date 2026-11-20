<script setup lang="ts">
defineProps<{ opening?: boolean }>()
</script>

<template>
  <svg class="gift-parcel" :class="{ 'gift-parcel--opening': opening }"
    viewBox="0 0 210 166" fill="none" aria-hidden="true" focusable="false">
    <ellipse cx="107" cy="151" rx="83" ry="10" fill="#061e15" opacity=".25" />
    <path d="m38 84 74 21 57-23-70-20-61 22Z" fill="#542031" stroke="#edc997" stroke-width="1.2" />
    <path d="m38 84 74 21v49l-74-21V84Z" fill="#a22540" stroke="#e7bb89" stroke-width="1.4" stroke-linejoin="round" />
    <path d="m112 105 57-23v49l-57 23v-49Z" fill="#791e35" stroke="#e7bb89" stroke-width="1.4" stroke-linejoin="round" />
    <path d="m73 94 13 4v49l-13-4V94Z" fill="#e5b77c" />
    <path d="m148 90 11-4v50l-11 4V90Z" fill="#bd9158" />
    <path d="m50 107 12 3m-6-7v13m38 12 10 3m-5-7v11m22-14 11-4m-5-4v12m-76-1 11 3m-5-7v12" stroke="#e2b286" stroke-width=".9" />
    <g class="gift-parcel__lid">
      <path d="M31 73 100 50l77 20-65 25-81-22Z" fill="#d64958" stroke="#f3c99c" stroke-width="1.5" stroke-linejoin="round" />
      <path d="m31 73 81 22v17L31 90V73Z" fill="#b72c47" stroke="#f3c99c" stroke-width="1.5" stroke-linejoin="round" />
      <path d="m112 95 65-25v17l-65 25V95Z" fill="#94233e" stroke="#f3c99c" stroke-width="1.5" stroke-linejoin="round" />
      <path d="m66 82 70-25 15 5-69 24v17l-16-4V82Z" fill="#edc48b" />
      <path d="m59 64 88 19v17l12-4V78L75 58l-16 6Z" fill="#e3b47b" />
      <path d="M99 65C84 62 60 46 68 31c7-12 28 6 37 27 8-15 35-29 43-17 9 13-22 27-38 25l21 16-12 3-9-6-6-10-17 15-6-10-12 2c9-8 20-11 30-11Z" fill="#ecc18a" stroke="#ffdf9f" stroke-width="1.5" stroke-linejoin="round" />
      <path d="M100 62C83 54 74 45 74 37m34 26c15-4 29-10 36-17" stroke="#b8844d" stroke-width="2.2" stroke-linecap="round" />
      <ellipse cx="105" cy="63" rx="8" ry="6" fill="#f8d59a" stroke="#ab7749" stroke-width="1.1" />
    </g>
    <g class="gift-parcel__sparkles" fill="#f5d09a">
      <path d="M39 40c.8 5.6 3.3 8.2 9 9-5.7.9-8.2 3.4-9 9-.8-5.6-3.3-8.1-9-9 5.7-.8 8.2-3.4 9-9ZM169 33c.8 6.1 3.6 8.8 9.7 9.7-6.1.9-8.9 3.6-9.7 9.7-.9-6.1-3.6-8.8-9.7-9.7 6.1-.9 8.8-3.6 9.7-9.7Z" />
      <circle cx="53" cy="33" r="2.1" />
      <circle cx="186" cy="63" r="2.3" />
    </g>
  </svg>
</template>

<style scoped>
.gift-parcel { display: block; overflow: visible; }
.gift-parcel__lid, .gift-parcel__sparkles { transform-origin: center; transform-box: fill-box; }
.gift-parcel__lid { transition: transform .42s cubic-bezier(.2,.76,.24,1), opacity .42s; }
.gift-parcel__sparkles { transition: transform .42s ease-out; }
.gift-parcel--opening .gift-parcel__lid { transform: translate(3px, -32px) rotate(-12deg); opacity: .28; }
.gift-parcel--opening .gift-parcel__sparkles { transform: translateY(-7px) scale(1.24); }
@media (prefers-reduced-motion: reduce) {
  .gift-parcel__lid, .gift-parcel__sparkles { transition: none; }
}
</style>
