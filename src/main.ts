import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
//@ts-expect-error
import VueHighlightJS from 'vue3-highlightjs'
import 'highlight.js/styles/vs2015.css'
import moment from 'moment'
import { createPinia } from 'pinia'

window.moment = moment
window.document.title = 'Logdy'

createApp(App)
    .use(VueHighlightJS)
    .use(createPinia())
    .mount('#app')
