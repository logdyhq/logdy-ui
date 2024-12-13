import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import moment from 'moment'
import { createPinia } from 'pinia'
import "./app.scss"
import 'floating-vue/dist/style.css'
import FloatingVue from 'floating-vue'
import { themeHandler } from './theme'
import { BreserInit } from './breser'

window.moment = moment
window.document.title = 'Logdy'

themeHandler.initTheme();

BreserInit()

createApp(App)
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
