<template>
  <div class="home">
    <!-- Please go <a href="https://twitchapps.com/tmi/" target="blank">here</a>, generate and copy the token -->
    <div>
      <input type="text" placeholder="channel" id="username" v-model="name"/>
      <button v-on:click="connect">Connect</button>
      <input type="checkbox" v-model="saveToStorage" id="savetostore"/> <label for="savetostore">save voice for users</label>
    </div>
    <hr>
    <div v-for="message in messages" :key=message>
      <span><b>{{ message.name }} :</b> {{ message.text }}</span>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';

export default {
  setup() {
    const name = ref("");
    const store = useStore();
    function connect() {
      console.log(name.value);
      store.dispatch('connect', name.value);
    }
    const settings = {};
    const saveToStorage = ref(false);

    function save(user, voicesettings) {
      if (saveToStorage.value) {
        window.localStorage.setItem(user, JSON.stringify(voicesettings));
      } else {
        settings[user] = voicesettings;
      }
    }

    function load(user) {
      if (saveToStorage.value) {
        const item = window.localStorage.getItem(user);
        if (item) {
          return JSON.parse(item);
        } else {
          return null;
        }
      } else {
        return settings[user];
      }
    }
    
    watch(store.state.messages, (msgs) => {
      const synth = window.speechSynthesis;
      const voices = synth.getVoices();
      if (voices.length == 0) return;
      const lastMessage = msgs[msgs.length - 1];
      const name = lastMessage.name;
      const text = lastMessage.text;
      console.log(name);
      console.log(text);
      if (name !== '###') {
        let voiceSettings = load(name);
        if (!voiceSettings) {
          const i = Math.floor(Math.random() * voices.length);
          const voice = voices[i];
          const pitch = 2 * Math.random();
          const rate = 5 * Math.random();
          voiceSettings = {name: voice.name, pitch: pitch, rate: rate, lang: voice.lang};
          save(name, voiceSettings);
        }
        console.log(JSON.stringify(voiceSettings));
        const voice = voices.find(v => v.name === voiceSettings.name);
        if (voice) {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = voiceSettings.lang;
          u.pitch = voiceSettings.pitch;
          // u.rate = voiceSettings.rate;
          synth.speak(u);
        }
      }
    });
    const messages = computed(() => store.state.messages);

    return {
      name, connect, messages, saveToStorage
    }
  },

  name: 'Home'
}
</script>
