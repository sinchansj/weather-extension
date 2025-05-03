import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import VueGoogleMaps from '@fawmi/vue-google-maps'

const app = createApp(App)

app.use(VueGoogleMaps, {
    load: {
        key: '',
    },
})

app.mount('#app')
