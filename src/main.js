import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import { library } from '@fortawesome/fontawesome-svg-core'
import { faSignInAlt, faPlay, faPlus, faTrashAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faSignInAlt);
library.add(faPlus);
library.add(faPlay);
library.add(faTrashAlt);

createApp(App).use(store).use(router).component('font-awesome-icon', FontAwesomeIcon).mount('#app');

