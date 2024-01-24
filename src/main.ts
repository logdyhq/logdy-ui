import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
//@ts-expect-error
import VueHighlightJS from 'vue3-highlightjs'
import 'highlight.js/styles/vs2015.css'
import moment from 'moment'

window.moment = moment
createApp(App).use(VueHighlightJS).mount('#app')
