import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'

const routes = [
  {
    path: '/:channel?',
    name: 'Home',
    component: Home,
    props: true,
    meta: {
      title: 'Talking'
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = 'Talking : ' + to.params.channel;
  next();
 })
export default router
