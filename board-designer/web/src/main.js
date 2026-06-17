import { createApp } from 'vue'
// The REAL design language (tokens, base resets, fonts). Single source of
// truth — imported straight from the SPA so colours/radii/typography stay
// identical to web and never drift.
import '@web/style.css'
import './designer.css'
import Designer from './Designer.vue'

createApp(Designer).mount('#app')
