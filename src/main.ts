import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
//@ts-expect-error
import VueHighlightJS from 'vue3-highlightjs'
import 'highlight.js/styles/vs2015.css'
import moment from 'moment'
import { createPinia } from 'pinia'
import "./app.scss"
import 'floating-vue/dist/style.css'
import FloatingVue from 'floating-vue'

window.moment = moment
window.document.title = 'Logdy'

createApp(App)
    .use(VueHighlightJS)
    .use(createPinia())
    .use(FloatingVue, {
        themes: {
            'tooltip': {
                distance: 4,
                delay: { show: 400, hide: 0 },
            },
        },
    })
    .mount('#app')
